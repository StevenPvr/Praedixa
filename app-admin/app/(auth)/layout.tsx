import { PraedixaLogo } from "../../components/praedixa-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, color-mix(in oklch, var(--brand) 14%, transparent), transparent 38%), radial-gradient(circle at 80% 10%, color-mix(in oklch, var(--accent) 18%, transparent), transparent 36%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <PraedixaLogo size={50} color="var(--text-primary)" />
          <h1 className="font-serif text-2xl font-semibold text-charcoal">
            Console Admin Praedixa
          </h1>
          <p className="max-w-xs text-sm text-ink-tertiary">
            Supervision multi-tenant, operations et gouvernance.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-floating">
          {children}
        </div>
      </div>
    </div>
  );
}
