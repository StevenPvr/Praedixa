import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <span className="text-6xl font-bold tracking-tight text-brass">404</span>
      <h1 className="mt-4 text-xl font-semibold text-ink">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/fr"
        className="mt-6 inline-flex items-center rounded-lg bg-brass px-5 py-2.5 text-sm font-semibold text-white no-underline transition-all duration-150 hover:bg-brass-600 active:scale-[0.98]"
      >
        Retour au site
      </Link>
    </div>
  );
}
