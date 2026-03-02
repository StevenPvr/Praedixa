"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle,
  PaperPlaneRight,
  Sparkle,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { ScopingCallRequestPanel } from "../shared/ScopingCallRequestPanel";

type RequestType =
  | "founding_pilot"
  | "product_demo"
  | "partnership"
  | "press_other";

interface ContactFormData {
  locale: Locale;
  requestType: RequestType;
  companyName: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  consent: boolean;
  website: string;
  captchaAnswer: string;
  challengeToken: string;
}

interface ContactChallenge {
  captchaA: number;
  captchaB: number;
  challengeToken: string;
}

const REQUEST_TYPES: { value: RequestType; fr: string; en: string }[] = [
  {
    value: "founding_pilot",
    fr: "Pilote Workforce & ProofOps",
    en: "Workforce & ProofOps pilot",
  },
  { value: "product_demo", fr: "Démonstration produit", en: "Product demo" },
  { value: "partnership", fr: "Partenariat", en: "Partnership" },
  { value: "press_other", fr: "Presse / Autre", en: "Press / Other" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE_LENGTH = 30;

type FieldErrors = Partial<
  Record<"companyName" | "email" | "message" | "captchaAnswer" | "consent", string>
>;

export function ContactPageClient({ locale }: { locale: Locale }) {
  const isFr = locale === "fr";
  const searchParams = useSearchParams();
  const isAuditIntent = searchParams.get("intent") === "audit";
  const [captcha, setCaptcha] = useState<ContactChallenge | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(true);

  const [form, setForm] = useState<ContactFormData>({
    locale,
    requestType: "founding_pilot",
    companyName: "",
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    phone: "",
    subject: isAuditIntent
      ? isFr
        ? "Audit historique (gratuit)"
        : "Free historical audit"
      : "",
    message: "",
    consent: false,
    website: "",
    captchaAnswer: "",
    challengeToken: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const update = useCallback((key: keyof ContactFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete (next as Record<string, string>)[key];
      return next;
    });
  }, []);

  const copy = useMemo(() => {
    const base = isFr
      ? {
          kicker: "Contact",
          heading: "Parlons de votre contexte opérationnel.",
          intro:
            "Décrivez vos arbitrages critiques. Nous revenons avec un cadrage actionnable et un prochain pas clair.",
          promiseTitle: "Ce que vous recevez",
          promiseItems: [
            "Réponse qualifiée sous 48h ouvrées.",
            "Orientation claire : pilote Signature ou mode forecasting-only.",
            "Plan de démarrage adapté à vos contraintes terrain.",
          ],
          pilotHint: "Déjà prêt pour un pilote structuré ?",
          pilotCta: "Demander un pilote Workforce & ProofOps",
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
            "Ex : nombre de sites, contraintes, outil WFM/ERP, horizon, arbitrages (coût/service/pénalités).",
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
        }
      : {
          kicker: "Contact",
          heading: "Let us review your operational context.",
          intro:
            "Share your critical trade-offs. We reply with an actionable framing and a clear next step.",
          promiseTitle: "What you get",
          promiseItems: [
            "Qualified response within 48 business hours.",
            "Clear orientation: Signature pilot or forecasting-only mode.",
            "Start plan adapted to your field constraints.",
          ],
          pilotHint: "Already ready for a structured pilot?",
          pilotCta: "Request a Workforce & ProofOps pilot",
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
            "Example: site count, constraints, WFM/ERP stack, horizon, trade-offs (cost/service/penalties).",
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

    if (!isAuditIntent) return base;

    return isFr
      ? {
          ...base,
          kicker: "Audit historique",
          heading: "Obtenir l’audit historique (gratuit).",
          intro:
            "Décrivez votre contexte. Nous revenons avec un audit historique (lecture seule) et un cadrage concret.",
          promiseItems: [
            "Audit historique (lecture seule) sur vos données.",
            "Comparatif BAU vs recommandé (format proof pack).",
            "Proposition de cadrage 30 min si pertinent.",
          ],
          formTitle: "Demander l’audit",
        }
      : {
          ...base,
          kicker: "Historical audit",
          heading: "Get the free historical audit.",
          intro:
            "Share your context. We reply with a read-only historical audit and a concrete framing.",
          promiseItems: [
            "Read-only historical audit on your data.",
            "BAU vs recommended comparison (proof pack format).",
            "30-min framing proposal if relevant.",
          ],
          formTitle: "Request the audit",
        };
  }, [isAuditIntent, isFr]);

  const loadCaptchaChallenge = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const response = await fetch("/api/contact/challenge", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as Partial<ContactChallenge> & {
        error?: string;
      };
      if (
        !response.ok ||
        typeof payload.captchaA !== "number" ||
        typeof payload.captchaB !== "number" ||
        typeof payload.challengeToken !== "string"
      ) {
        setCaptcha(null);
        setForm((prev) => ({ ...prev, challengeToken: "" }));
        return;
      }

      const nextCaptcha: ContactChallenge = {
        captchaA: payload.captchaA,
        captchaB: payload.captchaB,
        challengeToken: payload.challengeToken,
      };
      setCaptcha(nextCaptcha);
      setForm((prev) => ({
        ...prev,
        captchaAnswer: "",
        challengeToken: nextCaptcha.challengeToken,
      }));
    } catch {
      setCaptcha(null);
      setForm((prev) => ({ ...prev, challengeToken: "" }));
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCaptchaChallenge();
  }, [loadCaptchaChallenge]);

  const validate = useCallback(
    (next: ContactFormData): FieldErrors => {
      const errors: FieldErrors = {};

      if (!next.companyName.trim()) {
        errors.companyName = copy.requiredCompany;
      }

      const email = next.email.trim();
      if (!email) {
        errors.email = copy.requiredEmail;
      } else if (!EMAIL_REGEX.test(email)) {
        errors.email = copy.invalidEmail;
      }

      if (next.message.trim().length < MIN_MESSAGE_LENGTH) {
        errors.message = copy.requiredMessage;
      }

      if (!next.challengeToken || captchaLoading || !captcha) {
        errors.captchaAnswer = copy.challengeUnavailable;
      } else if (!next.captchaAnswer.trim()) {
        errors.captchaAnswer = copy.requiredCaptcha;
      }

      if (!next.consent) {
        errors.consent = copy.requiredConsent;
      }

      return errors;
    },
    [captcha, captchaLoading, copy],
  );

  const focusFirstError = useCallback((errors: FieldErrors) => {
    const order: (keyof FieldErrors)[] = [
      "companyName",
      "email",
      "message",
      "captchaAnswer",
      "consent",
    ];

    const idByKey: Record<string, string> = {
      companyName: "contact-companyName",
      email: "contact-email",
      message: "contact-message",
      captchaAnswer: "contact-captcha",
      consent: "contact-consent",
    };

    for (const key of order) {
      if (!errors[key]) continue;
      const id = idByKey[key];
      if (!id) return;
      const node = document.getElementById(id);
      if (node && "focus" in node) {
        (node as HTMLElement).focus();
      }
      return;
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const errors = validate(form);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setErrorMsg(copy.fixErrors);
        setStatus("error");
        focusFirstError(errors);
        return;
      }

      setStatus("submitting");
      setErrorMsg("");

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            captchaAnswer: Number(form.captchaAnswer),
          }),
        });

        const data = (await res.json()) as { success?: boolean; error?: string };

        if (!res.ok || data.error) {
          setErrorMsg(data.error ?? copy.unknownError);
          setStatus("error");
          if (data.error === "Test anti-spam invalide.") {
            void loadCaptchaChallenge();
          }
          return;
        }

        setStatus("success");
      } catch {
        setErrorMsg(copy.networkError);
        setStatus("error");
      }
    },
    [
      copy.fixErrors,
      copy.challengeUnavailable,
      copy.networkError,
      copy.unknownError,
      focusFirstError,
      form,
      loadCaptchaChallenge,
      validate,
    ],
  );

  const pilotHref = getLocalizedPath(locale, "pilot");
  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const rootHref = `/${locale}`;

  const fieldBaseClass =
    "w-full rounded-xl border bg-white/95 px-3 py-2.5 text-sm text-ink transition-all duration-200 [transition-timing-function:var(--ease-snappy)] placeholder:text-neutral-400 focus:border-brass focus:ring-1 focus:ring-brass";
  const fieldClass = (hasError?: boolean) =>
    `${fieldBaseClass} ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-200"
        : "border-neutral-300/90"
    }`;
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";
  const errorClass = "mt-1 text-xs text-red-700";
  const isSubmitDisabled =
    status === "submitting" ||
    captchaLoading ||
    !captcha ||
    !form.challengeToken ||
    !form.companyName.trim() ||
    !form.email.trim() ||
    form.message.trim().length < MIN_MESSAGE_LENGTH ||
    !form.consent ||
    !form.captchaAnswer.trim();

  if (status === "success") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(165deg,rgba(244,231,198,0.62)_0%,rgba(252,248,238,0.9)_72%,rgba(255,255,255,0.95)_100%)] p-8 text-center shadow-[0_22px_46px_-38px_rgba(32,24,4,0.45),inset_0_1px_0_rgba(255,255,255,0.82)]">
            <CheckCircle size={54} weight="fill" className="mx-auto text-amber-700" />
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink md:text-4xl">
              {copy.successTitle}
            </h1>
            <p className="mx-auto mt-3 max-w-[54ch] text-base leading-relaxed text-neutral-700">
              {copy.successBody}
            </p>
          </div>

          <ScopingCallRequestPanel
            locale={locale}
            defaultCompanyName={form.companyName}
            defaultEmail={form.email}
            source="contact_success"
          />

          <div className="text-center">
            <Link
              href={rootHref}
              className="inline-flex items-center gap-2 rounded-xl border border-brass-300 bg-white/80 px-4 py-2.5 text-sm font-semibold text-brass-800 no-underline transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:border-brass-400 hover:bg-white active:-translate-y-[1px] active:scale-[0.99]"
            >
              <ArrowLeft size={16} />
              {copy.successCta}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="grid grid-cols-1 gap-7 md:grid-cols-[0.74fr_1.26fr] md:gap-10">
        <aside className="space-y-6 md:pt-2">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.11em] text-brass-700">
              <Sparkle size={14} weight="fill" />
              {copy.kicker}
            </span>
            <h1 className="mt-4 max-w-[18ch] text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
              {copy.heading}
            </h1>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-neutral-600">
              {copy.intro}
            </p>
          </div>

          <section className="rounded-[1.7rem] border border-amber-200/80 bg-amber-50/75 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-amber-800">
              {copy.promiseTitle}
            </h2>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              {copy.promiseItems.map((item) => (
                <li key={item} className="m-0 flex items-start gap-2.5 text-sm text-neutral-700">
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[1.7rem] border border-neutral-200/80 bg-white/90 p-5">
            <p className="text-sm text-neutral-600">{copy.pilotHint}</p>
            <Link
              href={pilotHref}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.99]"
            >
              {copy.pilotCta}
              <ArrowUpRight size={16} weight="bold" />
            </Link>
            <p className="mt-2 text-xs text-neutral-500">{copy.pilotMeta}</p>
          </section>
        </aside>

        <section className="rounded-[2rem] border border-neutral-200/80 bg-white/95 p-6 shadow-[0_22px_46px_-40px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.85)] md:p-8">
          <header className="border-b border-neutral-200/80 pb-5">
            <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              {copy.formTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {copy.formSubtitle}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className="sr-only"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <div>
              <label htmlFor="contact-companyName" className={labelClass}>
                {copy.company} *
              </label>
              <input
                id="contact-companyName"
                type="text"
                required
                maxLength={100}
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                className={fieldClass(!!fieldErrors.companyName)}
                autoComplete="organization"
                aria-invalid={fieldErrors.companyName ? "true" : "false"}
                aria-describedby={
                  fieldErrors.companyName ? "contact-companyName-error" : undefined
                }
              />
              {fieldErrors.companyName ? (
                <p id="contact-companyName-error" className={errorClass}>
                  {fieldErrors.companyName}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-email" className={labelClass}>
                  {copy.email} *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder={isFr ? "vous@entreprise.com" : "you@company.com"}
                  className={fieldClass(!!fieldErrors.email)}
                  autoComplete="email"
                  aria-invalid={fieldErrors.email ? "true" : "false"}
                  aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
                />
                {fieldErrors.email ? (
                  <p id="contact-email-error" className={errorClass}>
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="contact-phone" className={labelClass}>
                  {copy.phone}
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className={fieldClass(false)}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-message" className={labelClass}>
                {copy.message} *{" "}
                <span className="font-normal text-neutral-500">({copy.messageHint})</span>
              </label>
              <textarea
                id="contact-message"
                required
                rows={6}
                maxLength={800}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder={copy.messagePlaceholder}
                className={`${fieldClass(!!fieldErrors.message)} resize-y`}
                aria-invalid={fieldErrors.message ? "true" : "false"}
                aria-describedby={
                  fieldErrors.message ? "contact-message-error" : undefined
                }
              />
              {fieldErrors.message ? (
                <p id="contact-message-error" className={errorClass}>
                  {fieldErrors.message}
                </p>
              ) : null}
            </div>

            <details className="rounded-2xl border border-neutral-200/80 bg-white/80 p-4">
              <summary className="cursor-pointer select-none text-sm font-semibold text-ink">
                {copy.optionalDetails}
              </summary>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="contact-requestType" className={labelClass}>
                    {copy.requestType}
                  </label>
                  <select
                    id="contact-requestType"
                    value={form.requestType}
                    onChange={(e) => update("requestType", e.target.value)}
                    className={fieldClass(false)}
                  >
                    {REQUEST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {isFr ? t.fr : t.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-firstName" className={labelClass}>
                      {copy.firstName}
                    </label>
                    <input
                      id="contact-firstName"
                      type="text"
                      maxLength={80}
                      value={form.firstName}
                      onChange={(e) => update("firstName", e.target.value)}
                      className={fieldClass(false)}
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-lastName" className={labelClass}>
                      {copy.lastName}
                    </label>
                    <input
                      id="contact-lastName"
                      type="text"
                      maxLength={80}
                      value={form.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
                      className={fieldClass(false)}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-role" className={labelClass}>
                      {copy.role}
                    </label>
                    <input
                      id="contact-role"
                      type="text"
                      maxLength={80}
                      value={form.role}
                      onChange={(e) => update("role", e.target.value)}
                      className={fieldClass(false)}
                      autoComplete="organization-title"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className={labelClass}>
                      {copy.subject}
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      maxLength={120}
                      value={form.subject}
                      onChange={(e) => update("subject", e.target.value)}
                      className={fieldClass(false)}
                    />
                  </div>
                </div>
              </div>
            </details>

            <div>
              <label htmlFor="contact-captcha" className={labelClass}>
                {copy.antiSpam}
                {captcha ? `: ${captcha.captchaA} + ${captcha.captchaB} = ?` : ""}
              </label>
              {captchaLoading ? (
                <p className="text-sm text-neutral-500">{copy.challengeLoading}</p>
              ) : captcha ? (
                <input
                  id="contact-captcha"
                  type="number"
                  required
                  value={form.captchaAnswer}
                  onChange={(e) => update("captchaAnswer", e.target.value)}
                  className={`${fieldClass(!!fieldErrors.captchaAnswer)} w-28`}
                  aria-invalid={fieldErrors.captchaAnswer ? "true" : "false"}
                  aria-describedby={
                    fieldErrors.captchaAnswer ? "contact-captcha-error" : undefined
                  }
                />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-red-700">{copy.challengeUnavailable}</p>
                  <button
                    type="button"
                    onClick={() => void loadCaptchaChallenge()}
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50"
                  >
                    {copy.challengeRetry}
                  </button>
                </div>
              )}
              {fieldErrors.captchaAnswer ? (
                <p id="contact-captcha-error" className={errorClass}>
                  {fieldErrors.captchaAnswer}
                </p>
              ) : null}
            </div>

            <div className="flex items-start gap-2.5">
              <input
                id="contact-consent"
                type="checkbox"
                checked={form.consent}
                onChange={(e) => update("consent", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-brass accent-brass"
                aria-invalid={fieldErrors.consent ? "true" : "false"}
                aria-describedby={fieldErrors.consent ? "contact-consent-error" : undefined}
              />
              <label
                htmlFor="contact-consent"
                className="text-sm leading-relaxed text-neutral-600"
              >
                {copy.consentPrefix}
                <Link
                  href={termsHref}
                  className="text-brass-700 no-underline hover:text-brass-800"
                >
                  {copy.termsLabel}
                </Link>
                {copy.consentJoin}
                <Link
                  href={privacyHref}
                  className="text-brass-700 no-underline hover:text-brass-800"
                >
                  {copy.privacyLabel}
                </Link>
                .
              </label>
            </div>
            {fieldErrors.consent ? (
              <p id="contact-consent-error" className={errorClass}>
                {fieldErrors.consent}
              </p>
            ) : null}

            {status === "error" && errorMsg ? (
              <div
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                aria-live="polite"
              >
                <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="btn-primary-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:-translate-y-[1px] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting" ? (
                <>
                  <SpinnerGap size={16} className="animate-spin" />
                  {copy.sending}
                </>
              ) : (
                <>
                  <PaperPlaneRight size={16} weight="bold" />
                  {copy.send}
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
