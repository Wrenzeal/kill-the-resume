"use client";

import { useEffect } from "react";
import { usePreferencesStore } from "@/store/preferences-store";
import { translate } from "@/lib/i18n";

export function LanguageHydrator() {
  const language = usePreferencesStore((state) => state.language);

  useEffect(() => {
    usePreferencesStore.getState().hydrateLanguage();
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const descriptionContent = translate(language, "meta.description");

    const syncLanguageMetadata = () => {
      document.documentElement.lang = language;
      document.documentElement.dir = "ltr";

      const [primaryDescription, ...duplicateDescriptions] = Array.from(
        document.head.querySelectorAll<HTMLMetaElement>('meta[name="description"]'),
      );

      if (primaryDescription) {
        primaryDescription.content = descriptionContent;
      } else {
        const description = document.createElement("meta");
        description.name = "description";
        description.content = descriptionContent;
        document.head.appendChild(description);
      }

      duplicateDescriptions.forEach((description) => description.remove());
    };

    const queueLanguageMetadataSync = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        syncLanguageMetadata();
      });
    };

    syncLanguageMetadata();

    const observer = new MutationObserver(queueLanguageMetadataSync);
    observer.observe(document.head, { childList: true });

    return () => {
      observer.disconnect();
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [language]);

  useEffect(() => {
    const title = translate(language, "meta.title");
    const titleTrack = `${title}   •   `;
    let titleOffset = 0;

    document.title = title;

    const titleTimer = window.setInterval(() => {
      titleOffset = (titleOffset + 1) % titleTrack.length;
      document.title = titleTrack.slice(titleOffset) + titleTrack.slice(0, titleOffset);
    }, 420);

    return () => {
      window.clearInterval(titleTimer);
    };
  }, [language]);

  return null;
}
