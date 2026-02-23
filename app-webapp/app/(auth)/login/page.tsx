"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fadeScale } from "@/lib/animations/config";

function toLoginErrorMessage(error: string | null): string | null {
  if (!error) return null;
  if (error === "oidc_config_missing") {
    return "Configuration OIDC manquante en local. Renseignez AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID et AUTH_SESSION_SECRET dans app-webapp/.env.local.";
  }
  if (error === "oidc_provider_untrusted") {
    return "Le fournisseur OIDC est non fiable ou mal configure (TLS/certificat/endpoints). Contactez l'administrateur.";
  }
  return `La connexion a echoue (${error}). Veuillez reessayer.`;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const isReauth = searchParams.get("reauth") === "1";
  const error = searchParams.get("error");
  const errorMessage = toLoginErrorMessage(error);

  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  function handleLogin(): void {
    const loginUrl = new URL("/auth/login", window.location.origin);
    loginUrl.searchParams.set("next", safeNext);
    if (isReauth) {
      loginUrl.searchParams.set("prompt", "login");
    }
    window.location.href = loginUrl.toString();
  }

  return (
    <motion.div
      variants={fadeScale}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="space-y-2 text-center">
        <p className="text-overline text-ink-tertiary">Client access</p>
        <h2 className="font-sans font-bold text-display-sm text-ink">
          Connexion securisee
        </h2>
        <p className="text-body-sm text-ink-secondary">
          Authentification geree par votre fournisseur d'identite entreprise.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {isReauth && (
          <div className="rounded-lg border border-warning-light bg-warning-light/50 px-4 py-3 text-body-sm text-warning-text">
            Session expiree ou droits insuffisants. Veuillez vous reconnecter.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-danger-light bg-danger-light/50 px-4 py-3 text-body-sm text-danger-text">
            {errorMessage}
          </div>
        )}

        <Button
          type="button"
          onClick={handleLogin}
          className="w-full"
          size="lg"
        >
          <LockKeyhole className="mr-2 h-4 w-4" />
          Continuer vers la connexion
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
