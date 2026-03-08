import type { Locale } from "../../lib/i18n/config";
import { MIN_MESSAGE_LENGTH } from "./contact-page.constants";
import type { ContactPageCopy } from "./contact-page.types";

export function getContactPageCopy(
  locale: Locale,
  isAuditIntent: boolean,
): ContactPageCopy {
  const base = locale === "fr" ? getFrenchCopy() : getEnglishCopy();
  return isAuditIntent ? getAuditCopy(locale, base) : base;
}

function getFrenchCopy(): ContactPageCopy {
  return {
    kicker: "Contact",
    heading: "Parlons de vos données, de vos priorités et de votre ROI.",
    intro:
      "Décrivez votre contexte. Nous revenons avec une base claire pour décider et un prochain pas concret.",
    promiseTitle: "Ce que vous recevez",
    promiseItems: [
      "Réponse qualifiée sous 48h ouvrées.",
      "Orientation claire : diagnostic ROI ou pilote ROI.",
      "Plan de démarrage adapté à vos contraintes terrain.",
    ],
    pilotHint: "Déjà prêt pour un pilote orienté ROI ?",
    pilotCta: "Demander un pilote ROI Praedixa",
    pilotMeta: "Démarrage en lecture seule via exports/API.",
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
    heading: "Let us look at your data, priorities, and ROI.",
    intro:
      "Share your context. We reply with a clear first reading of your data and a practical next step.",
    promiseTitle: "What you get",
    promiseItems: [
      "Qualified response within 48 business hours.",
      "Clear orientation: ROI diagnostic or ROI pilot.",
      "Start plan adapted to your field constraints.",
    ],
    pilotHint: "Already ready for a structured pilot?",
    pilotCta: "Apply for the Praedixa Signature pilot",
    pilotMeta: "Read-only kickoff via exports/APIs.",
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

function getAuditCopy(
  locale: Locale,
  base: ContactPageCopy,
): ContactPageCopy {
  if (locale === "fr") {
    return {
      ...base,
      kicker: "Diagnostic ROI",
      heading: "Obtenir le diagnostic ROI gratuit.",
      intro:
        "Décrivez votre contexte. Nous revenons avec une première base claire de vos données et un cadrage concret.",
      promiseItems: [
        "Diagnostic ROI en lecture seule sur vos données.",
        "Synthèse simple: pertes, priorités, gains potentiels.",
        "Proposition de cadrage 30 min si pertinent.",
      ],
      formTitle: "Obtenir le diagnostic",
    };
  }

  return {
    ...base,
    kicker: "ROI diagnostic",
    heading: "Get the free ROI diagnostic.",
    intro:
      "Share your context. We reply with a clear first reading of your data and a concrete framing.",
    promiseItems: [
      "Read-only ROI diagnostic on your data.",
      "Simple synthesis: losses, priorities, potential gains.",
      "30-min framing proposal if relevant.",
    ],
    formTitle: "Get the diagnostic",
  };
}
