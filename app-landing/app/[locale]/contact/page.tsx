"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { PraedixaLogo } from "../../../components/logo/PraedixaLogo";
import { ArrowRightIcon, CheckIcon } from "../../../components/icons";
import { siteConfig } from "../../../lib/config/site";
import type { Locale } from "../../../lib/i18n/config";

const MAX_SUBJECT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 800;
const MIN_MESSAGE_LENGTH = 30;

const contactDict = {
  fr: {
    pill: "Échange prioritaire",
    title: "Contactez l'équipe Praedixa",
    subtitle:
      "Partagez votre contexte opérationnel. Nous revenons vers vous avec une réponse structurée sous 24h ouvrées.",
    valuePoints: [
      "Message transmis directement à l'équipe fondatrice",
      "Réponse qualifiée orientée COO / Finance",
      "Aucun démarchage automatisé",
    ],
    time: "Temps estimé",
    timeValue: "2 à 3 minutes",
    fieldsets: { org: "Organisation", contact: "Contact", message: "Message" },
    fields: {
      companyName: { label: "Entreprise *", ph: "Ex : Groupe Atlas" },
      firstName: { label: "Prénom *" },
      lastName: { label: "Nom *" },
      role: { label: "Fonction (optionnel)", ph: "Ex : COO" },
      email: { label: "Email professionnel *", ph: "vous@entreprise.com" },
      phone: { label: "Téléphone (optionnel)", ph: "06 00 00 00 00" },
      subject: {
        label: "Objet *",
        ph: "Ex : Diagnostic couverture multi-sites",
      },
      message: {
        label: "Votre message *",
        ph: "Décrivez votre situation, vos contraintes et ce que vous souhaitez obtenir.",
      },
      spam: { label: "Anti-spam *" },
    },
    spamHelp: (a: number, b: number) => `Combien font ${a} + ${b} ?`,
    consent: {
      prefix: "J'accepte les ",
      cgu: "CGU",
      mid: " et la ",
      privacy: "politique de confidentialité",
      suffix: ".",
    },
    submit: "Envoyer mon message",
    submitting: "Envoi en cours...",
    success: {
      title: "Message envoyé",
      body: "Nous avons bien reçu votre message. Notre équipe revient vers vous sous 24h ouvrées.",
      back: "Retour au site",
      email: "Vérifier ma boîte email",
    },
    error: "Une erreur est survenue. Veuillez réessayer.",
    back: "Retour au site",
    charCount: (count: number) => `${count}/${MAX_MESSAGE_LENGTH} caractères`,
  },
  en: {
    pill: "Priority contact",
    title: "Contact the Praedixa team",
    subtitle:
      "Share your operational context. We get back to you with a structured response within 24 business hours.",
    valuePoints: [
      "Message sent directly to the founding team",
      "Qualified response focused on COO / Finance",
      "No automated outreach",
    ],
    time: "Estimated time",
    timeValue: "2 to 3 minutes",
    fieldsets: { org: "Organisation", contact: "Contact", message: "Message" },
    fields: {
      companyName: { label: "Company *", ph: "E.g.: Atlas Group" },
      firstName: { label: "First name *" },
      lastName: { label: "Last name *" },
      role: { label: "Role (optional)", ph: "E.g.: COO" },
      email: { label: "Professional email *", ph: "you@company.com" },
      phone: { label: "Phone (optional)", ph: "+33 6 00 00 00 00" },
      subject: {
        label: "Subject *",
        ph: "E.g.: Multi-site coverage diagnostic",
      },
      message: {
        label: "Your message *",
        ph: "Describe your situation, constraints, and what you want to achieve.",
      },
      spam: { label: "Anti-spam *" },
    },
    spamHelp: (a: number, b: number) => `How much is ${a} + ${b}?`,
    consent: {
      prefix: "I accept the ",
      cgu: "Terms",
      mid: " and the ",
      privacy: "privacy policy",
      suffix: ".",
    },
    submit: "Send my message",
    submitting: "Sending...",
    success: {
      title: "Message sent",
      body: "We received your message. Our team will get back to you within 24 business hours.",
      back: "Back to site",
      email: "Check my inbox",
    },
    error: "Something went wrong. Please try again.",
    back: "Back to site",
    charCount: (count: number) => `${count}/${MAX_MESSAGE_LENGTH} characters`,
  },
} as const;

