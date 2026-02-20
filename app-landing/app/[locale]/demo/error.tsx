"use client";

interface DemoErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DemoErrorPage({ error, reset }: DemoErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[oklch(0.14_0.025_247)] p-6">
      <div className="max-w-md rounded-xl border border-red-300/30 bg-red-500/10 p-5 text-sm text-red-100">
        <p>
          La démo interactive n&apos;a pas pu être chargée / The interactive
          demo failed to load.
        </p>
        <p className="mt-2 text-xs text-red-100/80">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex rounded-md border border-red-100/30 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500/30"
        >
          Recharger / Reload
        </button>
      </div>
    </main>
  );
}
