import type { Locale } from "../../lib/i18n/config";
import { MIN_MESSAGE_LENGTH } from "./contact-page.constants";
import type { ContactPageCopy } from "./contact-page.types";

export function getContactPageCopy(
  locale: Locale,
  isProofIntent: boolean,
): ContactPageCopy {
  const base = locale === "fr" ? getFrenchCopy() : getEnglishCopy();
  return isProofIntent ? getProofCopy(locale, base) : base;
}

function getFrenchCopy(): ContactPageCopy {
  return {
    kicker: "Contact",
    heading: "Parlons de vos arbitrages, de votre marge et du prochain pas.",
    intro:
      "Décrivez votre contexte. Nous revenons avec une lecture claire de vos arbitrages multi-sites et un prochain pas concret.",
    promiseTitle: "Ce que vous recevez",
    promiseItems: [
      "Réponse qualifiée sous 48h ouvrées.",
      "Orientation claire : preuve sur historique ou déploiement Praedixa.",
      "Plan de démarrage adapté à vos contraintes terrain.",
    ],
    pilotHint: "Déjà prêt à cadrer le déploiement ?",
    pilotCta: "Parler du déploiement Praedixa",
    pilotMeta: "Onboarding fixe déduit si engagement annuel.",
    formTitle: "Envoyer une demande",
    formSubtitle:
      "Champs requis : entreprise, email, message. Le reste est optionnel.",
    requestType: "Type de demande",
    company: "Entreprise",
    role: "Fonction",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email",
    phone: "Téléphone",
    subject: "Objet",
    message: "Message",
    messageHint: `Minimum ${MIN_MESSAGE_LENGTH} caractères`,
    messagePlaceholder:
      "Ex : nombre de sites, contraintes, outils en place (ERP/CRM/BI), sujets RH/finance/ops, pertes ou gains visés.",
    optionalDetails: "Ajouter des détails (optionnel)",
    antiSpam: "Vérification",
    consentPrefix: "J'accepte les ",
    termsLabel: "CGU",
    consentJoin: " et la ",
    privacyLabel: "politique de confidentialité",
    send: "Envoyer",
    sending: "Envoi en cours…",
    fixErrors: "Vérifiez les champs en erreur, puis réessayez.",
    successTitle: "Message envoyé",
    successBody: "Nous revenons vers vous sous 48h ouvrées.",
    successCta: "Retour au site",
    unknownError: "Erreur inconnue.",
    networkError: "Erreur réseau. Veuillez réessayer.",
    challengeLoading: "Chargement de la vérification anti-spam…",
    challengeUnavailable:
      "Vérification anti-spam indisponible. Veuillez recharger le challenge.",
    challengeRetry: "Recharger la vérification",
    requiredCompany: "Entreprise requise.",
    requiredEmail: "Email requis.",
    invalidEmail: "Adresse email invalide.",
    requiredMessage: `Message requis (min ${MIN_MESSAGE_LENGTH} caractères).`,
    requiredConsent: "Vous devez accepter les conditions.",
    requiredCaptcha: "Veuillez répondre à la vérification.",
  };
}

function getEnglishCopy(): ContactPageCopy {
  return {
    kicker: "Contact",
    heading: "Let us look at your trade-offs, margin, and next step.",
    intro:
      "Share your context. We reply with a clear reading of your multi-site trade-offs and a practical next step.",
    promiseTitle: "What you get",
    promiseItems: [
      "Qualified response within 48 business hours.",
      "Clear orientation: historical proof or Praedixa deployment.",
      "Start plan adapted to your field constraints.",
    ],
    pilotHint: "Already ready to frame deployment?",
    pilotCta: "Discuss Praedixa deployment",
    pilotMeta: "Fixed onboarding credited on annual commitment.",
    formTitle: "Send a request",
    formSubtitle:
      "Required fields: company, email, message. Everything else is optional.",
    requestType: "Request type",
    company: "Company",
    role: "Role",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    phone: "Phone",
    subject: "Subject",
    message: "Message",
    messageHint: `Minimum ${MIN_MESSAGE_LENGTH} characters`,
    messagePlaceholder:
      "Example: site count, constraints, existing tools (ERP/CRM/BI), horizon, trade-offs (cost/service/risk).",
    optionalDetails: "Add details (optional)",
    antiSpam: "Verification",
    consentPrefix: "I accept the ",
    termsLabel: "Terms",
    consentJoin: " and the ",
    privacyLabel: "privacy policy",
    send: "Send",
    sending: "Sending…",
    fixErrors: "Please fix the highlighted fields and try again.",
    successTitle: "Message sent",
    successBody: "We will get back to you within 48 business hours.",
    successCta: "Back to site",
    unknownError: "Unknown error.",
    networkError: "Network error. Please try again.",
    challengeLoading: "Loading anti-spam verification…",
    challengeUnavailable:
      "Anti-spam verification is unavailable. Please reload the challenge.",
    challengeRetry: "Reload verification",
    requiredCompany: "Company is required.",
    requiredEmail: "Email is required.",
    invalidEmail: "Invalid email address.",
    requiredMessage: `Message is required (min ${MIN_MESSAGE_LENGTH} characters).`,
    requiredConsent: "You must accept the terms.",
    requiredCaptcha: "Please answer the verification.",
  };
}

function getProofCopy(locale: Locale, base: ContactPageCopy): ContactPageCopy {
  if (locale === "fr") {
    return {
      ...base,
      kicker: "Preuve sur historique",
      heading: "Demander la preuve sur historique.",
      intro:
        "Décrivez votre contexte. Nous revenons avec une première lecture claire de vos arbitrages et du potentiel objectivable sur vos données.",
      promiseItems: [
        "Preuve sur historique en lecture seule sur vos données.",
        "Synthèse simple: arbitrages prioritaires, potentiel de gain, prochain pas recommandé.",
        "Proposition de cadrage 30 min si pertinent.",
      ],
      formTitle: "Demander la preuve",
    };
  }

  return {
    ...base,
    kicker: "Historical proof",
    heading: "Request the historical proof.",
    intro:
      "Share your context. We reply with a clear reading of your trade-offs and the objective potential in your data.",
    promiseItems: [
      "Read-only historical proof on your data.",
      "Simple synthesis: priority trade-offs, potential gains, recommended next step.",
      "30-min framing proposal if relevant.",
    ],
    formTitle: "Request the proof",
  };
}
