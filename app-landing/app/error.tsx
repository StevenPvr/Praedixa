"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Re-enable Sentry here when monitoring is restored.
  void error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-2xl font-bold text-white shadow-lg shadow-primary/20">
          P
        </div>
        <h1 className="font-serif text-2xl text-charcoal sm:text-3xl">
          Quelque chose s'est mal passé
        </h1>
        <p className="mt-3 text-ink-tertiary">
          Nous en avons été informés et travaillons à la résoudre. Veuillez
          réessayer.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-xl border border-charcoal/10 bg-card px-6 py-3 font-semibold text-charcoal transition-colors hover:bg-surface-sunken"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
