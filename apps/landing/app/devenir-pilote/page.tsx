"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PraedixaLogo } from "../../components/logo/PraedixaLogo";

type Step =
  | "company"
  | "contact"
  | "employees"
  | "sector"
  | "confirmation"
  | "success";

interface FormData {
  companyName: string;
  email: string;
  phone: string;
  employeeRange: string;
  sector: string;
  website: string; // Honeypot - should stay empty
  consent: boolean;
}

const EMPLOYEE_RANGES = [
  { id: "50-100", label: "50-100", description: "Petite structure" },
  { id: "100-250", label: "100-250", description: "PME" },
  { id: "250-500", label: "250-500", description: "ETI" },
  { id: "500-1000", label: "500-1 000", description: "ETI établie" },
  { id: "1000+", label: "1 000+", description: "Grande entreprise" },
] as const;

const SECTORS = [
  { id: "logistique", label: "Logistique", icon: "📦" },
  { id: "transport", label: "Transport", icon: "🚚" },
  { id: "sante", label: "Santé", icon: "🏥" },
  { id: "industrie", label: "Industrie", icon: "🏭" },
  { id: "distribution", label: "Distribution", icon: "🏪" },
  { id: "agroalimentaire", label: "Agroalimentaire", icon: "🌾" },
  { id: "btp", label: "BTP", icon: "🏗️" },
  { id: "autre", label: "Autre", icon: "🏢" },
] as const;

const PILOT_BENEFITS = [
  "Diagnostic couverture gratuit",
  "Résultat en 48h",
  "Sans engagement",
  "Accompagnement personnalisé",
  "Tarif préférentiel 1 an",
  "Support premium 1 an",
  "Co-construction du produit",
] as const;

