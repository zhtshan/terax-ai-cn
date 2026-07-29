use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use globset::{Glob, GlobSet, GlobSetBuilder};
use grep_regex::{RegexMatcher, RegexMatcherBuilder};
use grep_searcher::sinks::UTF8;
use grep_searcher::{BinaryDetection, SearcherBuilder};
use ignore::{WalkBuilder, WalkState};
use serde::Serialize;

use super::file::write_atomic;
use super::to_canon;
use crate::modules::workspace::{resolve_path, WorkspaceEnv};

const FILE_SIZE_CAP: u64 = 5 * 1024 * 1024;
const DEFAULT_MAX_RESULTS: usize = 200;
const HARD_MAX_RESULTS: usize = 20000;

/// Supersession counter for interactive content search. Each new interactive
/// query bumps the generation; in-flight walks observe the change and quit,
/// so fast typing stops superseded searches server-side instead of letting
/// them run to completion.
#[derive(Default)]
pub struct ContentSearchState {
    generation: AtomicU64,
}

#[derive(Serialize)]
pub struct GrepHit {
    pub path: String,
    pub rel: String,
    pub line: u64,
    pub text: String,
}

#[derive(Serialize)]
pub struct GrepResponse {
    pub hits: Vec<GrepHit>,
    pub truncated: bool,
    pub files_scanned: usize,
}

fn build_globset(patterns: &[String]) -> Result<Option<GlobSet>, String> {
    if patterns.is_empty() {
        return Ok(None);
    }
    let mut b = GlobSetBuilder::new();
    for p in patterns {
        let g = Glob::new(p).map_err(|e| format!("bad glob {p:?}: {e}"))?;
        b.add(g);
    }
    let set = b.build().map_err(|e| format!("globset build: {e}"))?;
    Ok(Some(set))
}

fn escape_literal(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for c in s.chars() {
        if "\\.+*?()|[]{}^$".contains(c) {
            out.push('\\');
        }
        out.push(c);
    }
    out
}

/// Build a [`RegexMatcher`] from a user-facing pattern.
///
/// Parameters:
/// - `pattern`: the raw user input.
/// - `regex`: when true, treat `pattern` as a user-authored regex (no escaping).
/// - `case_sensitive`: explicit case-sensitivity toggle. When `false`, smart-case
///   is enabled for literal patterns and plain case-insensitivity for regex.
/// - `whole_word`: when true (literal mode only), wrap the pattern in `\b…\b`.
///   In regex mode, the user is expected to add their own word boundaries.
fn build_matcher(
    pattern: &str,
    regex: bool,
    case_sensitive: bool,
    whole_word: bool,
) -> Result<RegexMatcher, String> {
    let mut builder = RegexMatcherBuilder::new();
    builder.line_terminator(Some(b'\n'));

    if regex {
        // User owns the pattern verbatim; smart-case off, case_sensitive explicit.
        builder.case_smart(false).case_insensitive(!case_sensitive);
    } else {
        builder.case_smart(!case_sensitive);
    }

    let body = if regex {
        pattern.to_string()
    } else if whole_word {
        format!("\\b{}\\b", escape_literal(pattern))
    } else {
        escape_literal(pattern)
    };

    builder.build(&body).map_err(|e| format!("bad pattern: {e}"))
}

