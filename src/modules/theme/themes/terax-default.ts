import type { Theme } from "../types";

export const teraxDefault: Theme = {
  id: "terax-default",
  name: "Terax Default",
  description: "The default Terax look — clean glass over neutral surfaces.",
  editorTheme: { dark: "atomone", light: "atomone" },
  variants: {
    light: {
      terminal: {
        selection: "rgba(0,0,0,0.1)",
      },
    },
    dark: {
      terminal: {
        selection: "rgba(255,255,255,0.12)",
      },
    },
  },
};
