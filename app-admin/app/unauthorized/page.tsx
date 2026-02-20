import Link from "next/link";
import { PraedixaLogo } from "@/components/praedixa-logo";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-md space-y-8 px-4 text-center">
        <div className="flex flex-col items-center gap-3">
          <PraedixaLogo size={48} color="var(--text-primary)" />
          <h1 className="font-serif text-2xl font-semibold text-charcoal">
            Acces non autorise
          </h1>
        </div>

        <div className="rounded-card border border-border bg-card p-8 shadow-card">
          <p className="mb-6 text-sm text-ink-secondary">
            Vous n&apos;avez pas les droits super administrateur requis pour
            acceder a cette interface.
          </p>
          <Link
            href="/login?reauth=1"
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Se reconnecter
          </Link>
        </div>
      </div>
    </div>
  );
}
