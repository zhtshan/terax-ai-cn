import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./i18n/locales/en.json";
import zh from "./i18n/locales/zh.json";

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