#[allow(clippy::too_many_arguments)]
fn search_tree(
    root_path: &Path,
    root_display: &str,
    workspace: &WorkspaceEnv,
    matcher: &RegexMatcher,
    globs: &Option<GlobSet>,
    exclude: &Option<GlobSet>,
    cap: usize,
    cancel: &(dyn Fn() -> bool + Sync),
) -> GrepResponse {
    let walker = WalkBuilder::new(root_path)
        .hidden(true)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .ignore(true)
        .parents(true)
        .follow_links(false)
        .build_parallel();

    let hits: Arc<Mutex<Vec<GrepHit>>> = Arc::new(Mutex::new(Vec::new()));
    let scanned = Arc::new(AtomicUsize::new(0));
    let truncated = Arc::new(AtomicBool::new(false));

    walker.run(|| {
        let matcher = matcher.clone();
        let globs = globs.clone();
        let exclude = exclude.clone();
        let hits = hits.clone();
        let scanned = scanned.clone();
        let truncated = truncated.clone();
        let root_path = root_path.to_path_buf();
        let root_display = root_display.to_string();
        let workspace = workspace.clone();

        Box::new(move |dent_res| {
            if truncated.load(Ordering::Relaxed) || cancel() {
                return WalkState::Quit;
            }
            let dent = match dent_res {
                Ok(d) => d,
                Err(_) => return WalkState::Continue,
            };
            if !dent.file_type().map(|t| t.is_file()).unwrap_or(false) {
                return WalkState::Continue;
            }
            let path = dent.path();
            let rel = match path.strip_prefix(&root_path) {
                Ok(r) => to_canon(r),
                Err(_) => return WalkState::Continue,
            };
            if let Some(set) = globs.as_ref() {
                if !set.is_match(&rel) {
                    return WalkState::Continue;
                }
            }
            if let Some(set) = exclude.as_ref() {
                if set.is_match(&rel) {
                    return WalkState::Continue;
                }
            }
            if let Ok(meta) = std::fs::metadata(path) {
                if meta.len() > FILE_SIZE_CAP {
                    return WalkState::Continue;
                }
            }

            scanned.fetch_add(1, Ordering::Relaxed);

            let abs = display_path(path, &root_path, &root_display, &workspace);
            let rel_clone = rel.clone();
            let mut searcher = SearcherBuilder::new()
                .binary_detection(BinaryDetection::quit(b'\x00'))
                .line_number(true)
                .build();

            let _ = searcher.search_path(
                &matcher,
                path,
                UTF8(|line_num, text| {
                    let line_text = text.trim_end_matches('\n').to_string();
                    let mut guard = hits.lock().unwrap();
                    if guard.len() >= cap {
                        truncated.store(true, Ordering::Relaxed);
                        return Ok(false);
                    }
                    guard.push(GrepHit {
                        path: abs.clone(),
                        rel: rel_clone.clone(),
                        line: line_num,
                        text: line_text,
                    });
                    Ok(true)
                }),
            );

            WalkState::Continue
        })
    });

    let final_hits = Arc::try_unwrap(hits)
        .map(|m| m.into_inner().unwrap())
        .unwrap_or_default();

    GrepResponse {
        hits: final_hits,
        truncated: truncated.load(Ordering::Relaxed),
        files_scanned: scanned.load(Ordering::Relaxed),
    }
}

#[tauri::command]
pub fn fs_grep(
    pattern: String,
    root: String,
    glob: Option<Vec<String>>,
    case_insensitive: Option<bool>,
    max_results: Option<usize>,
    workspace: Option<WorkspaceEnv>,
) -> Result<GrepResponse, String> {
    if pattern.is_empty() {
        return Err("empty pattern".into());
    }
    let workspace = WorkspaceEnv::from_option(workspace);
    let root_path = resolve_path(&root, &workspace);
    if !root_path.is_dir() {
        return Err(format!("not a directory: {root}"));
    }
    let cap = max_results
        .unwrap_or(DEFAULT_MAX_RESULTS)
        .clamp(1, HARD_MAX_RESULTS);

    let matcher = build_matcher(&pattern, true, !case_insensitive.unwrap_or(false), false)?;

    let globs = build_globset(glob.as_deref().unwrap_or(&[]))?;

    Ok(search_tree(
        &root_path,
        &root,
        &workspace,
        &matcher,
        &globs,
        &None,
        cap,
        &|| false,
    ))
}

/// Interactive content search for the command palette. Treats the query as a
/// literal (smart-case), and self-cancels when a newer query arrives.
#[tauri::command]
pub fn fs_grep_interactive(
    state: tauri::State<'_, ContentSearchState>,
    pattern: String,
    root: String,
    max_results: Option<usize>,
    workspace: Option<WorkspaceEnv>,
) -> Result<GrepResponse, String> {
    if pattern.trim().is_empty() {
        return Err("empty pattern".into());
    }
    let my_gen = state.generation.fetch_add(1, Ordering::SeqCst) + 1;

    let workspace = WorkspaceEnv::from_option(workspace);
    let root_path = resolve_path(&root, &workspace);
    if !root_path.is_dir() {
        return Err(format!("not a directory: {root}"));
    }
    let cap = max_results
        .unwrap_or(DEFAULT_MAX_RESULTS)
        .clamp(1, HARD_MAX_RESULTS);

    let matcher = build_matcher(&pattern, false, false, false)?;

    let cancel = || state.generation.load(Ordering::SeqCst) != my_gen;
    Ok(search_tree(
        &root_path,
        &root,
        &workspace,
        &matcher,
        &None,
        &None,
        cap,
        &cancel,
    ))
}

