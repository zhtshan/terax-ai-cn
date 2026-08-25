import i18next from "i18next";
import type { PaletteMode } from "../types";

export type ParsedQuery = {
  mode: PaletteMode;
  term: string;
  raw: string;
};

const PREFIXES: ReadonlyArray<{ sigil: string; mode: PaletteMode }> = [
  { sigil: ">", mode: "history" },
  { sigil: "#", mode: "content" },
  { sigil: "?", mode: "help" },
];

export function parseQuery(raw: string): ParsedQuery {
  for (const { sigil, mode } of PREFIXES) {
    if (raw.startsWith(sigil)) {
      return { mode, term: raw.slice(sigil.length).trim(), raw };
    }
  }
  return { mode: "commands", term: raw.trim(), raw };
}

export function getModeHints(): ReadonlyArray<{
  sigil: string;
  label: string;
}> {
  return [
    { sigil: ">", label: i18next.t("commandPalette.hint.history") },
    { sigil: "#", label: i18next.t("commandPalette.hint.content") },
  ];
}
