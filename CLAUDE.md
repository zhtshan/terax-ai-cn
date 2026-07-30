# Terax: Tauri Desktop Code Editor

A modern code editor with integrated terminal, Git history, and AI-powered features.

**Current Branch:** `feature/20260729/vscode-style-content-search` — Final i18n polish for VS Code-style file content search.

## Key Architecture

- **Frontend:** React 19, TypeScript, CodeMirror 6, xterm.js, Tauri v2 APIs
- **Backend:** Rust (Tauri v2), file system operations, grep-based search with capture groups
- **CLI Tools:** biome (lint/format), vitest (tests), TypeScript strict mode

## Current Work: VS Code-Style Search Rework

Implementing left-sidebar search panel (like VS Code) with:
- **SearchInline.tsx** — Inline search UI for terminal/editor/git-history
- **Search panel operations** — Find, Replace, Replace All with regex support
- **i18n:** en.json + zh.json (searchPanel.*, sidebar.search, keyboard shortcuts)

**Status:** Most features implemented; wrapping up i18n keys for UI strings.

**Key Commits:**
- camelCase unification: `wholeWord`/`caseSensitive` match Tauri backend
- Rust grep: cap replace_all at first match per line (WSL paths hardened)
- i18n: 51a4330 (en), 4356b46 (zh)

## Key Files & Patterns

| Path | Purpose |
|------|---------|
| `src/modules/header/SearchInline.tsx` | Inline search widget (terminal/editor/git) |
| `src/modules/search/` | Search state, hooks, Rust bindings |
| `src/i18n/locales/` | i18n keys (en.json, zh.json) |
| `src-tauri/src/search.rs` | Grep-based search engine, replace logic |

## Conventions

- **Naming:** camelCase in TypeScript (matches Rust backend)
- **i18n keys:** `searchPanel.find`, `searchPanel.replace`, `sidebar.search` (English strings in en.json)
- **Search options:** `{ caseSensitive, wholeWord, regex }` shape (from Tauri)
- **Git commits:** `fix(search)/feat(i18n)/chore(coord)` + task tracking

## Dev Commands

```bash
pnpm dev             # Start with Tauri hot-reload
pnpm build           # Full build (TypeScript → Vite → Tauri binary)
pnpm test            # Run vitest
pnpm lint:fix        # biome lint + format
pnpm check-types     # TypeScript strict check
```

## Known Constraints

- Tauri API `invoke()` must use exact camelCase field names
- Replace All caps at first match per line (not global per-file)
- WSL path handling: normalize backslashes before passing to Rust
- i18n strings must be defined before UI renders (no runtime fallbacks)
