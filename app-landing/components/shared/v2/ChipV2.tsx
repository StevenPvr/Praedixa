import { cn } from "../../../lib/utils";

type ChipVariant = "neutral" | "proof" | "signal" | "risk";

interface ChipV2Props {
  variant: ChipVariant;
  label: string;
  className?: string;
}

const variantStyles: Record<ChipVariant, string> = {
  neutral: "bg-surface-100 text-ink-700",
  proof: "bg-proof-100 text-proof-500",
  signal: "bg-signal-100 text-ink-950",
  risk: "bg-risk-100 text-risk-500",
};

export function ChipV2({ variant, label, className }: ChipV2Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
