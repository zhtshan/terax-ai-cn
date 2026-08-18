import {
  CubeIcon,
  FunctionIcon,
  FunctionSquareIcon,
  Layers01Icon,
  ListViewIcon,
  Package01Icon,
  PropertyViewIcon,
  SourceCodeIcon,
  Structure01Icon,
  Tag01Icon,
  VariableIcon,
} from "@hugeicons/core-free-icons";

// LSP SymbolKind (1-indexed, vscode-languageserver-types).
const SYMBOL_KIND_ICONS: Record<number, typeof VariableIcon> = {
  1: SourceCodeIcon, // File
  2: Package01Icon, // Module
  3: Layers01Icon, // Namespace
  4: Package01Icon, // Package
  5: CubeIcon, // Class
  6: FunctionSquareIcon, // Method
  7: PropertyViewIcon, // Property
  8: Tag01Icon, // Field
  9: FunctionSquareIcon, // Constructor
  10: ListViewIcon, // Enum
  11: Layers01Icon, // Interface
  12: FunctionIcon, // Function
  13: VariableIcon, // Variable
  14: VariableIcon, // Constant
  22: Tag01Icon, // EnumMember
  23: Structure01Icon, // Struct
};

export function iconForSymbolKind(kind: number | undefined) {
  if (kind === undefined) return null;
  return SYMBOL_KIND_ICONS[kind] ?? SourceCodeIcon;
}
