mod common;

use common::{git_available, GitRepoFixture};
use tempfile::TempDir;
use terax_lib::modules::fs::to_canon;
use terax_lib::modules::git::errors::GitError;
use terax_lib::modules::git::operations;
use terax_lib::modules::git::types::DiscardEntry;
use terax_lib::modules::workspace::{WorkspaceEnv, WorkspaceRegistry};

fn skip_if_no_git() -> bool {
    if !git_available() {
        eprintln!("skipping: git not on PATH");
        return true;
    }
    false
}

#[test]
fn resolve_repo_returns_none_outside_repo() {
    if skip_if_no_git() {
        return;
    }
    let tmp = TempDir::new().unwrap();
    let canonical = std::fs::canonicalize(tmp.path()).unwrap();
    let registry = WorkspaceRegistry::default();
    registry.authorize(&canonical).unwrap();

    let info = operations::resolve_repo(&registry, &to_canon(&canonical), &WorkspaceEnv::Local)
        .expect("resolve_repo");
    assert!(info.is_none());
}

#[test]
fn resolve_repo_returns_branch_for_real_repo() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("seed.txt", "seed\n");
    fx.run_git(&["add", "seed.txt"]);
    fx.run_git(&["commit", "-q", "-m", "seed"]);

    let info = operations::resolve_repo(&fx.registry, &fx.repo_str(), &fx.workspace)
        .expect("resolve_repo")
        .expect("repo present");
    assert_eq!(info.branch, "main");
    assert!(info.upstream.is_none());
    assert!(!info.is_detached);
}

#[test]
fn resolve_repo_returns_branch_for_unborn_head() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    let info = operations::resolve_repo(&fx.registry, &fx.repo_str(), &fx.workspace)
        .expect("resolve_repo")
        .expect("repo present even without commits");
    assert_eq!(info.branch, "main");
    assert!(info.upstream.is_none());
    assert!(!info.is_detached);
}

#[test]
fn status_on_empty_repo_has_no_files() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    let snap = operations::status(&fx.registry, &fx.repo_str(), &fx.workspace).expect("status");
    assert_eq!(snap.branch, "main");
    assert!(snap.changed_files.is_empty());
    assert_eq!(snap.ahead, 0);
    assert_eq!(snap.behind, 0);
}

#[test]
fn status_lists_untracked_file() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("hello.txt", "hi\n");
    let snap = operations::status(&fx.registry, &fx.repo_str(), &fx.workspace).expect("status");
    let entry = snap
        .changed_files
        .iter()
        .find(|f| f.path == "hello.txt")
        .expect("hello.txt in changed_files");
    assert!(entry.untracked);
    assert!(!entry.staged);
}

#[test]
fn stage_then_commit_produces_log_entry() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "alpha\n");
    operations::stage(
        &fx.registry,
        &fx.repo_str(),
        &["a.txt".into()],
        &fx.workspace,
    )
    .expect("stage");

    let snap = operations::status(&fx.registry, &fx.repo_str(), &fx.workspace).unwrap();
    let entry = snap
        .changed_files
        .iter()
        .find(|f| f.path == "a.txt")
        .expect("a.txt staged");
    assert!(entry.staged);
    assert!(!entry.untracked);

    let commit = operations::commit(&fx.registry, &fx.repo_str(), "add a", &fx.workspace)
        .expect("commit");
    assert_eq!(commit.summary, "add a");
    assert_eq!(commit.commit_sha.len(), 40);

    let entries = operations::log(&fx.registry, &fx.repo_str(), 10, None, &fx.workspace)
        .expect("log");
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].sha, commit.commit_sha);
    assert_eq!(entries[0].subject, "add a");
}

