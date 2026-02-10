import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@praedixa/ui";

type StatusBannerVariant = "success" | "warning" | "danger";

interface StatusBannerProps {
  variant: StatusBannerVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<
  StatusBannerVariant,
  { container: string; icon: string }
> = {
  success: {
    container: "bg-green-50 text-green-800 border-green-200",
    icon: "text-green-600",
  },
  warning: {
    container: "bg-orange-50 text-orange-800 border-orange-200",
    icon: "text-orange-600",
  },
  danger: {
    container: "bg-red-50 text-red-800 border-red-200",
    icon: "text-red-600",
  },
};

const variantIcons: Record<
  StatusBannerVariant,
  typeof CheckCircle2 | typeof AlertTriangle
> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

export function StatusBanner({
  variant,
  children,
  className,
}: StatusBannerProps) {
  const styles = variantStyles[variant];
  const Icon = variantIcons[variant];

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm",
        styles.container,
        className,
      )}
    >
      <Icon
        className={cn("h-5 w-5 shrink-0", styles.icon)}
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  );
}
