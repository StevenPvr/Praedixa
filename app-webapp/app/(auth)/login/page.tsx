"use client";

import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fadeScale } from "@/lib/animations/config";
import {
  getSupabaseBrowserClient,
  getValidAccessToken,
} from "@/lib/auth/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isReauth = searchParams.get("reauth") === "1";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const token = await getValidAccessToken({ minTtlSeconds: 0 });
      if (!token) {
        setError("Session invalide. Veuillez reessayer.");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Erreur de connexion. Veuillez reessayer.");
      setLoading(false);
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-body-sm text-ink placeholder:text-ink-placeholder outline-none transition-all duration-fast focus:border-primary focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <motion.div
      variants={fadeScale}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="space-y-2 text-center">
        <p className="text-overline text-ink-tertiary">Client access</p>
        <h2 className="font-serif text-display-sm text-ink">
          Connexion securisee
        </h2>
        <p className="text-body-sm text-ink-secondary">
          Accedez a votre war room operationnelle et vos priorites critiques.
        </p>
      </div>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        {isReauth && (
          <div className="rounded-lg border border-warning-light bg-warning-light/50 px-4 py-3 text-body-sm text-warning-text">
            Session expiree ou droits insuffisants. Veuillez vous reconnecter.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger-light bg-danger-light/50 px-4 py-3 text-body-sm text-danger-text">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-body-sm font-medium text-ink"
          >
            Email professionnel
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className={inputClasses}
            placeholder="vous@entreprise.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-body-sm font-medium text-ink"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className={inputClasses}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          loading={loading}
          variant="premium"
          className="w-full"
          size="lg"
        >
          {loading ? (
            "Connexion en cours..."
          ) : (
            <>
              <LockKeyhole className="mr-2 h-4 w-4" />
              Se connecter
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
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
