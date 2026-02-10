import { PraedixaLogo } from "../../components/praedixa-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-md space-y-8 px-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <PraedixaLogo size={48} />
          <h1 className="font-serif text-2xl font-semibold text-charcoal">
            Praedixa
          </h1>
        </div>

        {/* Card container */}
        <div className="rounded-card border border-gray-200 bg-card p-8 shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}
