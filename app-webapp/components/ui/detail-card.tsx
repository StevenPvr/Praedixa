// DetailCard component — standardized card wrapper for page sections
import * as React from "react";
import { cn } from "@praedixa/ui";

const paddingMap = {
  compact: "p-4",
  default: "p-6",
  loose: "p-8",
} as const;

export interface DetailCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  padding?: "compact" | "default" | "loose";
}

const DetailCard = React.forwardRef<HTMLDivElement, DetailCardProps>(
  ({ className, title, padding = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-neutral-200/80 bg-card shadow-soft",
        paddingMap[padding],
        className,
      )}
      {...props}
    >
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-charcoal">{title}</h3>
      )}
      {children}
    </div>
  ),
);

DetailCard.displayName = "DetailCard";

export { DetailCard };
