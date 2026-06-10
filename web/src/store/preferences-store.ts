"use client";

import { create } from "zustand";
import { defaultLanguage, isLanguage, type Language } from "@/lib/i18n";

const LANGUAGE_STORAGE_KEY = "kill-the-resume.language";

type PreferencesStore = {
  language: Language;
  setLanguage: (language: Language) => void;
  hydrateLanguage: () => void;
};

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  language: defaultLanguage,
  setLanguage: (language) => {
    set({ language });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  },
  hydrateLanguage: () => {
    if (typeof window === "undefined") {
      return;
    }

    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (isLanguage(storedLanguage)) {
      set({ language: storedLanguage });
    }
  },
}));
