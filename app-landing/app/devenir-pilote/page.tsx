"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PraedixaLogo } from "../../components/logo/PraedixaLogo";
import { ArrowRightIcon, CheckIcon } from "../../components/icons";

interface FormData {
  companyName: string;
  sector: string;
  employeeRange: string;
  siteCount: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  timeline: string;
  currentStack: string;
  painPoint: string;
  website: string; // honeypot
  consent: boolean;
}

const SECTORS = [
  "Logistique",
  "Transport",
  "Santé",
  "Industrie",
  "Distribution",
  "Agroalimentaire",
  "BTP",
  "Services",
  "Autre",
] as const;

const EMPLOYEE_RANGES = [
  "50-100",
  "100-250",
  "250-500",
  "500-1 000",
  "1 000+",
] as const;

const SITE_COUNTS = ["1-3", "4-10", "11-30", "31+"] as const;

const ROLES = [
  "COO / Direction des opérations",
  "Responsable des opérations",
  "Direction de site",
  "DAF / Direction financière",
  "Direction générale",
  "Autre",
] as const;

const TIMELINES = ["0-3 mois", "3-6 mois", "6-12 mois", "Exploration"] as const;

const VALUE_POINTS = [
  "Qualification orientée enjeux COO et finance",
  "Processus structuré en moins de 5 minutes",
  "Réponse sous 24h ouvrées par l'équipe fondatrice",
] as const;

export default function DevenirPilotePage() {
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    sector: "",
    employeeRange: "",
    siteCount: "",
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    phone: "",
    timeline: "",
    currentStack: "",
    painPoint: "",
    website: "",
    consent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = useMemo(() => {
    const painPointReady = formData.painPoint.trim().length >= 20;

    return (
      formData.companyName.trim().length > 1 &&
      formData.sector !== "" &&
      formData.employeeRange !== "" &&
      formData.siteCount !== "" &&
      formData.firstName.trim().length > 1 &&
      formData.lastName.trim().length > 1 &&
      formData.role !== "" &&
      formData.email.trim().length > 3 &&
      formData.timeline !== "" &&
      painPointReady &&
      formData.consent
    );
  }, [formData]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/pilot-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Erreur lors de l'envoi");
      }

      setIsSuccess(true);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Une erreur est survenue. Veuillez réessayer.";
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
              Candidature transmise
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
              Nous analysons votre dossier et revenons vers vous sous 24h
              ouvrées avec un cadrage de premier échange adapté à votre
              contexte.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/" className="ghost-cta">
                Retour à la landing
              </Link>
              <a href={`mailto:${formData.email}`} className="gold-cta">
                Vérifier ma boîte email
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
          <div className="flex items-center justify-between rounded-2xl border border-neutral-300 bg-white/90 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur md:px-6">
            <Link href="/" className="group flex items-center gap-2.5">
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
              href="/"
              className="text-sm font-semibold text-charcoal/70 transition hover:text-charcoal"
            >
              Retour au site
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
            <p className="premium-pill">Cohorte fondatrice</p>
            <h1 className="mt-5 font-serif text-5xl leading-tight text-charcoal">
              Candidature pilote premium
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-600">
              Cette candidature nous permet de qualifier rapidement votre
              périmètre et de structurer une première boucle de décision
              opérationnelle à forte valeur.
            </p>

            <ul className="mt-7 space-y-3">
              {VALUE_POINTS.map((point) => (
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
                Temps estimé
              </p>
              <p className="mt-2 text-sm text-charcoal/85">4 à 5 minutes</p>
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
                  Organisation
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Entreprise"
                    name="companyName"
                    value={formData.companyName}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, companyName: value }))
                    }
                    placeholder="Ex: Groupe Atlas"
                    required
                  />
                  <Select
                    label="Secteur"
                    name="sector"
                    value={formData.sector}
                    options={SECTORS}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, sector: value }))
                    }
                    required
                  />
                  <Select
                    label="Effectif"
                    name="employeeRange"
                    value={formData.employeeRange}
                    options={EMPLOYEE_RANGES}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, employeeRange: value }))
                    }
                    required
                  />
                  <Select
                    label="Nombre de sites"
                    name="siteCount"
                    value={formData.siteCount}
                    options={SITE_COUNTS}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, siteCount: value }))
                    }
                    required
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Contact
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Prénom"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, firstName: value }))
                    }
                    required
                  />
                  <Input
                    label="Nom"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, lastName: value }))
                    }
                    required
                  />
                  <Select
                    label="Fonction"
                    name="role"
                    value={formData.role}
                    options={ROLES}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, role: value }))
                    }
                    required
                  />
                  <Input
                    type="email"
                    label="Email professionnel"
                    name="email"
                    value={formData.email}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, email: value }))
                    }
                    placeholder="vous@entreprise.com"
                    required
                  />
                  <Input
                    label="Téléphone"
                    name="phone"
                    value={formData.phone}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, phone: value }))
                    }
                    placeholder="06 00 00 00 00"
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Enjeux
                </legend>
                <div className="grid gap-4">
                  <Select
                    label="Horizon projet"
                    name="timeline"
                    value={formData.timeline}
                    options={TIMELINES}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, timeline: value }))
                    }
                    required
                  />
                  <Input
                    label="Stack actuelle (optionnel)"
                    name="currentStack"
                    value={formData.currentStack}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, currentStack: value }))
                    }
                    placeholder="Ex: ERP + planning interne"
                  />
                  <TextArea
                    label="Quel est votre principal enjeu de couverture aujourd'hui ?"
                    name="painPoint"
                    value={formData.painPoint}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, painPoint: value }))
                    }
                    placeholder="Décrivez le problème opérationnel que vous voulez traiter en priorité."
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
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      website: event.target.value,
                    }))
                  }
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={formData.consent}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      consent: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm leading-relaxed text-neutral-600">
                  J'accepte les{" "}
                  <Link
                    href="/cgu"
                    target="_blank"
                    className="font-semibold text-amber-700 hover:underline"
                  >
                    CGU
                  </Link>{" "}
                  et la{" "}
                  <Link
                    href="/confidentialite"
                    target="_blank"
                    className="font-semibold text-amber-700 hover:underline"
                  >
                    politique de confidentialité
                  </Link>
                  .
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-7 py-3.5 text-sm font-semibold text-charcoal transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Envoi en cours..." : "Envoyer ma candidature"}
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
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-charcoal/80">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-charcoal outline-none ring-0 transition focus:border-amber-400"
        required={required}
      />
    </label>
  );
}

function Select({
  label,
  name,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-charcoal/80">
        {label}
        {required ? " *" : ""}
      </span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-charcoal outline-none transition focus:border-amber-400"
        required={required}
      >
        <option value="">Sélectionner</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-charcoal/80">
        {label}
        {required ? " *" : ""}
      </span>
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        minLength={20}
        rows={5}
        className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-charcoal outline-none transition focus:border-amber-400"
        required={required}
      />
    </label>
  );
}
