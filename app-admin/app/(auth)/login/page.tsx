"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

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

      // Hard navigation ensures the server middleware sees fresh session cookies
      // and the page fully remounts (avoids stale loading state on redirect back).
      window.location.href = "/";
    } catch {
      setError("Erreur de connexion. Veuillez reessayer.");
      setLoading(false);
    }
  }

  return (
    <>
      <p className="mb-6 text-center text-sm text-gray-500">
        Espace administration
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        {isReauth && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Session expiree ou droits insuffisants. Veuillez vous reconnecter.
          </div>
        )}

        {error && (
          <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="min-h-[44px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-charcoal placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="admin@praedixa.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="min-h-[44px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-charcoal placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
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
