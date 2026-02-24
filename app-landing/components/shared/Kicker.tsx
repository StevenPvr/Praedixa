import { cn } from "../../lib/utils";

interface KickerProps {
  children: React.ReactNode;
  className?: string;
}

export function Kicker({ children, className }: KickerProps) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-semibold uppercase tracking-[0.08em] text-brass",
        className,
      )}
    >
      {children}
    </span>
  );
}
