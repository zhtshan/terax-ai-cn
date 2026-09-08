import type { Theme, ThemeColors, ThemeVariant, TerminalPalette } from "./types";
import i18n from "@/i18n";

export type ValidationResult =
  | { ok: true; theme: Theme }
  | { ok: false; error: string };

const COLOR_KEYS: readonly (keyof ThemeColors)[] = [
  "background", "foreground",
  "card", "cardForeground",
  "popover", "popoverForeground",
  "primary", "primaryForeground",
  "secondary", "secondaryForeground",
  "muted", "mutedForeground",
  "accent", "accentForeground",
  "destructive",
  "border", "input", "ring",
  "sidebar", "sidebarForeground",
  "sidebarPrimary", "sidebarPrimaryForeground",
  "sidebarAccent", "sidebarAccentForeground",
  "sidebarBorder", "sidebarRing",
  "radius",
];

const ID_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

function parseColors(raw: unknown, path: string): ThemeColors | string {
  if (raw === undefined) return {};
  if (!isObj(raw)) return i18n.t("settings.themes.vObject", { path });
  const out: ThemeColors = {};
  for (const k of Object.keys(raw)) {
    if (!(COLOR_KEYS as string[]).includes(k)) {
      return i18n.t("settings.themes.vColorKey", { path, key: k });
    }
    const v = raw[k];
    if (!isStr(v) || v.length === 0) return i18n.t("settings.themes.vNonEmptyString", { path: `${path}.${k}` });
    out[k as keyof ThemeColors] = v;
  }
  return out;
}

function parseTerminal(raw: unknown, path: string): TerminalPalette | string {
  if (raw === undefined) return {};
  if (!isObj(raw)) return i18n.t("settings.themes.vObject", { path });
  const out: TerminalPalette = {};
  if (raw.background !== undefined) {
    if (!isStr(raw.background)) return i18n.t("settings.themes.vString", { path: `${path}.background` });
    out.background = raw.background;
  }
  if (raw.foreground !== undefined) {
    if (!isStr(raw.foreground)) return i18n.t("settings.themes.vString", { path: `${path}.foreground` });
    out.foreground = raw.foreground;
  }
  if (raw.cursor !== undefined) {
    if (!isStr(raw.cursor)) return i18n.t("settings.themes.vString", { path: `${path}.cursor` });
    out.cursor = raw.cursor;
  }
  if (raw.cursorAccent !== undefined) {
    if (!isStr(raw.cursorAccent)) return i18n.t("settings.themes.vString", { path: `${path}.cursorAccent` });
    out.cursorAccent = raw.cursorAccent;
  }
  if (raw.selection !== undefined) {
    if (!isStr(raw.selection)) return i18n.t("settings.themes.vString", { path: `${path}.selection` });
    out.selection = raw.selection;
  }
  if (raw.ansi !== undefined) {
    if (!Array.isArray(raw.ansi) || raw.ansi.length !== 16) {
      return i18n.t("settings.themes.vAnsiArray", { path: `${path}.ansi` });
    }
    for (let i = 0; i < 16; i++) {
      if (!isStr(raw.ansi[i])) return i18n.t("settings.themes.vString", { path: `${path}.ansi[${i}]` });
    }
    out.ansi = raw.ansi as unknown as TerminalPalette["ansi"];
  }
  return out;
}

function parseVariant(raw: unknown, path: string): ThemeVariant | string {
  if (!isObj(raw)) return i18n.t("settings.themes.vObject", { path });
  const colors = parseColors(raw.colors, `${path}.colors`);
  if (typeof colors === "string") return colors;
  const terminal = parseTerminal(raw.terminal, `${path}.terminal`);
  if (typeof terminal === "string") return terminal;
  return { colors, terminal };
}

export function validateTheme(raw: unknown): ValidationResult {
  if (!isObj(raw)) return { ok: false, error: i18n.t("settings.themes.importNotObject") };
  if (!isStr(raw.id) || !ID_RE.test(raw.id)) {
    return { ok: false, error: i18n.t("settings.themes.importIdInvalid") };
  }
  if (!isStr(raw.name) || raw.name.trim().length === 0) {
    return { ok: false, error: i18n.t("settings.themes.importNameRequired") };
  }
  if (!isObj(raw.variants)) return { ok: false, error: i18n.t("settings.themes.importVariantsObject") };
  const variants: Theme["variants"] = {};
  if (raw.variants.light !== undefined) {
    const v = parseVariant(raw.variants.light, "variants.light");
    if (typeof v === "string") return { ok: false, error: v };
    variants.light = v;
  }
  if (raw.variants.dark !== undefined) {
    const v = parseVariant(raw.variants.dark, "variants.dark");
    if (typeof v === "string") return { ok: false, error: v };
    variants.dark = v;
  }
  if (!variants.light && !variants.dark) {
    return { ok: false, error: i18n.t("settings.themes.importVariantsRequired") };
  }
  const theme: Theme = {
    id: raw.id,
    name: raw.name.trim(),
    variants,
  };
  if (isStr(raw.author)) theme.author = raw.author;
  if (isStr(raw.description)) theme.description = raw.description;
  if (isObj(raw.editorTheme)) {
    const et: Theme["editorTheme"] = {};
    if (isStr(raw.editorTheme.light)) et.light = raw.editorTheme.light;
    if (isStr(raw.editorTheme.dark)) et.dark = raw.editorTheme.dark;
    if (et.light || et.dark) theme.editorTheme = et;
  }
  return { ok: true, theme };
}
