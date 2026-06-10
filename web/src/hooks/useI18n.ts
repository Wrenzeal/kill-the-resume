"use client";

import { useCallback } from "react";
import { translate, type TranslationKey } from "@/lib/i18n";
import { usePreferencesStore } from "@/store/preferences-store";

export function useI18n() {
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);

  const t = useCallback((key: TranslationKey) => translate(language, key), [language]);

  return { language, setLanguage, t };
}