#[test]
fn stage_skips_vanished_untracked_but_still_stages_deleted_tracked() {
    if skip_if_no_git() {
        return;
    }
    // Upstream #814: the Source Control list is a snapshot; a file deleted
    // after the last refresh stays in it, and `git add -- <it>` is a fatal
    // pathspec error that used to fail the whole batch. A deleted-but-tracked
    // path must keep staging its deletion.
    let fx = GitRepoFixture::new();
    fx.write_file("tracked.txt", "seed\n");
    fx.write_file("doomed.txt", "bye\n");
    fx.run_git(&["add", "tracked.txt", "doomed.txt"]);
    fx.run_git(&["commit", "-q", "-m", "seed"]);

    fx.write_file("ghost.txt", "never staged\n");
    std::fs::remove_file(fx.repo_path.join("ghost.txt")).unwrap();
    std::fs::remove_file(fx.repo_path.join("doomed.txt")).unwrap();
    fx.write_file("tracked.txt", "seed\nmore\n");

    operations::stage(
        &fx.registry,
        &fx.repo_str(),
        &["ghost.txt".into(), "doomed.txt".into(), "tracked.txt".into()],
        &fx.workspace,
    )
    .expect("vanished untracked must not fail the batch");

    let snap = operations::status(&fx.registry, &fx.repo_str(), &fx.workspace).unwrap();
    let tracked = snap
        .changed_files
        .iter()
        .find(|f| f.path == "tracked.txt")
        .expect("tracked.txt in status");
    assert!(tracked.staged);
    let doomed = snap
        .changed_files
        .iter()
        .find(|f| f.path == "doomed.txt")
        .expect("deleted tracked still listed");
    assert!(doomed.staged);
    assert!(!snap.changed_files.iter().any(|f| f.path == "ghost.txt"));
}

#[test]
fn stage_batch_of_only_vanished_untracked_is_ok_noop() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("seed.txt", "seed\n");
    fx.run_git(&["add", "seed.txt"]);
    fx.run_git(&["commit", "-q", "-m", "seed"]);

    fx.write_file("ghost.txt", "gone\n");
    std::fs::remove_file(fx.repo_path.join("ghost.txt")).unwrap();

    operations::stage(
        &fx.registry,
        &fx.repo_str(),
        &["ghost.txt".into()],
        &fx.workspace,
    )
    .expect("all-vanished batch is a no-op success");

    let snap = operations::status(&fx.registry, &fx.repo_str(), &fx.workspace).unwrap();
    assert!(snap.changed_files.is_empty());
}

#[test]
fn unstage_clears_index_entry() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "alpha\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "init"]);
    fx.write_file("a.txt", "beta\n");
    operations::stage(
        &fx.registry,
        &fx.repo_str(),
        &["a.txt".into()],
        &fx.workspace,
    )
    .unwrap();

    operations::unstage(
        &fx.registry,
        &fx.repo_str(),
        &["a.txt".into()],
        &fx.workspace,
    )
    .expect("unstage");

    let snap = operations::status(&fx.registry, &fx.repo_str(), &fx.workspace).unwrap();
    let entry = snap
        .changed_files
        .iter()
        .find(|f| f.path == "a.txt")
        .expect("a.txt present");
    assert!(!entry.staged);
    assert!(entry.unstaged);
}

#[test]
fn commit_with_empty_message_is_rejected() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "alpha\n");
    fx.run_git(&["add", "a.txt"]);

    match operations::commit(&fx.registry, &fx.repo_str(), "   ", &fx.workspace) {
        Err(GitError::EmptyCommitMessage) => {}
        Err(other) => panic!("expected EmptyCommitMessage, got {other}"),
        Ok(_) => panic!("expected error for empty message"),
    }
}

#[test]
fn log_on_empty_repo_returns_empty_list() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    let entries =
        operations::log(&fx.registry, &fx.repo_str(), 10, None, &fx.workspace).expect("log");
    assert!(entries.is_empty());
}

#[test]
fn diff_shows_worktree_change() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "alpha\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "init"]);
    fx.write_file("a.txt", "alpha\nbeta\n");

    let diff = operations::diff(&fx.registry, &fx.repo_str(), None, false, &fx.workspace)
        .expect("diff");
    assert!(diff.diff_text.contains("+beta"));
}

#[test]
fn diff_staged_only_shows_index_change() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "alpha\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "init"]);
    fx.write_file("a.txt", "alpha\nbeta\n");
    fx.run_git(&["add", "a.txt"]);
    fx.write_file("a.txt", "alpha\nbeta\ngamma\n");

    let staged = operations::diff(&fx.registry, &fx.repo_str(), None, true, &fx.workspace)
        .expect("staged diff");
    assert!(staged.diff_text.contains("+beta"));
    assert!(!staged.diff_text.contains("+gamma"));
}

