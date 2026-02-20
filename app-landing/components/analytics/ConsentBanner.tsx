"use client";

import { useState, useEffect, useCallback } from "react";

const CONSENT_KEY = "praedixa_analytics_consent";

type ConsentValue = "granted" | "denied" | null;

function getStoredConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === "granted" || stored === "denied") return stored;
  return null;
}

function updateGtagConsent(value: "granted" | "denied") {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: value,
    });
  }
}

interface ConsentBannerProps {
  locale: "fr" | "en";
}

const copy = {
  fr: {
    text: "Ce site utilise des cookies d'analyse pour améliorer votre expérience.",
    accept: "Accepter",
    reject: "Refuser",
    privacy: "Confidentialité",
  },
  en: {
    text: "This site uses analytics cookies to improve your experience.",
    accept: "Accept",
    reject: "Decline",
    privacy: "Privacy",
  },
};

export function ConsentBanner({ locale }: ConsentBannerProps) {
  const [consent, setConsent] = useState<ConsentValue>(null);
  const [isVisible, setIsVisible] = useState(false);
  const t = copy[locale] ?? copy.fr;

  useEffect(() => {
    const stored = getStoredConsent();
    setConsent(stored);
    if (stored) {
      updateGtagConsent(stored);
    } else {
      // Show banner after short delay to avoid CLS
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleChoice = useCallback((value: "granted" | "denied") => {
    localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    setIsVisible(false);
    updateGtagConsent(value);
  }, []);

  // Don't render if consent already given or no GA
  if (consent !== null || !isVisible) return null;
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-lg border border-border-subtle bg-cream/95 p-4 shadow-md backdrop-blur-xl md:bottom-6 md:left-auto md:right-6"
      role="dialog"
      aria-label="Cookie consent"
    >
      <p className="text-sm text-ink-secondary">{t.text}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => handleChoice("granted")}
          className="btn-primary px-4 py-2 text-xs"
        >
          {t.accept}
        </button>
        <button
          onClick={() => handleChoice("denied")}
          className="btn-ghost px-4 py-2 text-xs"
        >
          {t.reject}
        </button>
      </div>
    </div>
  );
}

/* Extend Window for gtag */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}
