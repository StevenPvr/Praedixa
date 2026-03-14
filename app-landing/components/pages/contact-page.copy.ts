import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import type { ContactPageCopy } from "./contact-page.types";

export function getContactPageCopy(
  locale: Locale,
  intent: "deployment" | "historical_proof",
): ContactPageCopy {
  const copy = getValuePropContent(locale).contact;
  const isProofIntent = intent === "historical_proof";

  return {
    kicker: isProofIntent ? copy.proofIntentKicker : copy.scopingIntentKicker,
    heading: isProofIntent
      ? copy.proofIntentHeading
      : copy.scopingIntentHeading,
    intro: isProofIntent ? copy.proofIntentIntro : copy.scopingIntentIntro,
    promiseTitle: copy.promiseTitle,
    promiseItems: isProofIntent
      ? copy.proofIntentPromiseItems
      : copy.scopingIntentPromiseItems,
    reassuranceTitle: copy.reassuranceTitle,
    reassuranceItems: copy.reassuranceItems,
    secondaryPanelTitle: copy.secondaryPanelTitle,
    secondaryPanelBody: copy.secondaryPanelBody,
    secondaryPanelCta: copy.secondaryPanelCta,
    formTitle: copy.formTitle,
    formSubtitle: copy.formSubtitle,
    company: copy.company,
    role: copy.role,
    email: copy.email,
    siteCount: copy.siteCount,
    sector: copy.sector,
    mainTradeOff: copy.mainTradeOff,
    timeline: copy.timeline,
    currentStack: copy.currentStack,
    message: copy.message,
    mainTradeOffPlaceholder: copy.mainTradeOffPlaceholder,
    currentStackPlaceholder: copy.currentStackPlaceholder,
    messagePlaceholder: copy.messagePlaceholder,
    antiSpam: copy.antiSpam,
    consentPrefix: copy.consentPrefix,
    termsLabel: copy.termsLabel,
    consentJoin: copy.consentJoin,
    privacyLabel: copy.privacyLabel,
    send: copy.send,
    sending: copy.sending,
    fixErrors: copy.fixErrors,
    successTitle: copy.successTitle,
    successBody: copy.successBody,
    successCta: copy.successCta,
    unknownError: copy.unknownError,
    networkError: copy.networkError,
    challengeLoading: copy.challengeLoading,
    challengeUnavailable: copy.challengeUnavailable,
    challengeRetry: copy.challengeRetry,
    requiredCompany: copy.requiredCompany,
    requiredRole: copy.requiredRole,
    requiredEmail: copy.requiredEmail,
    invalidEmail: copy.invalidEmail,
    requiredSiteCount: copy.requiredSiteCount,
    requiredSector: copy.requiredSector,
    requiredMainTradeOff: copy.requiredMainTradeOff,
    requiredTimeline: copy.requiredTimeline,
    requiredConsent: copy.requiredConsent,
    requiredCaptcha: copy.requiredCaptcha,
  };
}
