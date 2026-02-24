"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PaperPlaneRight,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  ArrowLeft,
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
  captchaA: number;
  captchaB: number;
  captchaAnswer: string;
  formStartedAt: number;
}

const REQUEST_TYPES: { value: RequestType; fr: string; en: string }[] = [
  { value: "founding_pilot", fr: "Pilote prévision effectifs", en: "Workforce forecasting pilot" },
  { value: "product_demo", fr: "Démonstration produit", en: "Product demo" },
  { value: "partnership", fr: "Partenariat", en: "Partnership" },
  { value: "press_other", fr: "Presse / Autre", en: "Press / Other" },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function randomInt(max: number): number {
  return Math.floor(Math.random() * (max + 1));
}

export function ContactPageClient({ locale }: { locale: Locale }) {
  const isFr = locale === "fr";
  const formStartedAtRef = useRef(Date.now());
  const [captchaA] = useState(() => randomInt(12));
  const [captchaB] = useState(() => randomInt(12));

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
    captchaA,
    captchaB,
    captchaAnswer: "",
    formStartedAt: formStartedAtRef.current,
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const update = useCallback(
    (key: keyof ContactFormData, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("submitting");
      setErrorMsg("");

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            captchaAnswer: Number(form.captchaAnswer),
            formStartedAt: formStartedAtRef.current,
          }),
        });

        const data = (await res.json()) as { success?: boolean; error?: string };

        if (!res.ok || data.error) {
          setErrorMsg(data.error ?? (isFr ? "Erreur inconnue." : "Unknown error."));
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch {
        setErrorMsg(
          isFr ? "Erreur réseau. Veuillez réessayer." : "Network error. Please try again.",
        );
        setStatus("error");
      }
    },
    [form, isFr],
  );

  const pilotHref = getLocalizedPath(locale, "pilot");
  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mx-auto max-w-lg px-4 py-20 text-center"
      >
        <CheckCircle size={48} weight="fill" className="mx-auto text-brass" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
          {isFr ? "Message envoyé" : "Message sent"}
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          {isFr
            ? "Nous revenons vers vous sous 48h ouvrées."
            : "We will get back to you within 48 business hours."}
        </p>
        <Link
          href={`/${locale}`}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brass no-underline hover:text-brass-600"
        >
          <ArrowLeft size={16} />
          {isFr ? "Retour au site" : "Back to site"}
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.5fr] md:py-24 lg:px-8">
      <div>
        <span className="inline-block text-xs font-semibold uppercase tracking-[0.08em] text-brass">
          {isFr ? "Contact" : "Contact"}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {isFr
            ? "Contactez l'équipe Praedixa"
            : "Contact the Praedixa team"}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
          {isFr
            ? "Décrivez votre contexte. Nous cadrons un premier échange adapté à vos enjeux."
            : "Describe your context. We will frame a first exchange tailored to your challenges."}
        </p>
        <div className="mt-6 space-y-2">
          <p className="text-xs text-neutral-400">
            {isFr ? "Vous souhaitez postuler au pilote ?" : "Looking for the pilot program?"}
          </p>
          <Link
            href={pilotHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brass no-underline hover:text-brass-600"
          >
            {isFr ? "Demander un pilote prévision effectifs" : "Request a workforce forecasting pilot"}
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
          <label htmlFor="contact-requestType" className="mb-1.5 block text-sm font-medium text-ink">
            {isFr ? "Type de demande" : "Request type"}
          </label>
          <select
            id="contact-requestType"
            value={form.requestType}
            onChange={(e) => update("requestType", e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
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
            <label htmlFor="contact-companyName" className="mb-1.5 block text-sm font-medium text-ink">
              {isFr ? "Entreprise" : "Company"} *
            </label>
            <input
              id="contact-companyName"
              type="text"
              required
              maxLength={100}
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
            />
          </div>
          <div>
            <label htmlFor="contact-role" className="mb-1.5 block text-sm font-medium text-ink">
              {isFr ? "Fonction" : "Role"}
            </label>
            <input
              id="contact-role"
              type="text"
              maxLength={80}
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-firstName" className="mb-1.5 block text-sm font-medium text-ink">
              {isFr ? "Prénom" : "First name"} *
            </label>
            <input
              id="contact-firstName"
              type="text"
              required
              maxLength={80}
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
            />
          </div>
          <div>
            <label htmlFor="contact-lastName" className="mb-1.5 block text-sm font-medium text-ink">
              {isFr ? "Nom" : "Last name"} *
            </label>
            <input
              id="contact-lastName"
              type="text"
              required
              maxLength={80}
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-ink">
              {isFr ? "Email" : "Email"} *
            </label>
            <input
              id="contact-email"
              type="email"
              required
              maxLength={254}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder={isFr ? "vous@entreprise.com" : "you@company.com"}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-neutral-300 focus:border-brass focus:ring-1 focus:ring-brass"
            />
          </div>
          <div>
            <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-medium text-ink">
              {isFr ? "Téléphone" : "Phone"}
            </label>
            <input
              id="contact-phone"
              type="tel"
              maxLength={30}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-ink">
            {isFr ? "Objet" : "Subject"} *
          </label>
          <input
            id="contact-subject"
            type="text"
            required
            maxLength={120}
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-ink">
            {isFr ? "Message" : "Message"} *{" "}
            <span className="font-normal text-neutral-400">(min 30 {isFr ? "caractères" : "characters"})</span>
          </label>
          <textarea
            id="contact-message"
            required
            rows={5}
            maxLength={800}
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
          />
        </div>

        <div>
          <label htmlFor="contact-captcha" className="mb-1.5 block text-sm font-medium text-ink">
            {isFr ? "Anti-spam" : "Anti-spam"}: {captchaA} + {captchaB} = ?
          </label>
          <input
            id="contact-captcha"
            type="number"
            required
            value={form.captchaAnswer}
            onChange={(e) => update("captchaAnswer", e.target.value)}
            className="w-24 rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass"
          />
        </div>

        <div className="flex items-start gap-2.5">
          <input
            id="contact-consent"
            type="checkbox"
            checked={form.consent}
            onChange={(e) => update("consent", e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-brass accent-brass"
          />
          <label htmlFor="contact-consent" className="text-sm text-neutral-600">
            {isFr ? "J'accepte les " : "I accept the "}
            <Link href={termsHref} className="text-brass hover:text-brass-600">
              {isFr ? "CGU" : "Terms"}
            </Link>
            {isFr ? " et la " : " and the "}
            <Link href={privacyHref} className="text-brass hover:text-brass-600">
              {isFr ? "politique de confidentialité" : "privacy policy"}
            </Link>
            .
          </label>
        </div>

        {status === "error" && errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-primary-gradient inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? (
            <>
              <SpinnerGap size={16} className="animate-spin" />
              {isFr ? "Envoi en cours..." : "Sending..."}
            </>
          ) : (
            <>
              <PaperPlaneRight size={16} weight="bold" />
              {isFr ? "Envoyer" : "Send"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
