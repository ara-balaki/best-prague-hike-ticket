import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import cs from "./cs.json";
import en from "./en.json";

const saved = localStorage.getItem("lang");
const lng = saved === "cs" ? "cs" : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    cs: { translation: cs },
  },
  lng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
