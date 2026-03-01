"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  { value: "product_demo", fr: "Demonstration produit", en: "Product demo" },
  { value: "partnership", fr: "Partenariat", en: "Partnership" },
  { value: "press_other", fr: "Presse / Autre", en: "Press / Other" },
];

export function ContactPageClient({ locale }: { locale: Locale }) {
  const isFr = locale === "fr";
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
    subject: "",
    message: "",
    consent: false,
    website: "",
    captchaAnswer: "",
    challengeToken: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const update = useCallback((key: keyof ContactFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const copy =
    locale === "fr"
      ? {
          kicker: "Contact",
          heading: "Parlons de votre contexte operationnel.",
          intro:
            "Decrivez vos arbitrages critiques. Nous revenons avec un cadrage actionnable et une proposition de prochain pas.",
          promiseTitle: "Ce que vous recevez",
          promiseItems: [
            "Reponse qualifiee sous 48h ouvrees.",
            "Orientation claire: pilote Signature ou mode forecasting-only.",
            "Plan de demarrage adapte a vos contraintes terrain.",
          ],
          pilotHint: "Vous etes deja pret pour un pilote structure ?",
          pilotCta: "Demander un pilote Workforce & ProofOps",
          pilotMeta: "Demarrage en lecture seule via exports/API.",
          formTitle: "Envoyer une demande",
          formSubtitle:
            "Tous les champs marques d'un asterisque sont requis pour qualifier votre demande.",
          requestType: "Type de demande",
          company: "Entreprise",
          role: "Fonction",
          firstName: "Prenom",
          lastName: "Nom",
          email: "Email",
          phone: "Telephone",
          subject: "Objet",
          message: "Message",
          messageHint: "Minimum 30 caracteres",
          antiSpam: "Anti-spam",
          consentPrefix: "J'accepte les ",
          termsLabel: "CGU",
          consentJoin: " et la ",
          privacyLabel: "politique de confidentialite",
          send: "Envoyer",
          sending: "Envoi en cours...",
          successTitle: "Message envoye",
          successBody: "Nous revenons vers vous sous 48h ouvrees.",
          successCta: "Retour au site",
          unknownError: "Erreur inconnue.",
          networkError: "Erreur reseau. Veuillez reessayer.",
          challengeLoading: "Chargement de la verification anti-spam...",
          challengeUnavailable:
            "Verification anti-spam indisponible. Veuillez recharger le challenge.",
          challengeRetry: "Recharger l'anti-spam",
        }
      : {
          kicker: "Contact",
          heading: "Let us review your operational context.",
          intro:
            "Share your critical trade-offs. We answer with an actionable framing and a concrete next step.",
          promiseTitle: "What you get",
          promiseItems: [
            "Qualified response within 48 business hours.",
            "Clear orientation: Signature pilot or forecasting-only mode.",
            "Start plan adapted to your field constraints.",
          ],
          pilotHint: "Already ready for a structured pilot?",
          pilotCta: "Request a Workforce & ProofOps pilot",
          pilotMeta: "Read-only kickoff via exports/API.",
          formTitle: "Send a request",
          formSubtitle:
            "All fields marked with an asterisk are required to qualify your request.",
          requestType: "Request type",
          company: "Company",
          role: "Role",
          firstName: "First name",
          lastName: "Last name",
          email: "Email",
          phone: "Phone",
          subject: "Subject",
          message: "Message",
          messageHint: "Minimum 30 characters",
          antiSpam: "Anti-spam",
          consentPrefix: "I accept the ",
          termsLabel: "Terms",
          consentJoin: " and the ",
          privacyLabel: "privacy policy",
          send: "Send",
          sending: "Sending...",
          successTitle: "Message sent",
          successBody: "We will get back to you within 48 business hours.",
          successCta: "Back to site",
          unknownError: "Unknown error.",
          networkError: "Network error. Please try again.",
          challengeLoading: "Loading anti-spam verification...",
          challengeUnavailable:
            "Anti-spam verification is unavailable. Please reload the challenge.",
          challengeRetry: "Reload anti-spam",
        };

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("submitting");
      setErrorMsg("");

      if (!form.challengeToken) {
        setErrorMsg(copy.challengeUnavailable);
        setStatus("error");
        return;
      }

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
      copy.challengeUnavailable,
      copy.networkError,
      copy.unknownError,
      form,
      loadCaptchaChallenge,
    ],
  );

  const pilotHref = getLocalizedPath(locale, "pilot");
  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const rootHref = `/${locale}`;

  const fieldClass =
    "w-full rounded-xl border border-neutral-300/90 bg-white/95 px-3 py-2.5 text-sm text-ink outline-none transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] placeholder:text-neutral-400 focus:border-brass focus:ring-1 focus:ring-brass";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  if (status === "success") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
        <div className="rounded-[2rem] border border-brass-200/80 bg-[linear-gradient(165deg,rgba(244,231,198,0.62)_0%,rgba(252,248,238,0.9)_72%,rgba(255,255,255,0.95)_100%)] p-8 text-center shadow-[0_22px_46px_-38px_rgba(32,24,4,0.45),inset_0_1px_0_rgba(255,255,255,0.82)]">
          <CheckCircle size={54} weight="fill" className="mx-auto text-brass-700" />
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            {copy.successTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-[46ch] text-base leading-relaxed text-neutral-700">
            {copy.successBody}
          </p>
          <Link
            href={rootHref}
            className="mt-7 inline-flex items-center gap-2 rounded-xl border border-brass-300 bg-white/80 px-4 py-2.5 text-sm font-semibold text-brass-800 no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-brass-400 hover:bg-white active:-translate-y-[1px] active:scale-[0.99]"
          >
            <ArrowLeft size={16} />
            {copy.successCta}
          </Link>
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

          <section className="rounded-[1.7rem] border border-brass-200/80 bg-brass-50/75 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-brass-800">
              {copy.promiseTitle}
            </h2>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              {copy.promiseItems.map((item) => (
                <li key={item} className="m-0 flex items-start gap-2.5 text-sm text-neutral-700">
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-brass-600"
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
              <label htmlFor="contact-requestType" className={labelClass}>
                {copy.requestType}
              </label>
              <select
                id="contact-requestType"
                value={form.requestType}
                onChange={(e) => update("requestType", e.target.value)}
                className={fieldClass}
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
                  className={fieldClass}
                />
              </div>
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
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-firstName" className={labelClass}>
                  {copy.firstName} *
                </label>
                <input
                  id="contact-firstName"
                  type="text"
                  required
                  maxLength={80}
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="contact-lastName" className={labelClass}>
                  {copy.lastName} *
                </label>
                <input
                  id="contact-lastName"
                  type="text"
                  required
                  maxLength={80}
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className={fieldClass}
                />
              </div>
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
                  className={fieldClass}
                />
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
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-subject" className={labelClass}>
                {copy.subject} *
              </label>
              <input
                id="contact-subject"
                type="text"
                required
                maxLength={120}
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="contact-message" className={labelClass}>
                {copy.message} {"*"}{" "}
                <span className="font-normal text-neutral-500">({copy.messageHint})</span>
              </label>
              <textarea
                id="contact-message"
                required
                rows={6}
                maxLength={800}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                className={`${fieldClass} resize-y`}
              />
            </div>

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
                  className={`${fieldClass} w-28`}
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
            </div>

            <div className="flex items-start gap-2.5">
              <input
                id="contact-consent"
                type="checkbox"
                checked={form.consent}
                onChange={(e) => update("consent", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-brass accent-brass"
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
              disabled={
                status === "submitting" || captchaLoading || !form.challengeToken
              }
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
