import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import type { ContactPageCopy } from "./contact-page.types";

type ContactIntent = "deployment" | "historical_proof";

type SharedContactCopy = Omit<
  ContactPageCopy,
  "kicker" | "heading" | "intro" | "promiseItems"
>;

const SHARED_CONTACT_COPY_KEYS = [
  "promiseTitle",
  "reassuranceTitle",
  "reassuranceItems",
  "secondaryPanelTitle",
  "secondaryPanelBody",
  "secondaryPanelCta",
  "formTitle",
  "formSubtitle",
  "company",
  "role",
  "email",
  "siteCount",
  "sector",
  "mainTradeOff",
  "timeline",
  "currentStack",
  "message",
  "mainTradeOffPlaceholder",
  "currentStackPlaceholder",
  "messagePlaceholder",
  "antiSpam",
  "consentPrefix",
  "termsLabel",
  "consentJoin",
  "privacyLabel",
  "send",
  "sending",
  "fixErrors",
  "successTitle",
  "successBody",
  "successCta",
  "unknownError",
  "networkError",
  "challengeLoading",
  "challengeUnavailable",
  "challengeRetry",
  "requiredCompany",
  "requiredRole",
  "requiredEmail",
  "invalidEmail",
  "requiredSiteCount",
  "requiredSector",
  "requiredMainTradeOff",
  "requiredTimeline",
  "requiredConsent",
  "requiredCaptcha",
] as const satisfies readonly (keyof SharedContactCopy)[];

function getIntentSpecificCopy(
  copy: ReturnType<typeof getValuePropContent>["contact"],
  intent: ContactIntent,
) {
  const isProofIntent = intent === "historical_proof";

  return {
    kicker: isProofIntent ? copy.proofIntentKicker : copy.scopingIntentKicker,
    heading: isProofIntent
      ? copy.proofIntentHeading
      : copy.scopingIntentHeading,
    intro: isProofIntent ? copy.proofIntentIntro : copy.scopingIntentIntro,
    promiseItems: isProofIntent
      ? copy.proofIntentPromiseItems
      : copy.scopingIntentPromiseItems,
  };
}

function getSharedContactPageCopy(
  copy: ReturnType<typeof getValuePropContent>["contact"],
): SharedContactCopy {
  return Object.fromEntries(
    SHARED_CONTACT_COPY_KEYS.map((key) => [key, copy[key]]),
  ) as SharedContactCopy;
}

export function getContactPageCopy(
  locale: Locale,
  intent: ContactIntent,
): ContactPageCopy {
  const copy = getValuePropContent(locale).contact;

  return {
    ...getIntentSpecificCopy(copy, intent),
    ...getSharedContactPageCopy(copy),
  };
}