interface ContactFormData {
  companyName: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  captchaAnswer: string;
  website: string;
  consent: boolean;
}

const INITIAL: ContactFormData = {
  companyName: "",
  firstName: "",
  lastName: "",
  role: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  captchaAnswer: "",
  website: "",
  consent: false,
};

const DEFAULT_CAPTCHA = { a: 5, b: 2 };

export default function ContactPage() {
  const params = useParams();
  const locale: Locale = params.locale === "en" ? "en" : "fr";
  const t = contactDict[locale];

  const [formData, setFormData] = useState<ContactFormData>(INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formStartedAt, setFormStartedAt] = useState(0);
  const [captcha, setCaptcha] = useState(DEFAULT_CAPTCHA);

  useEffect(() => {
    setFormStartedAt(Date.now());
    setCaptcha({
      a: Math.floor(Math.random() * 8) + 2,
      b: Math.floor(Math.random() * 8) + 2,
    });
  }, []);

  const isComplete =
    formData.companyName.trim().length > 1 &&
    formData.firstName.trim().length > 1 &&
    formData.lastName.trim().length > 1 &&
    formData.email.trim().length > 3 &&
    formData.subject.trim().length > 2 &&
    formData.message.trim().length >= MIN_MESSAGE_LENGTH &&
    formData.message.trim().length <= MAX_MESSAGE_LENGTH &&
    formData.captchaAnswer.trim().length > 0 &&
    formStartedAt > 0 &&
    formData.consent;

  function setField<K extends keyof ContactFormData>(
    key: K,
    value: ContactFormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          captchaA: captcha.a,
          captchaB: captcha.b,
          formStartedAt,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || t.error);
      }

      setIsSuccess(true);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : t.error;
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-cream">
        <main className="section-shell flex min-h-screen items-center justify-center py-20">
          <motion.section
            className="premium-card w-full max-w-2xl p-10 text-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
              <CheckIcon className="h-8 w-8 text-amber-700" />
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-tight text-charcoal">
              {t.success.title}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
              {t.success.body}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={`/${locale}`} className="ghost-cta">
                {t.success.back}
              </Link>
              <a href={`mailto:${formData.email}`} className="gold-cta">
                {t.success.email}
              </a>
            </div>
          </motion.section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <nav className="fixed left-0 right-0 top-0 z-50">
        <div className="section-shell mt-4">
          <div className="flex items-center justify-between rounded-2xl border border-neutral-300 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)] backdrop-blur md:px-6">
            <Link
              href={`/${locale}`}
              className="group flex items-center gap-2.5"
            >
              <PraedixaLogo
                variant="geometric"
                size={30}
                color="oklch(0.2 0.01 65)"
                strokeWidth={1.1}
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-serif text-xl text-charcoal">Praedixa</span>
            </Link>
            <Link
              href={`/${locale}`}
              className="text-sm font-semibold text-charcoal/70 transition hover:text-charcoal"
            >
              {t.back}
            </Link>
          </div>
        </div>
      </nav>

      <main className="section-shell pb-20 pt-32 md:pt-36">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <motion.aside
            className="premium-card p-8"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="premium-pill">{t.pill}</p>
            <h1 className="mt-5 font-serif text-5xl leading-tight text-charcoal">
              {t.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-600">
              {t.subtitle}
            </p>

            <ul className="mt-7 space-y-3">
              {t.valuePoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-charcoal/85"
                >
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                {t.time}
              </p>
              <p className="mt-2 text-sm text-charcoal/85">{t.timeValue}</p>
            </div>
          </motion.aside>

          <motion.section
            className="premium-card p-7 md:p-8"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {t.fieldsets.org}
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label={t.fields.companyName.label}
                    value={formData.companyName}
                    onChange={(value) => setField("companyName", value)}
                    placeholder={t.fields.companyName.ph}
                    required
                    maxLength={100}
                  />
                  <Input
                    label={t.fields.role.label}
                    value={formData.role}
                    onChange={(value) => setField("role", value)}
                    placeholder={t.fields.role.ph}
                    maxLength={80}
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {t.fieldsets.contact}
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label={t.fields.firstName.label}
                    value={formData.firstName}
                    onChange={(value) => setField("firstName", value)}
                    required
                    maxLength={80}
                  />
                  <Input
                    label={t.fields.lastName.label}
                    value={formData.lastName}
                    onChange={(value) => setField("lastName", value)}
                    required
                    maxLength={80}
                  />
                  <Input
                    type="email"
                    label={t.fields.email.label}
                    value={formData.email}
                    onChange={(value) => setField("email", value)}
                    placeholder={t.fields.email.ph}
                    required
                    maxLength={254}
                  />
                  <Input
                    label={t.fields.phone.label}
                    value={formData.phone}
                    onChange={(value) => setField("phone", value)}
                    placeholder={t.fields.phone.ph}
                    maxLength={30}
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {t.fieldsets.message}
                </legend>
                <div className="grid gap-4">
                  <Input
                    label={t.fields.subject.label}
                    value={formData.subject}
                    onChange={(value) => setField("subject", value)}
                    placeholder={t.fields.subject.ph}
                    required
                    maxLength={MAX_SUBJECT_LENGTH}
                  />
                  <TextArea
                    label={t.fields.message.label}
                    value={formData.message}
                    onChange={(value) => setField("message", value)}
                    placeholder={t.fields.message.ph}
                    minLength={MIN_MESSAGE_LENGTH}
                    maxLength={MAX_MESSAGE_LENGTH}
                    required
                  />
                  <p className="text-xs text-neutral-500">
                    {t.charCount(formData.message.length)}
                  </p>
                  <Input
                    label={`${t.fields.spam.label} ${t.spamHelp(captcha.a, captcha.b)}`}
                    value={formData.captchaAnswer}
                    onChange={(value) => setField("captchaAnswer", value)}
                    type="number"
                    required
                  />
                </div>
              </fieldset>

              <div
                className="absolute left-[-9999px] top-[-9999px]"
                aria-hidden="true"
              >
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={(event) => setField("website", event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={formData.consent}
                  onChange={(event) =>
                    setField("consent", event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm leading-relaxed text-neutral-600">
                  {t.consent.prefix}
                  <Link
                    href={`/${locale}${siteConfig.routes.cgu}`}
                    target="_blank"
                    className="font-semibold text-amber-700 hover:underline"
                  >
                    {t.consent.cgu}
                  </Link>{" "}
                  {t.consent.mid}
                  <Link
                    href={`/${locale}${siteConfig.routes.confidentialite}`}
                    target="_blank"
                    className="font-semibold text-amber-700 hover:underline"
                  >
                    {t.consent.privacy}
                  </Link>
                  {t.consent.suffix}
                </span>
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!isComplete || isSubmitting}
                className="gold-cta w-full"
              >
                {isSubmitting ? t.submitting : t.submit}
                {!isSubmitting && <ArrowRightIcon className="h-4 w-4" />}
              </button>
            </form>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-charcoal/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-charcoal outline-none ring-0 transition focus:border-amber-400"
        required={required}
        maxLength={maxLength}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-charcoal/80">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={6}
        className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-charcoal outline-none transition focus:border-amber-400"
        required={required}
        minLength={minLength}
        maxLength={maxLength}
      />
    </label>
  );
}
