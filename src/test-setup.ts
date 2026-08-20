import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { vi } from "vitest";
import en from "./i18n/locales/en.json";
import zh from "./i18n/locales/zh.json";

// happy-dom has no Tauri runtime, so any module-level `listen()` call (e.g.
// `ensureAgentActivityListener` triggered by importing `useTerminalSession`)
// would surface as an unhandled rejection through
// `@tauri-apps/api/core`'s `transformCallback`. Stub the event bridge to noop;
// real Tauri behavior is exercised in the app, not in unit tests.
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(() => Promise.resolve()),
}));

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-CN": { translation: zh },
  },
  lng: "zh-CN",
  fallbackLng: "en",
  supportedLngs: ["zh-CN", "en"],
  interpolation: { escapeValue: false },
});