#[test]
fn discard_tracked_restores_worktree() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "alpha\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "init"]);
    fx.write_file("a.txt", "tampered\n");

    operations::discard(
        &fx.registry,
        &fx.repo_str(),
        &[DiscardEntry {
            path: "a.txt".into(),
            untracked: false,
        }],
        &fx.workspace,
    )
    .expect("discard");

    let content = std::fs::read_to_string(fx.repo_path.join("a.txt")).unwrap();
    assert_eq!(content, "alpha\n");
}

#[test]
fn discard_untracked_removes_file() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("garbage.txt", "junk\n");

    operations::discard(
        &fx.registry,
        &fx.repo_str(),
        &[DiscardEntry {
            path: "garbage.txt".into(),
            untracked: true,
        }],
        &fx.workspace,
    )
    .expect("discard");

    assert!(!fx.repo_path.join("garbage.txt").exists());
}

#[test]
fn panel_snapshot_returns_repo_and_status_after_commit() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "alpha\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "seed"]);
    fx.write_file("b.txt", "beta\n");

    let snap = operations::panel_snapshot(&fx.registry, &fx.repo_str(), &fx.workspace)
        .expect("panel_snapshot");
    let repo = snap.repo.expect("repo present");
    assert_eq!(repo.branch, "main");
    let status = snap.status.expect("status present");
    assert!(status.changed_files.iter().any(|f| f.path == "b.txt"));
}

#[test]
fn panel_snapshot_outside_repo_is_empty() {
    if skip_if_no_git() {
        return;
    }
    let tmp = TempDir::new().unwrap();
    let canonical = std::fs::canonicalize(tmp.path()).unwrap();
    let registry = WorkspaceRegistry::default();
    registry.authorize(&canonical).unwrap();

    let snap =
        operations::panel_snapshot(&registry, &to_canon(&canonical), &WorkspaceEnv::Local)
            .expect("panel_snapshot");
    assert!(snap.repo.is_none());
    assert!(snap.status.is_none());
}

#[test]
fn show_commit_diff_returns_patch_for_known_sha() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "alpha\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "seed"]);

    let entries =
        operations::log(&fx.registry, &fx.repo_str(), 10, None, &fx.workspace).unwrap();
    let sha = &entries[0].sha;

    let diff = operations::show_commit_diff(&fx.registry, &fx.repo_str(), sha, &fx.workspace)
        .expect("show_commit_diff");
    assert!(diff.diff_text.contains("a.txt"));
    assert!(diff.diff_text.contains("+alpha"));
}

#[test]
fn show_commit_diff_rejects_invalid_sha() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    match operations::show_commit_diff(
        &fx.registry,
        &fx.repo_str(),
        "not-a-sha",
        &fx.workspace,
    ) {
        Err(GitError::CommandFailed { .. }) => {}
        Err(other) => panic!("expected CommandFailed, got {other}"),
        Ok(_) => panic!("expected error for invalid sha"),
    }
}

#[test]
fn log_paginates_with_before_sha_cursor() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    for i in 0..3 {
        fx.write_file(&format!("f{i}.txt"), &format!("v{i}\n"));
        fx.run_git(&["add", &format!("f{i}.txt")]);
        fx.run_git(&["commit", "-q", "-m", &format!("c{i}")]);
    }

    let first_page =
        operations::log(&fx.registry, &fx.repo_str(), 1, None, &fx.workspace).unwrap();
    assert_eq!(first_page.len(), 1);
    let cursor = first_page[0].sha.clone();

    let second_page = operations::log(
        &fx.registry,
        &fx.repo_str(),
        10,
        Some(&cursor),
        &fx.workspace,
    )
    .unwrap();
    assert!(second_page.iter().all(|e| e.sha != cursor));
    assert_eq!(second_page.len(), 2);
}

#[test]
fn log_with_invalid_cursor_sha_errors() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "x\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "seed"]);

    match operations::log(
        &fx.registry,
        &fx.repo_str(),
        10,
        Some("not-hex"),
        &fx.workspace,
    ) {
        Err(GitError::CommandFailed { .. }) => {}
        Err(other) => panic!("expected CommandFailed, got {other}"),
        Ok(_) => panic!("expected error for bad cursor"),
    }
}

