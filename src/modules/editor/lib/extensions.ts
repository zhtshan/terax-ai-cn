import { detectMonoFontFamily } from "@/lib/fonts";
import i18n from "@/i18n";
import { indentUnit } from "@codemirror/language";
import { lintGutter } from "@codemirror/lint";
import { search } from "@codemirror/search";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { chromeTheme } from "./chromeTheme";
import { searchPanelClear } from "./searchPanelClear";

// 检索/替换面板文案走 EditorState.phrases，缺省英文；仅补中文，英文即默认值
const ZH_PHRASES: Record<string, string> = {
  Find: "查找",
  Replace: "替换为",
  replace: "替换",
  "replace all": "全部替换",
  next: "下一个",
  previous: "上一个",
  all: "全部",
  "match case": "区分大小写",
  regexp: "正则表达式",
  "by word": "全字匹配",
  close: "关闭",
  "current match": "当前匹配",
  "replaced $ matches": "已替换 $ 处",
  "replaced match on line $": "已替换第 $ 行的匹配",
  "on line": "位于第",
  "Go to line": "跳转到行",
  go: "跳转",
  "Fold line": "折叠行",
  "Unfold line": "展开行",
  "Folded lines": "已折叠行",
  "Unfolded lines": "未折叠行",
  "folded code": "已折叠的代码",
  Diagnostics: "诊断",
  "No diagnostics": "无诊断",
  Completions: "补全",
  "Control character": "控制字符",
};

// Compartments allow runtime reconfiguration without rebuilding state.
export const languageCompartment = new Compartment();
export const readOnlyCompartment = new Compartment();
export const wrapCompartment = new Compartment();
export const vimCompartment = new Compartment();
export const lspCompartment = new Compartment();
export const indentCompartment = new Compartment();

export function indentExtension(unit: string): Extension {
  return [
    indentUnit.of(unit),
    EditorState.tabSize.of(unit === "\t" ? 4 : unit.length),
  ];
}

export const DEFAULT_INDENT: Extension = indentExtension("  ");

// Only what basicSetup doesn't already cover, to avoid duplicate extensions.
// basicSetup gives us line numbers, fold gutter, history, indentOnInput,
// bracketMatching, closeBrackets, autocompletion, highlightActiveLine,
// highlightSelectionMatches and the search keymap.
// Singleton: per-pane instances would inject duplicate style modules.
const SHARED_EXTENSIONS: readonly Extension[] = Object.freeze([
  search({ top: true }),
  searchPanelClear(),
  ...(i18n.language.startsWith("zh")
    ? [EditorState.phrases.of(ZH_PHRASES)]
    : []),
  lintGutter(),
  chromeTheme(),
  EditorView.theme({
    "&, &.cm-editor, &.cm-editor.cm-focused": {
      backgroundColor: "transparent !important",
      color: "var(--foreground)",
      outline: "none",
      padding: "8px",
    },
    ".cm-scroller": {
      fontFamily: detectMonoFontFamily(),
      fontSize: "calc(var(--editor-font-size, 13px) * var(--app-zoom, 1))",
      lineHeight: "1.55",
      backgroundColor: "transparent !important",
    },
    ".cm-content": {
      caretColor: "var(--foreground)",
      backgroundColor: "transparent !important",
    },
    ".cm-gutters": {
      backgroundColor: "transparent !important",
      color: "var(--muted-foreground)",
    },
    ".cm-gutter-lint": {
      width: "0px",
    },
    ".cm-gutter": { backgroundColor: "transparent !important" },
    ".cm-lineNumbers .cm-gutterElement": {
      opacity: "0.55",
    },
    ".cm-foldGutter": { width: "10px" },
    ".cm-foldGutter .cm-gutterElement": {
      color: "var(--muted-foreground)",
      opacity: "0.5",
    },
    ".cm-activeLine": {
      borderTopRightRadius: "5px",
      borderBottomRightRadius: "5px",
      backgroundColor: "color-mix(in srgb, var(--foreground) 4%, transparent)",
    },
    ".cm-lineNumbers .cm-activeLineGutter": {
      borderTopLeftRadius: "5px",
      borderBottomLeftRadius: "5px",
      userSelect: "none",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--foreground)",
    },
    // Vim normal-mode block cursor — translucent foreground, no rose hue.
    ".cm-fat-cursor": {
      background:
        "color-mix(in srgb, var(--foreground) 35%, transparent) !important",
      outline:
        "1px solid color-mix(in srgb, var(--foreground) 55%, transparent) !important",
      color: "var(--foreground) !important",
      borderRadius: "2px",
    },
    "&:not(.cm-focused) .cm-fat-cursor": {
      background: "transparent !important",
      outline:
        "1px solid color-mix(in srgb, var(--foreground) 35%, transparent) !important",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection":
      {
        backgroundColor:
          "color-mix(in srgb, var(--foreground) 18%, transparent) !important",
      },
    ".cm-panels": {
      backgroundColor: "var(--popover)",
      color: "var(--popover-foreground)",
      borderColor: "var(--border)",
    },
  }),
]);

export function buildSharedExtensions(): readonly Extension[] {
  return SHARED_EXTENSIONS;
}
