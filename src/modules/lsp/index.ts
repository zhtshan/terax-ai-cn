export { LspStatusPill } from "./components/LspStatusPill";
export { detectBinary, redetectBinary } from "./lib/detect";
export {
  normalizeDocumentSymbols,
  type OutlineItem,
} from "./lib/documentSymbol";
export { setLspNavigator } from "./lib/navigator";
export { allServers, LSP_PRESETS, type LspPreset } from "./lib/presets";
export { useLspRuntimeStore } from "./lib/runtimeStore";
export {
  lspFormatDocument,
  notifyDocumentSaved,
  requestDocumentSymbols,
} from "./lib/sessionManager";
export { useLspExtension } from "./lib/useLspExtension";