/// VS Code-style content search. Wraps `search_tree` with `build_matcher` and
/// an include/exclude glob filter, and reuses `ContentSearchState`'s
/// generation-based cancellation so a newer query bumps the generation and
/// in-flight walks quit.
#[allow(clippy::too_many_arguments)]
fn fs_search_content_inner(
    state: &ContentSearchState,
    pattern: String,
    root: String,
    regex: bool,
    case_sensitive: bool,
    whole_word: bool,
    include: Option<String>,
    exclude: Option<String>,
    max_results: Option<usize>,
    workspace: Option<WorkspaceEnv>,
) -> Result<GrepResponse, String> {
    if pattern.is_empty() {
        return Err("empty pattern".into());
    }
    let workspace = WorkspaceEnv::from_option(workspace);
    let root_path = resolve_path(&root, &workspace);
    if !root_path.is_dir() {
        return Err(format!("not a directory: {root}"));
    }
    let cap = max_results
        .unwrap_or(DEFAULT_MAX_RESULTS)
        .clamp(1, HARD_MAX_RESULTS);

    let matcher = build_matcher(&pattern, regex, case_sensitive, whole_word)?;

    let include_slice: &[String] = match include.as_ref() {
        Some(s) => std::slice::from_ref(s),
        None => &[],
    };
    let exclude_slice: &[String] = match exclude.as_ref() {
        Some(s) => std::slice::from_ref(s),
        None => &[],
    };
    let include_globs = build_globset(include_slice)?;
    let exclude_globs = build_globset(exclude_slice)?;

    let my_gen = state.generation.fetch_add(1, Ordering::SeqCst) + 1;
    let cancel = || state.generation.load(Ordering::SeqCst) != my_gen;

    Ok(search_tree(
        &root_path,
        &root,
        &workspace,
        &matcher,
        &include_globs,
        &exclude_globs,
        cap,
        &cancel,
    ))
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn fs_search_content(
    state: tauri::State<'_, ContentSearchState>,
    pattern: String,
    root: String,
    regex: bool,
    case_sensitive: bool,
    whole_word: bool,
    include: Option<String>,
    exclude: Option<String>,
    max_results: Option<usize>,
    workspace: Option<WorkspaceEnv>,
) -> Result<GrepResponse, String> {
    fs_search_content_inner(
        state.inner(),
        pattern,
        root,
        regex,
        case_sensitive,
        whole_word,
        include,
        exclude,
        max_results,
        workspace,
    )
}

#[derive(Serialize)]
pub struct GlobHit {
    pub path: String,
    pub rel: String,
}

#[derive(Serialize)]
pub struct GlobResponse {
    pub hits: Vec<GlobHit>,
    pub truncated: bool,
}

#[tauri::command]
pub fn fs_glob(
    pattern: String,
    root: String,
    max_results: Option<usize>,
    workspace: Option<WorkspaceEnv>,
) -> Result<GlobResponse, String> {
    if pattern.is_empty() {
        return Err("empty pattern".into());
    }
    let workspace = WorkspaceEnv::from_option(workspace);
    let root_path = resolve_path(&root, &workspace);
    if !root_path.is_dir() {
        return Err(format!("not a directory: {root}"));
    }
    let cap = max_results.unwrap_or(500).clamp(1, HARD_MAX_RESULTS);

    let glob = Glob::new(&pattern).map_err(|e| format!("bad glob: {e}"))?;
    let mut gb = GlobSetBuilder::new();
    gb.add(glob);
    let set = gb.build().map_err(|e| format!("globset build: {e}"))?;

    let walker = WalkBuilder::new(&root_path)
        .hidden(true)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .ignore(true)
        .parents(true)
        .follow_links(false)
        .build();

    let mut hits: Vec<GlobHit> = Vec::new();
    let mut truncated = false;
    for dent in walker.flatten() {
        if hits.len() >= cap {
            truncated = true;
            break;
        }
        if !dent.file_type().map(|t| t.is_file()).unwrap_or(false) {
            continue;
        }
        let path = dent.path();
        let rel = match path.strip_prefix(&root_path) {
            Ok(r) => to_canon(r),
            Err(_) => continue,
        };
        if !set.is_match(&rel) {
            continue;
        }
        hits.push(GlobHit {
            path: display_path(path, &root_path, &root, &workspace),
            rel,
        });
    }

    Ok(GlobResponse { hits, truncated })
}

fn display_path(
    path: &std::path::Path,
    root_path: &std::path::Path,
    root_display: &str,
    workspace: &WorkspaceEnv,
) -> String {
    if workspace.is_wsl() {
        if let Ok(rel) = path.strip_prefix(root_path) {
            let rel = to_canon(rel);
            return if rel.is_empty() {
                root_display.to_string()
            } else if root_display.ends_with('/') {
                format!("{root_display}{rel}")
            } else {
                format!("{root_display}/{rel}")
            };
        }
    }
    to_canon(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use grep_matcher::Matcher;

    #[test]
    fn escape_literal_escapes_regex_meta() {
        assert_eq!(escape_literal("a.b(c)"), "a\\.b\\(c\\)");
        assert_eq!(escape_literal("plain text"), "plain text");
    }

    #[test]
    fn hard_max_results_constant_is_20000() {
        assert_eq!(HARD_MAX_RESULTS, 20000);
    }

    #[test]
    fn search_tree_respects_cancellation() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.txt"), "hello\nfind me here\n").unwrap();
        let matcher = RegexMatcherBuilder::new().build("find").unwrap();
        let ws = WorkspaceEnv::from_option(None);
        let root_display = dir.path().to_string_lossy().to_string();

        let live = search_tree(dir.path(), &root_display, &ws, &matcher, &None, &None, 100, &|| false);
        assert_eq!(live.hits.len(), 1, "uncancelled search finds the match");

        let stopped =
            search_tree(dir.path(), &root_display, &ws, &matcher, &None, &None, 100, &|| true);
        assert!(stopped.hits.is_empty(), "cancelled search yields nothing");
    }

    // -- build_matcher helper tests ------------------------------------------

    #[test]
    fn build_matcher_escapes_literal_whole_word_off() {
        // literal + ww=false + plain pattern "plain" → case_smart(true) means:
        // no uppercase letters → case-insensitive
        let m = build_matcher("plain", false, false, false).expect("literal matcher ok");
        // matches exact case
        let hit = m.is_match(b"plain").unwrap();
        assert!(hit, "should match 'plain'");
        // matches different case (smart-case: no uppercase → ci)
        let hit_ci = m.is_match(b"Plain").unwrap();
        assert!(hit_ci, "smart-case: lowercase-only pattern should match 'Plain'");
    }

    #[test]
    fn build_matcher_wraps_whole_word_when_literal() {
        // literal + ww=true + "test" → \b...\b wrapped, case_smart
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.txt"), "is a test.\ntesting\n").unwrap();
        let matcher = build_matcher("test", false, false, true).expect("literal ww matcher ok");
        let ws = WorkspaceEnv::from_option(None);
        let root_display = dir.path().to_string_lossy().to_string();
        let resp = search_tree(dir.path(), &root_display, &ws, &matcher, &None, &None, 100, &|| false);
        assert_eq!(resp.hits.len(), 1, "ww=true should match 'test' but not 'testing'");
        assert!(resp.hits[0].text.contains("test."));
    }

    #[test]
    fn build_matcher_passes_regex_through_unchanged() {
        // regex=true + "[A-Z]+" + case_sensitive=true → regex passes through
        // unescaped, matches uppercase run; lowercase-only must NOT match.
        let m = build_matcher("[A-Z]+", true, true, false).expect("regex matcher ok");
        let hit = m.is_match(b"abc ABC xyz").unwrap();
        assert!(hit, "regex [A-Z]+ should match uppercase run in 'ABC'");
        let hit_lower = m.is_match(b"abc").unwrap();
        assert!(!hit_lower, "regex [A-Z]+ with case_sensitive=true must NOT match lowercase");
        // Verify the dot metachar is NOT escaped: "a.b" as regex matches "axb".
        let dot = build_matcher("a.b", true, true, false).expect("dot regex ok");
        assert!(dot.is_match(b"axb").unwrap(), "'a.b' should match 'axb' (regex, not literal)");
        // ... and that a literal-escape path would have matched only the literal dots.
        let lit = build_matcher("a.b", false, false, false).expect("literal ok");
        assert!(lit.is_match(b"a.b").unwrap(), "literal 'a.b' should match 'a.b'");
        assert!(!lit.is_match(b"axb").unwrap(), "literal 'a.b' must NOT match 'axb'");
    }

    #[test]
    fn build_matcher_case_sensitive_overrides_smart_case_for_regex() {
        // regex=true + case_sensitive=true + "Foo" → exact case only
        let m = build_matcher("Foo", true, true, false).expect("regex ci matcher ok");
        let hit_foo = m.is_match(b"say Foo here").unwrap();
        assert!(hit_foo, "case_sensitive=true should match exact case 'Foo'");
        let hit_lower = m.is_match(b"say foo here").unwrap();
        assert!(
            !hit_lower,
            "case_sensitive=true must NOT match 'foo' (smart-case overridden)"
        );
    }

    // -- fs_search_content tests --------------------------------------------

    #[test]
    fn fs_search_content_respects_include_glob() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.txt"), "find me here\n").unwrap();
        std::fs::write(dir.path().join("b.txt"), "find me too\n").unwrap();
        std::fs::write(dir.path().join("fs_search.rs"), "find me never\n").unwrap();

        let state = ContentSearchState::default();
        let resp = fs_search_content_inner(
            &state,
            "find".into(),
            dir.path().to_string_lossy().to_string(),
            false, // regex
            true,  // case_sensitive
            false, // whole_word
            Some("*.txt".into()),
            None,
            Some(100),
            None,
        )
        .expect("include-glob search ok");

        let rels: Vec<&str> = resp.hits.iter().map(|h| h.rel.as_str()).collect();
        assert!(
            rels.contains(&"a.txt"),
            "expected hit on a.txt, got rels={rels:?}"
        );
        assert!(
            rels.contains(&"b.txt"),
            "expected hit on b.txt, got rels={rels:?}"
        );
        assert!(
            !rels.iter().any(|r| r.contains("fs_search.rs")),
            "include *.txt must skip fs_search.rs, got rels={rels:?}"
        );
        assert_eq!(resp.hits.len(), 2, "exactly 2 .txt hits expected");
    }

    #[test]
    fn fs_search_content_respects_exclude_glob() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.txt"), "find me here\n").unwrap();
        std::fs::create_dir(dir.path().join("sub")).unwrap();
        std::fs::write(dir.path().join("sub").join("b.txt"), "find me too\n").unwrap();

        let state = ContentSearchState::default();
        let resp = fs_search_content_inner(
            &state,
            "find".into(),
            dir.path().to_string_lossy().to_string(),
            false, // regex
            true,  // case_sensitive
            false, // whole_word
            None,
            Some("sub/*".into()),
            Some(100),
            None,
        )
        .expect("exclude-glob search ok");

        let rels: Vec<&str> = resp.hits.iter().map(|h| h.rel.as_str()).collect();
        assert!(
            rels.contains(&"a.txt"),
            "expected hit on a.txt, got rels={rels:?}"
        );
        assert!(
            !rels.iter().any(|r| r.starts_with("sub/")),
            "exclude sub/* must skip sub/b.txt, got rels={rels:?}"
        );
        assert_eq!(resp.hits.len(), 1, "only a.txt expected (sub/* excluded)");
    }

    #[test]
    fn fs_search_content_generation_self_cancels() {
        // Build a directory large enough that the walk takes observable time,
        // so a generation bump from a sibling thread reliably lands mid-walk.
        let dir = tempfile::tempdir().unwrap();
        for i in 0..500 {
            std::fs::write(dir.path().join(format!("f{i}.txt")), "find me here\n").unwrap();
        }

        let state = std::sync::Arc::new(ContentSearchState::default());

        // Sibling thread simulates a newer query arriving mid-walk.
        let state_for_bump = state.clone();
        let bump_handle = std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(5));
            state_for_bump.generation.fetch_add(1, Ordering::SeqCst);
        });

        let resp = fs_search_content_inner(
            &state,
            "find".into(),
            dir.path().to_string_lossy().to_string(),
            false, // regex
            true,  // case_sensitive
            false, // whole_word
            None,
            None,
            Some(10_000), // generous cap so cancellation is what stops us
            None,
        )
        .expect("search ok");

        bump_handle.join().unwrap();

        // Without cancellation, all 500 files match (1 line each = 500 hits).
        // With cancellation, hits.len() < 500.
        assert!(
            resp.hits.len() < 500,
            "search should have been cancelled mid-walk, got {} hits (expected < 500)",
            resp.hits.len()
        );
    }
}
