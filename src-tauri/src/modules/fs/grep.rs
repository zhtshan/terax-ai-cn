use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use globset::{Glob, GlobSet, GlobSetBuilder};
use grep_matcher::Matcher;
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

#[derive(Debug, Serialize)]
pub struct ReplaceFileResult {
    pub path: String,
    pub replacements: usize,
}

#[derive(Debug, Serialize)]
pub struct ReplaceError {
    pub path: String,
    pub reason: String,
}

#[derive(Debug, Serialize)]
pub struct ReplaceResponse {
    pub files_changed: Vec<ReplaceFileResult>,
    pub errors: Vec<ReplaceError>,
    pub total_replacements: usize,
    pub truncated: bool,
}

/// Replace every occurrence (one per matching line) of `pattern` with
/// `replacement` across all matching files under `root`, then atomically
/// rewrite each file. Errors are collected per file; the call as a whole
/// succeeds even if individual files fail. Workspace authorization is
/// provided upstream by the IPC wrapper that uses `fs::file::fs_write_file`'s
/// resolve/secret-path chain; this inner function just resolves the root.
#[allow(clippy::too_many_arguments)]
fn fs_replace_all_inner(
    pattern: String,
    replacement: String,
    root: String,
    regex: bool,
    case_sensitive: bool,
    whole_word: bool,
    include: Option<String>,
    exclude: Option<String>,
    workspace: Option<WorkspaceEnv>,
) -> Result<ReplaceResponse, String> {
    if pattern.is_empty() {
        return Err("empty pattern".into());
    }
    if replacement.is_empty() {
        return Err("empty replacement".into());
    }

    let workspace = WorkspaceEnv::from_option(workspace);
    let root_path = resolve_path(&root, &workspace);
    if !root_path.is_dir() {
        return Err(format!("not a directory: {root}"));
    }

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

    let grep = search_tree(
        &root_path,
        &root,
        &workspace,
        &matcher,
        &include_globs,
        &exclude_globs,
        HARD_MAX_RESULTS,
        &|| false,
    );

    // Group hits by path. The UTF8 sink yields one entry per matching line, so
    // each (path, line) pair is naturally unique — but we dedupe explicitly to
    // guarantee "first match per line only" even if a future sink change
    // surfaces multiple matches on the same line.
    let mut seen: std::collections::HashSet<(String, u64)> = std::collections::HashSet::new();
    let mut by_path: std::collections::BTreeMap<String, Vec<(u64, String)>> =
        std::collections::BTreeMap::new();
    for hit in &grep.hits {
        if seen.insert((hit.path.clone(), hit.line)) {
            by_path
                .entry(hit.path.clone())
                .or_default()
                .push((hit.line, hit.text.clone()));
        }
    }

    let mut files_changed: Vec<ReplaceFileResult> = Vec::new();
    let mut errors: Vec<ReplaceError> = Vec::new();
    let mut total_replacements: usize = 0;

    for (path_str, mut line_hits) in by_path {
        let target = std::path::Path::new(&path_str);
        let content = match std::fs::read_to_string(target) {
            Ok(s) => s,
            Err(e) => {
                errors.push(ReplaceError {
                    path: path_str,
                    reason: e.to_string(),
                });
                continue;
            }
        };

        let mut lines: Vec<String> = content.split('\n').map(String::from).collect();

        // Apply replacements in descending line order so earlier substitutions
        // can't shift the byte offsets that later line numbers refer to. With
        // split-by-'\n' the index-based mutation is order-independent, but
        // sorting matches the spec.
        line_hits.sort_by(|a, b| b.0.cmp(&a.0));

        let mut count = 0usize;
        for (line_no, _) in &line_hits {
            let idx = match line_no.checked_sub(1).and_then(|n| usize::try_from(n).ok()) {
                Some(i) => i,
                None => continue,
            };
            if idx >= lines.len() {
                continue;
            }
            let new_line = if regex {
                let mut dst: Vec<u8> = Vec::new();
                matcher
                    .replace(lines[idx].as_bytes(), &mut dst, |_, d| {
                        d.extend_from_slice(replacement.as_bytes());
                        true
                    })
                    .map_err(|e| format!("replace error: {e}"))?;
                String::from_utf8(dst).map_err(|e| format!("utf8 after replace: {e}"))?
            } else {
                lines[idx].replacen(pattern.as_str(), replacement.as_str(), 1)
            };
            if new_line != lines[idx] {
                lines[idx] = new_line;
                count += 1;
            }
        }

        let new_content = lines.join("\n");
        if let Err(e) = write_atomic(target, new_content.as_bytes()) {
            errors.push(ReplaceError {
                path: path_str,
                reason: e.to_string(),
            });
            continue;
        }

        total_replacements += count;
        files_changed.push(ReplaceFileResult {
            path: path_str,
            replacements: count,
        });
    }

    Ok(ReplaceResponse {
        files_changed,
        errors,
        total_replacements,
        truncated: grep.truncated,
    })
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn fs_replace_all(
    pattern: String,
    replacement: String,
    root: String,
    regex: bool,
    case_sensitive: bool,
    whole_word: bool,
    include: Option<String>,
    exclude: Option<String>,
    workspace: Option<WorkspaceEnv>,
) -> Result<ReplaceResponse, String> {
    fs_replace_all_inner(
        pattern,
        replacement,
        root,
        regex,
        case_sensitive,
        whole_word,
        include,
        exclude,
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
    fn fs_search_content_whole_word_literal_excludes_partial_match() {
        // End-to-end check that build_matcher correctly wraps literal patterns
        // with \b…\b when whole_word=true. "testing" contains "test" as a
        // prefix substring but is NOT a whole-word match — the helper must
        // exclude it.
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("a.txt"),
            "this is a test.\ntesting 123\n",
        )
        .unwrap();

        let state = ContentSearchState::default();
        let resp = fs_search_content_inner(
            &state,
            "test".into(),
            dir.path().to_string_lossy().to_string(),
            false, // regex
            false, // case_sensitive (smart-case: lowercase only → ci)
            true,  // whole_word
            None,
            None,
            Some(100),
            None,
        )
        .expect("whole-word literal search ok");

        assert_eq!(
            resp.hits.len(),
            1,
            "whole_word=true on literal 'test' must match 'test.' but not 'testing', got hits={:?}",
            resp.hits.iter().map(|h| (&h.rel, h.line, &h.text)).collect::<Vec<_>>()
        );
        assert_eq!(resp.hits[0].line, 1, "should match line 1 only");
        assert!(
            resp.hits[0].text.contains("test."),
            "matched line should be the whole-word one, got {:?}",
            resp.hits[0].text
        );
    }

    #[test]
    fn fs_search_content_whole_word_regex_passes_through() {
        // In regex mode, build_matcher does NOT auto-wrap with \b — that's the
        // caller's responsibility. If the caller passes a \b-bounded pattern,
        // end-to-end behaviour matches the literal whole_word path.
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("a.txt"),
            "this is a test.\ntesting 123\n",
        )
        .unwrap();

        let state = ContentSearchState::default();
        let resp = fs_search_content_inner(
            &state,
            r"\btest\b".into(),
            dir.path().to_string_lossy().to_string(),
            true,  // regex
            true,  // case_sensitive
            true,  // whole_word (no-op for regex — caller already bounded)
            None,
            None,
            Some(100),
            None,
        )
        .expect("regex whole-word search ok");

        assert_eq!(
            resp.hits.len(),
            1,
            "regex \\btest\\b must match only the whole-word line, got hits={:?}",
            resp.hits.iter().map(|h| (&h.rel, h.line, &h.text)).collect::<Vec<_>>()
        );
        assert_eq!(resp.hits[0].line, 1);
        assert!(resp.hits[0].text.contains("test."));
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

    // -- fs_replace_all tests -----------------------------------------------

    #[cfg(unix)]
    #[test]
    fn fs_replace_all_partial_failure_continues_remaining_files() {
        // Strategy: a.txt lives directly under the (writable) root, while
        // c.txt lives in a sub-directory that we mark read-only (chmod
        // 0o555). chmod 0o555 on a directory allows listdir and reads
        // inside it but blocks new file creation — so the searcher still
        // finds c.txt (read succeeds), our read_to_string still works
        // (read on the file is permitted), but write_atomic fails because
        // NamedTempFile::new_in cannot create the staging file in the
        // read-only sub-directory. a.txt goes through normally. This is
        // the closest portable approximation to the spec's "b.txt read
        // fails after search succeeds" intent.
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.txt"), "find me here\n").unwrap();
        std::fs::create_dir(dir.path().join("locked")).unwrap();
        std::fs::write(dir.path().join("locked").join("c.txt"), "find me three\n").unwrap();

        let locked = dir.path().join("locked");
        let mut perms = std::fs::metadata(&locked).unwrap().permissions();
        perms.set_mode(0o555);
        std::fs::set_permissions(&locked, perms).unwrap();

        let resp = fs_replace_all_inner(
            "find".into(),
            "REPLACED".into(),
            dir.path().to_string_lossy().to_string(),
            false, // regex
            true,  // case_sensitive
            false, // whole_word
            None,
            None,
            None,
        )
        .expect("replace_all ok");

        // Restore perms so tempdir cleanup works.
        let mut perms = std::fs::metadata(&locked).unwrap().permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&locked, perms).unwrap();

        assert_eq!(
            resp.files_changed.len(),
            1,
            "expected only a.txt to be writable, got files_changed={:?}",
            resp.files_changed
        );
        assert_eq!(
            resp.errors.len(),
            1,
            "expected 1 write error for locked/c.txt, got errors={:?}",
            resp.errors
        );
        assert_eq!(resp.total_replacements, 1, "only a.txt contributed");

        let a = std::fs::read_to_string(dir.path().join("a.txt")).unwrap();
        let c = std::fs::read_to_string(dir.path().join("locked").join("c.txt")).unwrap();
        assert_eq!(a, "REPLACED me here\n", "a.txt should be replaced");
        assert_eq!(c, "find me three\n", "locked/c.txt must remain unchanged on write failure");
    }

    #[test]
    fn fs_replace_all_skips_binary_files() {
        let dir = tempfile::tempdir().unwrap();
        // PNG header with the word "find" somewhere inside, but null byte forces
        // binary detection (`BinaryDetection::quit(b'\x00')`).
        let png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR find me here\n";
        std::fs::write(dir.path().join("img.png"), png).unwrap();
        std::fs::write(dir.path().join("ok.txt"), "find me too\n").unwrap();

        let resp = fs_replace_all_inner(
            "find".into(),
            "REPLACED".into(),
            dir.path().to_string_lossy().to_string(),
            false, // regex
            true,  // case_sensitive
            false, // whole_word
            None,
            None,
            None,
        )
        .expect("replace_all ok");

        // Binary file should be skipped — no hits, not in files_changed, no error.
        let png_after = std::fs::read(dir.path().join("img.png")).unwrap();
        assert_eq!(png_after, png, "binary file must remain unchanged");
        let rels: Vec<&str> = resp
            .files_changed
            .iter()
            .map(|f| std::path::Path::new(&f.path).file_name().unwrap().to_str().unwrap())
            .collect();
        assert_eq!(resp.files_changed.len(), 1, "only ok.txt expected");
        assert!(rels.contains(&"ok.txt"), "ok.txt should be in files_changed");
        assert!(!rels.contains(&"img.png"), "img.png must be skipped");
        assert_eq!(resp.errors.len(), 0);
        assert_eq!(resp.total_replacements, 1);
        assert!(!resp.truncated);
    }

    #[test]
    fn fs_replace_all_respects_exclude_glob() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.txt"), "find me here\n").unwrap();
        std::fs::create_dir(dir.path().join("sub")).unwrap();
        std::fs::write(dir.path().join("sub").join("b.txt"), "find me too\n").unwrap();

        let resp = fs_replace_all_inner(
            "find".into(),
            "REPLACED".into(),
            dir.path().to_string_lossy().to_string(),
            false,
            true,
            false,
            None,
            Some("sub/*".into()),
            None,
        )
        .expect("replace_all ok");

        let rels: Vec<&str> = resp
            .files_changed
            .iter()
            .map(|f| std::path::Path::new(&f.path).file_name().unwrap().to_str().unwrap())
            .collect();
        assert_eq!(resp.files_changed.len(), 1, "only a.txt expected");
        assert!(rels.contains(&"a.txt"));
        let sub_after = std::fs::read_to_string(dir.path().join("sub").join("b.txt")).unwrap();
        assert_eq!(sub_after, "find me too\n", "sub/b.txt must remain unchanged");
        assert_eq!(resp.total_replacements, 1);
    }

    #[test]
    fn fs_replace_all_zero_match_returns_empty_files_changed() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.txt"), "no match here\n").unwrap();

        let resp = fs_replace_all_inner(
            "definitely_not_present".into(),
            "REPLACED".into(),
            dir.path().to_string_lossy().to_string(),
            false,
            true,
            false,
            None,
            None,
            None,
        )
        .expect("replace_all ok");

        assert!(resp.files_changed.is_empty(), "no files should be touched");
        assert!(resp.errors.is_empty());
        assert_eq!(resp.total_replacements, 0);
        assert!(!resp.truncated);
    }

    #[test]
    fn fs_replace_all_first_match_per_line_only() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.txt"), "abc abc abc\n").unwrap();

        let resp = fs_replace_all_inner(
            "abc".into(),
            "XYZ".into(),
            dir.path().to_string_lossy().to_string(),
            false,
            true,
            false,
            None,
            None,
            None,
        )
        .expect("replace_all ok");

        assert_eq!(resp.total_replacements, 1, "only first match per line counts");
        assert_eq!(resp.files_changed.len(), 1);
        assert_eq!(resp.files_changed[0].replacements, 1);
        let after = std::fs::read_to_string(dir.path().join("a.txt")).unwrap();
        assert_eq!(after, "XYZ abc abc\n", "only first abc replaced");
    }

    #[test]
    fn fs_replace_all_reports_per_file_replacement_counts() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.txt"), "foo bar\nfoo baz\n").unwrap();

        let resp = fs_replace_all_inner(
            "foo".into(),
            "XXX".into(),
            dir.path().to_string_lossy().to_string(),
            false,
            true,
            false,
            None,
            None,
            None,
        )
        .expect("replace_all ok");

        assert_eq!(resp.files_changed.len(), 1);
        assert_eq!(resp.files_changed[0].replacements, 2);
        assert_eq!(resp.total_replacements, 2);
        let after = std::fs::read_to_string(dir.path().join("a.txt")).unwrap();
        assert_eq!(after, "XXX bar\nXXX baz\n");
        assert!(resp.errors.is_empty());
    }

    /// Contract lock: `fs_replace_all` trusts its caller — the frontend
    /// (`useReplaceRun`) is the single source of deny-list enforcement. The
    /// backend must NOT re-introduce a secret-path deny-list of its own;
    /// `fs_write_file` already routes through `write_atomic` without one, and
    /// `fs_replace_all` reuses `write_atomic` for the same reason. If a future
    /// refactor adds a server-side deny-list here, this test will fail and
    /// signal that the architectural contract has been violated.
    ///
    /// Note: the deny-list lives in the frontend
    /// `src/modules/ai/lib/security.ts` (`SECRET_BASENAME_PATTERNS`) and is
    /// applied by `checkWritableCanonical` before any IPC call. The backend
    /// intentionally does not duplicate that check.
    ///
    /// We use `secrets.json` (which matches `/^secrets?\.(json|ya?ml|toml|env)/i`
    /// in the front-end deny-list) rather than `.env` because the search
    /// walker also applies `.hidden(true)` and would skip a hidden file for
    /// the unrelated reason that it starts with a dot. The deny-list contract
    /// we want to lock is separate from the ignore-walker's hidden-file
    /// policy.
    #[test]
    fn fs_replace_all_does_not_block_secret_paths_server_side() {
        let dir = tempfile::tempdir().unwrap();
        // File name matches the front-end deny-list pattern for secrets —
        // the backend must NOT inspect this name and must complete the
        // replacement as it would for any other file.
        std::fs::write(
            dir.path().join("secrets.json"),
            "{\"token\": \"find me here\"}\n",
        )
        .unwrap();

        let resp = fs_replace_all_inner(
            "find".into(),
            "REPLACED".into(),
            dir.path().to_string_lossy().to_string(),
            false, // regex
            true,  // case_sensitive
            false, // whole_word
            None,
            None,
            None,
        )
        .expect("replace_all must succeed — server does not deny-list");

        assert_eq!(
            resp.files_changed.len(),
            1,
            "fs_replace_all trusts its caller; secrets.json MUST be rewritten, \
             got files_changed={:?}",
            resp.files_changed
        );
        assert!(
            resp.errors.is_empty(),
            "no server-side deny-list means no spurious errors, got errors={:?}",
            resp.errors
        );
        assert_eq!(
            resp.total_replacements, 1,
            "single line containing 'find' should be replaced"
        );

        let after = std::fs::read_to_string(dir.path().join("secrets.json")).unwrap();
        assert_eq!(
            after, "{\"token\": \"REPLACED me here\"}\n",
            "secrets.json content must be rewritten by the server; deny-list is a frontend concern"
        );
    }
}
