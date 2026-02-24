"use client";

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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <span className="text-5xl font-bold tracking-tight text-neutral-300">
        Erreur
      </span>
      <h1 className="mt-4 text-xl font-semibold text-ink">
        Une erreur est survenue
      </h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        Le chargement de cette page a échoué. Veuillez réessayer.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center rounded-lg bg-brass px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-brass-600 active:scale-[0.98]"
      >
        Réessayer
      </button>
    </div>
  );
}
