import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="gradient-mesh flex flex-col items-center justify-center py-24">
      <span className="gradient-brand-text font-serif text-display-lg">
        404
      </span>
      <p className="mt-3 text-heading text-ink-secondary">Page introuvable</p>
      <p className="mt-1 max-w-sm text-center text-body-sm text-ink-tertiary">
        La page que vous recherchez n&apos;existe pas ou a ete deplacee.
      </p>
      <Button asChild variant="premium" size="lg" className="mt-8">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
