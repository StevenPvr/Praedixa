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
  default: "border border-border bg-card shadow-raised",
  glass: "border border-border bg-card shadow-raised",
  premium: "border border-border bg-card shadow-raised",
};

const paddingMap = {
  none: "",
  compact: "p-4",
  default: "p-6",
  loose: "p-8",
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
          "flex h-full flex-col rounded-lg",
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
                padding === "compact" ? "px-4 py-4" : "px-7 py-6",
              )}
            >
              <h3 className="text-title-sm text-ink">{title}</h3>
              {action && (
                <div className="flex items-center gap-2">{action}</div>
              )}
            </div>
            <div className="border-b border-border" aria-hidden="true" />
          </>
        )}
        <div
          className={cn(
            "flex-1",
            title && (padding === "compact" ? "p-4" : "p-6"),
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
