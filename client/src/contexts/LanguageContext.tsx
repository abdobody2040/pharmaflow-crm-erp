import { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ar";
const dictionary = {
  en: { language: "العربية", operations: "Operations Expansion", commandCenter: "Command Center", tenantManagement: "Tenant Management", complianceReview: "Compliance Review" },
  ar: { language: "English", operations: "التشغيل والتوسعة", commandCenter: "مركز القيادة", tenantManagement: "إدارة العملاء", complianceReview: "مراجعة الامتثال" },
};
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; toggleLanguage: () => void; t: (key: keyof typeof dictionary.en) => string; };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("pharmaflow-language") === "ar" ? "ar" : "en"));
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr"; localStorage.setItem("pharmaflow-language", language); }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage: () => setLanguage(current => current === "en" ? "ar" : "en"), t: key => dictionary[language][key] }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { const context = useContext(LanguageContext); if (!context) throw new Error("useLanguage must be used within LanguageProvider"); return context; }
