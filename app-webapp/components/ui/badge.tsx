import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@praedixa/ui";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/12 text-primary",
        secondary: "border-transparent bg-black/[0.06] text-ink-secondary",
        destructive: "border-transparent bg-danger/14 text-danger-text",
        outline: "border-black/12 text-ink",
        success: "border-transparent bg-emerald-100 text-emerald-700",
        warning: "border-transparent bg-amber-100 text-amber-700",
        error: "border-transparent bg-rose-100 text-rose-700",
        info: "border-transparent bg-blue-100 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
