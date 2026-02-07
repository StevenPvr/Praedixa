// Status badge with colored dot indicator
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium",
  {
    variants: {
      variant: {
        success: "bg-success-50 text-success-700",
        warning: "bg-warning-50 text-warning-700",
        danger: "bg-danger-50 text-danger-700",
        info: "bg-blue-50 text-blue-700",
        neutral: "bg-gray-100 text-gray-600",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  },
);

const dotColors: Record<string, string> = {
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-blue-500",
  neutral: "bg-gray-400",
};

export interface StatusBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Text label for the status */
  label: string;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant, size, label, ...props }, ref) => {
    const resolvedVariant = variant ?? "neutral";

    return (
      <span
        ref={ref}
        className={cn(statusBadgeVariants({ variant, size }), className)}
        {...props}
      >
        <span
          className={cn(
            "inline-block shrink-0 rounded-full",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
            dotColors[resolvedVariant],
          )}
          aria-hidden="true"
        />
        {label}
      </span>
    );
  },
);

StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusBadgeVariants };
