import { cn } from "../../lib/utils";

interface KickerProps {
  children: React.ReactNode;
  className?: string;
}

export function Kicker({ children, className }: KickerProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-brass",
        className,
      )}
    >
      <span
        className="inline-block h-px w-5 bg-current opacity-40"
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
