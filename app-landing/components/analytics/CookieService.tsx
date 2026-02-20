"use client";

import Script from "next/script";
import { localizedSlugs } from "../../lib/i18n/config";
import type { Locale } from "../../lib/i18n/config";

interface CookieServiceProps {
  locale: Locale;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    tarteaucitron?: {
      init: (options: Record<string, unknown>) => void;
      services: Record<string, unknown>;
      job: string[];
      user?: Record<string, unknown>;
      userInterface?: {
        openPanel?: () => void;
      };
    };
    tarteaucitronForceLanguage?: "fr" | "en";
  }
}

const CMP_SCRIPT_SRC =
  "https://cdn.jsdelivr.net/npm/tarteaucitronjs@1.26.0/tarteaucitron.min.js";

export function CookieService({ locale }: CookieServiceProps) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!gaId) return null;

  const privacyUrl = `/${locale}/${localizedSlugs.privacy[locale]}`;

  return (
    <>
      <Script
        id="tarteaucitron-lib"
        src={CMP_SCRIPT_SRC}
        strategy="afterInteractive"
      />
      <Script
        id="tarteaucitron-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              if (typeof window === "undefined") return;
              window.tarteaucitronForceLanguage = ${JSON.stringify(locale)};

              function updateGtagConsent(value) {
                if (typeof window.gtag === "function") {
                  window.gtag("consent", "update", { analytics_storage: value });
                }
              }

              function initWhenReady(retries) {
                if (typeof window.tarteaucitron === "undefined") {
                  if (retries > 0) {
                    window.setTimeout(function () { initWhenReady(retries - 1); }, 150);
                  }
                  return;
                }

                window.tarteaucitron.init({
                  privacyUrl: ${JSON.stringify(privacyUrl)},
                  hashtag: "#tarteaucitron",
                  cookieName: "tarteaucitron",
                  orientation: "bottom",
                  showAlertSmall: false,
                  cookieslist: false,
                  showIcon: false,
                  iconPosition: "BottomRight",
                  adblocker: false,
                  DenyAllCta: true,
                  AcceptAllCta: true,
                  highPrivacy: true,
                  handleBrowserDNTRequest: false,
                  removeCredit: true,
                  moreInfoLink: true,
                  useExternalCss: false,
                  useExternalJs: false,
                  mandatory: true,
                  mandatoryCta: true
                });

                if (!window.tarteaucitron.services.praedixa_ga) {
                  window.tarteaucitron.services.praedixa_ga = {
                    key: "praedixa_ga",
                    type: "analytic",
                    name: "Google Analytics",
                    uri: ${JSON.stringify(privacyUrl)},
                    needConsent: true,
                    cookies: ["_ga", "_ga_*", "_gid"],
                    js: function () {
                      updateGtagConsent("granted");
                    },
                    fallback: function () {
                      updateGtagConsent("denied");
                    }
                  };
                }

                window.tarteaucitron.user = window.tarteaucitron.user || {};
                window.tarteaucitron.user.gtagUa = ${JSON.stringify(gaId)};
                window.tarteaucitron.job = window.tarteaucitron.job || [];
                if (window.tarteaucitron.job.indexOf("praedixa_ga") === -1) {
                  window.tarteaucitron.job.push("praedixa_ga");
                }

                var hasConsentCookie = document.cookie
                  .split(";")
                  .some(function (entry) {
                    return entry.trim().indexOf("tarteaucitron=") === 0;
                  });

                if (!hasConsentCookie) {
                  window.setTimeout(function () {
                    try {
                      if (
                        window.tarteaucitron &&
                        window.tarteaucitron.userInterface &&
                        typeof window.tarteaucitron.userInterface.openPanel === "function"
                      ) {
                        window.tarteaucitron.userInterface.openPanel();
                      }
                    } catch (_e) {}
                  }, 350);
                }
              }

              initWhenReady(40);
            })();
          `,
        }}
      />
    </>
  );
}
