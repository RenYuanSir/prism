import { motion } from "framer-motion";
import { Languages } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language.startsWith("zh");

  const toggle = useCallback(() => {
    i18n.changeLanguage(isZh ? "en" : "zh");
  }, [i18n, isZh]);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-weight-510 text-linear-text-tertiary hover:bg-linear-surface/50 hover:text-linear-text-secondary transition-all duration-200 w-full"
      aria-label={t("layout.langSwitch")}
    >
      <Languages className="h-4 w-4" />
      <motion.span
        key={isZh ? "zh" : "en"}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {isZh ? "中文" : "EN"}
      </motion.span>
    </button>
  );
}
