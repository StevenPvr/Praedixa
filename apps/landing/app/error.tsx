"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-2xl font-bold text-white shadow-lg shadow-amber-500/20">
          P
        </div>
        <h1 className="font-serif text-2xl text-charcoal sm:text-3xl">
          Quelque chose s'est mal passé
        </h1>
        <p className="mt-3 text-gray-500">
          Nous en avons été informés et travaillons à la résoudre. Veuillez
          réessayer.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-xl border border-charcoal/10 bg-white px-6 py-3 font-semibold text-charcoal transition-colors hover:bg-gray-50"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