#[test]
fn commit_files_reports_added_and_modified() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "alpha\n");
    fx.write_file("b.txt", "beta\n");
    fx.run_git(&["add", "a.txt", "b.txt"]);
    fx.run_git(&["commit", "-q", "-m", "seed"]);
    fx.write_file("a.txt", "alpha2\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "modify"]);

    let entries =
        operations::log(&fx.registry, &fx.repo_str(), 10, None, &fx.workspace).unwrap();
    let head = &entries[0].sha;

    let files =
        operations::commit_files(&fx.registry, &fx.repo_str(), head, &fx.workspace).unwrap();
    assert_eq!(files.len(), 1);
    assert_eq!(files[0].path, "a.txt");
    assert_eq!(files[0].status, "M");
    assert_eq!(files[0].status_label, "Modified");
}

#[test]
fn commit_file_diff_returns_original_and_modified_text() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "v1\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "v1"]);
    fx.write_file("a.txt", "v2\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "v2"]);

    let entries =
        operations::log(&fx.registry, &fx.repo_str(), 10, None, &fx.workspace).unwrap();
    let head = &entries[0].sha;

    let diff =
        operations::commit_file_diff(&fx.registry, &fx.repo_str(), head, "a.txt", None, &fx.workspace)
            .unwrap();
    assert_eq!(diff.original_content, "v1\n");
    assert_eq!(diff.modified_content, "v2\n");
    assert!(!diff.is_binary);
}

#[test]
fn commit_file_diff_against_working_compares_commit_to_current_disk_content() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "v1\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "v1"]);
    fx.write_file("a.txt", "v2\n");
    fx.run_git(&["add", "a.txt"]);
    fx.run_git(&["commit", "-q", "-m", "v2"]);

    let entries =
        operations::log(&fx.registry, &fx.repo_str(), 10, None, &fx.workspace).unwrap();
    let first_sha = &entries[1].sha;

    // Uncommitted edit on top of v2 - the working comparison must see this,
    // unlike commit_file_diff which only ever compares committed blobs.
    fx.write_file("a.txt", "v3-dirty\n");

    let diff = operations::commit_file_diff_against_working(
        &fx.registry,
        &fx.repo_str(),
        first_sha,
        "a.txt",
        None,
        &fx.workspace,
    )
    .unwrap();
    assert_eq!(diff.original_content, "v1\n");
    assert_eq!(diff.modified_content, "v3-dirty\n");
    assert!(!diff.is_binary);
}

#[test]
fn remote_url_returns_none_for_missing_remote() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    let url = operations::remote_url(&fx.registry, &fx.repo_str(), "origin", &fx.workspace)
        .unwrap();
    assert!(url.is_none());
}

#[test]
fn remote_url_returns_configured_url() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.run_git(&[
        "remote",
        "add",
        "origin",
        "https://example.com/x.git",
    ]);

    let url = operations::remote_url(&fx.registry, &fx.repo_str(), "origin", &fx.workspace)
        .unwrap();
    assert_eq!(url.as_deref(), Some("https://example.com/x.git"));
}

#[test]
fn remote_url_rejects_unsafe_remote_name() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    let url = operations::remote_url(
        &fx.registry,
        &fx.repo_str(),
        "name with space",
        &fx.workspace,
    )
    .unwrap();
    assert!(url.is_none());
}

#[test]
fn unauthorized_path_is_rejected() {
    if skip_if_no_git() {
        return;
    }
    let tmp = TempDir::new().unwrap();
    let canonical = std::fs::canonicalize(tmp.path()).unwrap();
    let registry = WorkspaceRegistry::default();

    match operations::status(&registry, &to_canon(&canonical), &WorkspaceEnv::Local) {
        Err(GitError::PathOutsideWorkspace(_)) => {}
        Err(other) => panic!("expected PathOutsideWorkspace, got {other}"),
        Ok(_) => panic!("expected error for unauthorized dir"),
    }
}

#[test]
fn checkout_branch_rejects_unsafe_names() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    
    let err_empty = operations::checkout_branch(&fx.registry, &fx.repo_str(), "", &fx.workspace).unwrap_err();
    assert!(matches!(err_empty, GitError::InvalidPath(p) if p.is_empty()));

    let err_dash = operations::checkout_branch(&fx.registry, &fx.repo_str(), "-f", &fx.workspace).unwrap_err();
    assert!(matches!(err_dash, GitError::InvalidPath(p) if p == "-f"));

    let err_dash_long = operations::checkout_branch(&fx.registry, &fx.repo_str(), "--detach", &fx.workspace).unwrap_err();
    assert!(matches!(err_dash_long, GitError::InvalidPath(p) if p == "--detach"));
}

