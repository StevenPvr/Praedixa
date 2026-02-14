import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="gradient-mesh flex min-h-screen flex-col items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="gradient-brand-text font-serif text-display-lg">
          404
        </span>
        <p className="text-heading text-ink-secondary">Page introuvable</p>
        <p className="max-w-sm text-body-sm text-ink-tertiary">
          La page que vous recherchez n&apos;existe pas ou a ete deplacee.
        </p>
      </div>
      <Button asChild variant="premium" size="lg" className="mt-8">
        <Link href="/dashboard">Retour au dashboard</Link>
      </Button>
    </div>
  );
}
