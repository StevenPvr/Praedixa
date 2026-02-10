import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="text-6xl font-bold text-charcoal">404</h1>
      <p className="mt-4 text-lg text-gray-500">Page introuvable</p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
      >
        Retour au dashboard
      </Link>
    </div>
  );
}