#[test]
fn log_file_follows_renames_and_populates_old_path() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("alpha.txt", "a\n");
    fx.run_git(&["add", "alpha.txt"]);
    fx.run_git(&["commit", "-q", "-m", "create alpha"]);
    fx.run_git(&["mv", "alpha.txt", "beta.txt"]);
    fx.run_git(&["commit", "-q", "-m", "rename to beta"]);
    fx.write_file("beta.txt", "b\n");
    fx.run_git(&["commit", "-aq", "-m", "update beta"]);

    let entries = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "beta.txt",
        30,
        None,
        &fx.workspace,
    )
    .expect("log_file");
    assert!(entries.len() >= 3, "应至少 3 条记录");

    assert!(entries[0].old_path.is_none());

    let rename_entry = entries
        .iter()
        .find(|e| e.subject == "rename to beta")
        .expect("应能找到 rename 记录");
    assert_eq!(rename_entry.old_path.as_deref(), Some("alpha.txt"));
}

#[test]
fn log_file_paginates_with_before_sha() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("seed.txt", "v0\n");
    fx.run_git(&["add", "seed.txt"]);
    fx.run_git(&["commit", "-q", "-m", "v0"]);
    for i in 1..=5 {
        fx.write_file("seed.txt", &format!("v{i}\n"));
        fx.run_git(&["commit", "-aq", "-m", &format!("v{i}")]);
    }

    let first_page = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "seed.txt",
        3,
        None,
        &fx.workspace,
    )
    .expect("first page");
    assert_eq!(first_page.len(), 3);
    let cursor = first_page.last().unwrap().sha.clone();

    let second_page = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "seed.txt",
        3,
        Some(&cursor),
        &fx.workspace,
    )
    .expect("second page");
    assert_eq!(second_page.len(), 3);
    assert_ne!(second_page[0].sha, first_page[0].sha);
    assert!(!first_page.iter().any(|e| second_page.iter().any(|n| n.sha == e.sha)));
}

#[test]
fn log_file_rejects_path_traversal() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("seed.txt", "x\n");
    fx.run_git(&["add", "seed.txt"]);
    fx.run_git(&["commit", "-q", "-m", "x"]);

    let result = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "../../etc/passwd",
        30,
        None,
        &fx.workspace,
    );
    assert!(matches!(
        result,
        Err(GitError::InvalidPath(_)) | Err(GitError::PathOutsideWorkspace(_))
    ));
}

#[test]
fn log_file_returns_empty_for_untracked_file() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("untracked.txt", "x\n");
    let entries = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "untracked.txt",
        30,
        None,
        &fx.workspace,
    )
    .expect("log_file");
    assert!(entries.is_empty());
}

#[test]
fn log_file_returns_commits_for_tracked_file() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("seed.txt", "seed\n");
    fx.run_git(&["add", "seed.txt"]);
    fx.run_git(&["commit", "-q", "-m", "seed"]);

    let entries = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "seed.txt",
        30,
        None,
        &fx.workspace,
    )
    .expect("log_file");
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].subject, "seed");
    assert_eq!(entries[0].old_path, None);
}
#[test]
fn list_branches_keeps_current_branch_local_and_surfaces_worktrees() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("a.txt", "a\n");
    fx.run_git(&["add", "."]);
    fx.run_git(&["commit", "-q", "-m", "init"]);
    fx.run_git(&["branch", "feature"]);

    let wt = TempDir::new().unwrap();
    let wt_path = wt.path().join("linked");
    fx.run_git(&["worktree", "add", "-q", wt_path.to_str().unwrap(), "feature"]);

    let result = operations::list_branches(&fx.registry, &fx.repo_str(), &fx.workspace)
        .expect("list_branches");

    // current branch stays local+head despite the main worktree being listed
    let main = result
        .branches
        .iter()
        .find(|b| b.name == "main")
        .expect("main branch present");
    assert_eq!(main.kind, "local");
    assert!(main.is_head);
    assert!(main.worktree_path.is_none());

    let feature: Vec<_> = result.branches.iter().filter(|b| b.name == "feature").collect();
    assert_eq!(feature.len(), 1);
    assert_eq!(feature[0].kind, "worktree");
    assert!(!feature[0].is_head);
    assert!(feature[0].worktree_path.is_some());
}
