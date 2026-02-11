import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@praedixa/ui";

type StatusBannerVariant = "success" | "warning" | "danger" | "info";

interface StatusBannerProps {
  variant: StatusBannerVariant;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const variantStyles: Record<
  StatusBannerVariant,
  { container: string; icon: string; title: string }
> = {
  success: {
    container: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    icon: "text-emerald-600",
    title: "text-emerald-900",
  },
  warning: {
    container: "border-amber-200 bg-amber-50/85 text-amber-900",
    icon: "text-amber-600",
    title: "text-amber-900",
  },
  danger: {
    container: "border-rose-200 bg-rose-50/85 text-rose-900",
    icon: "text-rose-600",
    title: "text-rose-900",
  },
  info: {
    container: "border-blue-200 bg-blue-50/85 text-blue-900",
    icon: "text-blue-600",
    title: "text-blue-900",
  },
};

const variantIcons: Record<
  StatusBannerVariant,
  typeof CheckCircle2 | typeof AlertTriangle | typeof Info
> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Info,
};

export function StatusBanner({
  variant,
  title,
  children,
  className,
}: StatusBannerProps) {
  const styles = variantStyles[variant];
  const Icon = variantIcons[variant];

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xs",
        styles.container,
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 h-5 w-5 shrink-0", styles.icon)}
        aria-hidden="true"
      />
      <div className="flex-1">
        {title && (
          <h4 className={cn("mb-1 font-semibold", styles.title)}>{title}</h4>
        )}
        <div className="text-sm leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
