import * as React from "react";
import { cn } from "@praedixa/ui";

export type DetailCardVariant = "default" | "glass" | "premium";

export interface DetailCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  padding?: "none" | "compact" | "default" | "loose";
  action?: React.ReactNode;
  /** Optional status indicator on the left border */
  status?: "success" | "warning" | "danger" | "info";
  /** Visual variant aliases retained for backward compatibility */
  variant?: DetailCardVariant;
}

const statusBorders: Record<string, string> = {
  success: "border-l-[3px] border-l-success",
  warning: "border-l-[3px] border-l-warning",
  danger: "border-l-[3px] border-l-danger",
  info: "border-l-[3px] border-l-info",
};

const variantStyles: Record<DetailCardVariant, string> = {
  default: "border border-border/70 bg-card/70 shadow-none",
  glass:
    "border border-white/10 bg-glass shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
  premium:
    "border border-border/70 bg-card shadow-[0_20px_45px_-30px_rgba(15,23,42,0.25)]",
};

const paddingMap = {
  none: "",
  compact: "p-5",
  default: "p-7",
  loose: "p-9",
};

const headerPaddingMap = {
  none: "px-6 py-5",
  compact: "px-5 py-4",
  default: "px-7 py-5",
  loose: "px-9 py-6",
};

const bodyPaddingWhenTitled = {
  none: "p-0",
  compact: "px-5 pb-5 pt-4",
  default: "px-7 py-6",
  loose: "px-9 py-8",
};

const DetailCard = React.forwardRef<HTMLDivElement, DetailCardProps>(
  (
    {
      className,
      title,
      padding = "default",
      action,
      status,
      variant = "default",
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full flex-col rounded-[1.75rem]",
          variantStyles[variant],
          status && statusBorders[status],
          !title && paddingMap[padding],
          className,
        )}
        {...props}
      >
        {title && (
          <>
            <div
              className={cn(
                "flex items-center justify-between",
                headerPaddingMap[padding],
              )}
            >
              <h3 className="text-title-sm font-semibold tracking-tight text-ink">
                {title}
              </h3>
              {action && <div className="flex items-center gap-3">{action}</div>}
            </div>
            <div className="border-b border-border/70" aria-hidden="true" />
          </>
        )}
        <div
          className={cn(
            "flex-1",
            title && bodyPaddingWhenTitled[padding],
          )}
        >
          {children}
        </div>
      </div>
    );
  },
);

DetailCard.displayName = "DetailCard";

export { DetailCard };
