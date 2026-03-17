import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

interface ButtonPrimaryProps {
  href: string;
  label: string;
  className?: string;
  icon?: ReactNode;
}

export function ButtonPrimary({
  href,
  label,
  className,
  icon,
}: ButtonPrimaryProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-[52px] items-center justify-center gap-2.5 rounded-[14px] bg-signal-500 px-7 text-sm font-semibold tracking-tight text-ink-950",
        "transition-all duration-200 ease-out-expo",
        "hover:brightness-110 hover:shadow-2",
        "active:scale-[0.98]",
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </Link>
  );
}
