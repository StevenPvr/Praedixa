import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@praedixa/ui";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-fast",
  {
    variants: {
      variant: {
        default:
          "border-[var(--brand-100)] bg-[var(--brand-50)] text-[var(--brand)]",
        secondary: "border-border bg-surface-sunken text-ink-secondary",
        success: "border-success-light bg-success-light text-success-text",
        warning: "border-warning-light bg-warning-light text-warning-text",
        danger: "border-danger-light bg-danger-light text-danger-text",
        info: "border-info-light bg-info-light text-info-text",
        outline:
          "border-border bg-transparent text-ink-secondary hover:border-border-hover",
        destructive: "border-danger-light bg-danger-light text-danger-text",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-px text-[10px]",
        lg: "px-3 py-1 text-[13px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
