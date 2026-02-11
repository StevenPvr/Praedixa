"use client";

import { Suspense, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  return (
    <>
      <div className="space-y-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">
          Client access
        </p>
        <h2 className="font-heading text-3xl font-semibold text-ink">
          Connexion securisee
        </h2>
        <p className="text-sm text-ink-secondary">
          Accedez a votre war room operationnelle et vos priorites critiques.
        </p>
      </div>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        {isReauth && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Session expiree ou droits insuffisants. Veuillez vous reconnecter.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-ink"
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
            className="w-full rounded-xl border border-black/12 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-tertiary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="vous@entreprise.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-ink"
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
            className="w-full rounded-xl border border-black/12 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-tertiary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-300 text-charcoal hover:bg-amber-200"
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
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
