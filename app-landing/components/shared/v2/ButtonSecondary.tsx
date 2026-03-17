import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

interface ButtonSecondaryProps {
  href: string;
  label: string;
  className?: string;
  icon?: ReactNode;
}

export function ButtonSecondary({
  href,
  label,
  className,
  icon,
}: ButtonSecondaryProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-[52px] items-center justify-center gap-2.5 rounded-[14px] border border-v2-border-300 bg-transparent px-7 text-sm font-semibold tracking-tight text-ink-950",
        "transition-all duration-200 ease-out-expo",
        "hover:border-v2-border-200 hover:bg-surface-75",
        "active:scale-[0.98]",
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </Link>
  );
}