export default function DevenirPilotePage() {
  const [step, setStep] = useState<Step>("company");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    email: "",
    phone: "",
    employeeRange: "",
    sector: "",
    website: "", // Honeypot
    consent: false,
  });

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.companyName.trim()) {
      setStep("contact");
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email.trim()) {
      setStep("employees");
    }
  };

  const handleEmployeeSelect = (range: string) => {
    setFormData((prev) => ({ ...prev, employeeRange: range }));
    setStep("sector");
  };

  const handleSectorSelect = (sector: string) => {
    setFormData((prev) => ({ ...prev, sector }));
    setStep("confirmation");
  };

  const handleBack = () => {
    if (step === "contact") setStep("company");
    if (step === "employees") setStep("contact");
    if (step === "sector") setStep("employees");
    if (step === "confirmation") setStep("sector");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/pilot-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName,
          email: formData.email,
          phone: formData.phone,
          employeeRange:
            EMPLOYEE_RANGES.find((r) => r.id === formData.employeeRange)
              ?.label || formData.employeeRange,
          sector: formData.sector,
          website: formData.website, // Honeypot
          consent: formData.consent,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi");
      }

      setStep("success");
    } catch (err) {
      Sentry.captureException(err);
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepNumber = {
    company: 1,
    contact: 2,
    employees: 3,
    sector: 4,
    confirmation: 5,
    success: 5,
  }[step];

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 md:px-6 md:pt-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-charcoal/10 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-md md:px-6 md:py-3">
          <Link href="/" className="group flex items-center gap-2.5">
            <PraedixaLogo
              variant="industrial"
              size={32}
              color="#0f0f0f"
              strokeWidth={1}
              className="transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-serif text-lg font-semibold tracking-tight text-charcoal">
              Praedixa
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
          >
            Retour au site
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative mx-auto max-w-4xl px-4 pb-24 pt-32">
        {/* Progress indicator */}
        {step !== "success" && (
          <div className="mb-12 flex justify-center">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                      num <= stepNumber
                        ? "bg-amber-500 text-white"
                        : "bg-charcoal/10 text-charcoal/40"
                    }`}
                  >
                    {num}
                  </div>
                  {num < 5 && (
                    <div
                      className={`mx-2 h-0.5 w-6 transition-all duration-300 ${
                        num < stepNumber ? "bg-amber-500" : "bg-charcoal/10"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Company Name */}
          {step === "company" && (
            <motion.div
              key="company"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <h1 className="font-serif text-3xl text-charcoal sm:text-4xl md:text-5xl">
                  Obtenez votre diagnostic couverture
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
                  En <span className="text-amber-600 font-semibold">48h</span>,
                  on vous dit où vous allez manquer de monde et combien ça
                  coûte.{" "}
                  <span className="text-amber-600 font-semibold">
                    Gratuit pour les entreprises pilotes.
                  </span>
                </p>
              </div>

              {/* Benefits cards */}
              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PILOT_BENEFITS.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="rounded-xl border border-charcoal/10 bg-white p-4 text-center shadow-sm"
                  >
                    <p className="text-sm text-gray-600">{benefit}</p>
                  </motion.div>
                ))}
              </div>

              {/* Company name form */}
              <form onSubmit={handleCompanySubmit} className="mt-12">
                <label className="block text-center">
                  <span className="text-sm font-medium text-charcoal/70">
                    Nom de votre entreprise
                  </span>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        companyName: e.target.value,
                      }))
                    }
                    placeholder="Ex: Logistique Express"
                    className="mt-3 block w-full rounded-xl border border-charcoal/10 bg-white px-6 py-4 text-center text-lg text-charcoal placeholder-charcoal/30 shadow-sm transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    autoFocus
                  />
                </label>
                <div className="mt-8 flex justify-center">
                  <button
                    type="submit"
                    disabled={!formData.companyName.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continuer
                    <ArrowRightIcon />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Step 2: Contact Info */}
          {step === "contact" && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={handleBack}
                className="mb-6 flex items-center gap-2 text-sm text-charcoal/60 transition-colors hover:text-charcoal"
              >
                <ArrowLeftIcon />
                Retour
              </button>

              <div className="text-center">
                <h2 className="font-serif text-2xl text-charcoal sm:text-3xl md:text-4xl">
                  Comment vous contacter ?
                </h2>
                <p className="mt-3 text-gray-500">
                  Pour vous recontacter sous 24-48h
                </p>
              </div>

              <form
                onSubmit={handleContactSubmit}
                className="mx-auto mt-10 max-w-md space-y-6"
              >
                <label className="block">
                  <span className="text-sm font-medium text-charcoal/70">
                    Email professionnel{" "}
                    <span className="text-amber-600">*</span>
                  </span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="vous@entreprise.com"
                    className="mt-2 block w-full rounded-xl border border-charcoal/10 bg-white px-5 py-4 text-charcoal placeholder-charcoal/30 shadow-sm transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    autoFocus
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-charcoal/70">
                    Téléphone{" "}
                    <span className="text-charcoal/40">(optionnel)</span>
                  </span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="06 12 34 56 78"
                    className="mt-2 block w-full rounded-xl border border-charcoal/10 bg-white px-5 py-4 text-charcoal placeholder-charcoal/30 shadow-sm transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </label>

                {/* Honeypot field - hidden from users, visible to bots */}
                <div
                  className="absolute left-[-9999px] top-[-9999px]"
                  aria-hidden="true"
                >
                  <label>
                    <span>Website</span>
                    <input
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                </div>

                <div className="pt-4 flex justify-center">
                  <button
                    type="submit"
                    disabled={!formData.email.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continuer
                    <ArrowRightIcon />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Step 3: Employee Range */}
          {step === "employees" && (
            <motion.div
              key="employees"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={handleBack}
                className="mb-6 flex items-center gap-2 text-sm text-charcoal/60 transition-colors hover:text-charcoal"
              >
                <ArrowLeftIcon />
                Retour
              </button>

              <div className="text-center">
                <h2 className="font-serif text-2xl text-charcoal sm:text-3xl md:text-4xl">
                  Combien de salariés compte{" "}
                  <span className="text-amber-600">{formData.companyName}</span>{" "}
                  ?
                </h2>
                <p className="mt-3 text-gray-500">
                  Cliquez sur la carte correspondante
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {EMPLOYEE_RANGES.map((range, index) => (
                  <motion.button
                    key={range.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleEmployeeSelect(range.id)}
                    className="group relative overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-6 text-left shadow-sm transition-all hover:border-amber-500/50 hover:bg-amber-50"
                  >
                    <div className="relative z-10">
                      <p className="text-3xl font-bold text-charcoal">
                        {range.label}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {range.description}
                      </p>
                    </div>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 transition-transform duration-500 group-hover:translate-x-full" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Sector */}
          {step === "sector" && (
            <motion.div
              key="sector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={handleBack}
                className="mb-6 flex items-center gap-2 text-sm text-charcoal/60 transition-colors hover:text-charcoal"
              >
                <ArrowLeftIcon />
                Retour
              </button>

              <div className="text-center">
                <h2 className="font-serif text-2xl text-charcoal sm:text-3xl md:text-4xl">
                  Dans quel secteur opérez-vous ?
                </h2>
                <p className="mt-3 text-gray-500">
                  Sélectionnez le secteur qui correspond le mieux
                </p>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {SECTORS.map((sector, index) => (
                  <motion.button
                    key={sector.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleSectorSelect(sector.label)}
                    className="group relative overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-6 text-center shadow-sm transition-all hover:border-amber-500/50 hover:bg-amber-50"
                  >
                    <div className="relative z-10">
                      <span className="text-4xl">{sector.icon}</span>
                      <p className="mt-3 font-medium text-charcoal">
                        {sector.label}
                      </p>
                    </div>
                    <div className="absolute inset-0 -translate-y-full bg-gradient-to-b from-amber-500/0 via-amber-500/10 to-amber-500/0 transition-transform duration-500 group-hover:translate-y-full" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 5: Confirmation */}
          {step === "confirmation" && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={handleBack}
                className="mb-6 flex items-center gap-2 text-sm text-charcoal/60 transition-colors hover:text-charcoal"
              >
                <ArrowLeftIcon />
                Retour
              </button>

              <div className="text-center">
                <h2 className="font-serif text-2xl text-charcoal sm:text-3xl md:text-4xl">
                  Vérifiez vos informations
                </h2>
                <p className="mt-3 text-gray-500">
                  Récapitulatif de votre candidature
                </p>
              </div>

              {/* Summary card */}
              <div className="mx-auto mt-10 max-w-md rounded-2xl border border-charcoal/10 bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-charcoal/10 pb-4">
                    <span className="text-gray-500">Entreprise</span>
                    <span className="font-semibold text-charcoal">
                      {formData.companyName}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-charcoal/10 pb-4">
                    <span className="text-gray-500">Email</span>
                    <span className="font-semibold text-charcoal">
                      {formData.email}
                    </span>
                  </div>
                  {formData.phone && (
                    <div className="flex justify-between border-b border-charcoal/10 pb-4">
                      <span className="text-gray-500">Téléphone</span>
                      <span className="font-semibold text-charcoal">
                        {formData.phone}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-charcoal/10 pb-4">
                    <span className="text-gray-500">Effectif</span>
                    <span className="font-semibold text-charcoal">
                      {
                        EMPLOYEE_RANGES.find(
                          (r) => r.id === formData.employeeRange,
                        )?.label
                      }{" "}
                      salariés
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Secteur</span>
                    <span className="font-semibold text-charcoal">
                      {formData.sector}
                    </span>
                  </div>
                </div>
              </div>

              {/* What happens next */}
              <div className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-500/20 bg-amber-50 p-6">
                <h3 className="font-semibold text-amber-700">
                  Ce qui se passe ensuite
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-amber-600">1.</span>
                    Vous recevrez un email de confirmation
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-amber-600">2.</span>
                    Nous vous contacterons sous 24-48h
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-amber-600">3.</span>
                    Un premier échange pour comprendre vos besoins
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-amber-600">4.</span>
                    Déploiement progressif de la solution complète
                  </li>
                </ul>
              </div>

              {/* Consent checkbox */}
              <div className="mx-auto mt-8 max-w-md">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={formData.consent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          consent: e.target.checked,
                        }))
                      }
                      className="peer sr-only"
                    />
                    <div className="h-5 w-5 rounded border-2 border-charcoal/30 bg-white transition-all peer-checked:border-amber-500 peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-500/20 group-hover:border-charcoal/50" />
                    <svg
                      className="absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    J'accepte les{" "}
                    <Link
                      href="/cgu"
                      target="_blank"
                      className="text-amber-600 hover:underline"
                    >
                      Conditions Générales d'Utilisation
                    </Link>{" "}
                    et la{" "}
                    <Link
                      href="/confidentialite"
                      target="_blank"
                      className="text-amber-600 hover:underline"
                    >
                      Politique de confidentialité
                    </Link>
                    . Je consens au traitement de mes données pour le programme
                    Entreprise Pilote.
                  </span>
                </label>
              </div>

              {error && (
                <div className="mx-auto mt-6 max-w-md rounded-xl border border-red-500/20 bg-red-50 p-4 text-center text-red-600">
                  {error}
                </div>
              )}

              <div className="mt-10 flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.consent}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-10 py-4 text-lg font-semibold text-white transition-all hover:bg-amber-600 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Envoyer ma candidature
                      <ArrowRightIcon />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2,
                }}
                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-100"
              >
                <CheckIcon className="h-12 w-12 text-green-600" />
              </motion.div>

              <h2 className="font-serif text-3xl text-charcoal sm:text-4xl md:text-5xl">
                Candidature envoyée !
              </h2>
              <p className="mx-auto mt-4 max-w-md text-lg text-gray-500">
                Un email de confirmation a été envoyé à{" "}
                <span className="text-amber-600">{formData.email}</span>
              </p>

              <div className="mx-auto mt-10 max-w-md rounded-2xl border border-green-200 bg-green-50 p-6 text-left">
                <h3 className="font-semibold text-green-700">
                  Prochaines étapes
                </h3>
                <ul className="mt-3 space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-700">
                      1
                    </span>
                    <span>Vérifiez votre boîte mail (et les spams)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-700">
                      2
                    </span>
                    <span>Nous vous contacterons sous 24-48h</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-700">
                      3
                    </span>
                    <span>Premier échange pour comprendre vos besoins</span>
                  </li>
                </ul>
              </div>

              <div className="mt-10">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-white px-8 py-4 text-lg font-semibold text-charcoal shadow-sm transition-all hover:bg-gray-50"
                >
                  <ArrowLeftIcon />
                  Retour à l'accueil
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 10H16M16 10L11 5M16 10L11 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M16 10H4M4 10L9 5M4 10L9 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 13L9 17L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
