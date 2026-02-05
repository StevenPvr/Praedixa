import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold text-amber-500">404</p>
        <h1 className="mt-4 font-serif text-2xl text-charcoal sm:text-3xl">
          Page introuvable
        </h1>
        <p className="mt-3 text-gray-500">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-4 font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
