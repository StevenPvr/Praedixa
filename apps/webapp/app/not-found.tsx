import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center font-sans">
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
