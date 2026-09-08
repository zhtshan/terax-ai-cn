import i18n from "@/i18n";

const CODE_RE = /^terax:([a-z0-9_]+)(?:\s+([\s\S]*))?$/;

export function displayError(raw: unknown): string {
  const s =
    typeof raw === "string"
      ? raw
      : raw instanceof Error
        ? raw.message
        : String(raw);
  const m = s.match(CODE_RE);
  if (!m) return s;
  const key = `terax.${m[1]}`;
  const rest = m[2];
  if (i18n.exists(key)) {
    return rest ? i18n.t(key, { rest }) : i18n.t(key);
  }
  return rest ?? s;
}
