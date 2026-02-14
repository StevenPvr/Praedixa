import * as React from "react";
import { cn } from "../utils/cn";

/* ── Card ── */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Visual variant */
    variant?:
      | "default"
      | "elevated"
      | "glass"
      | "interactive"
      | "premium"
      | "flat";
    /** Remove default padding */
    noPadding?: boolean;
  }
>(({ className, variant = "default", noPadding = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[var(--radius-lg,14px)] text-[var(--ink)]",
      "transition-all duration-[var(--duration-fast,200ms)] ease-[var(--ease-snappy)]",
      variant === "default" && [
        "border border-[var(--border)] bg-[var(--card-bg)]",
        "shadow-[var(--shadow-raised)]",
      ],
      variant === "elevated" && [
        "border border-[var(--border)] bg-[var(--card-bg)]",
        "shadow-[var(--shadow-floating)]",
      ],
      variant === "glass" && [
        "border border-[var(--glass-border)] bg-[var(--glass-bg)]",
        "[backdrop-filter:blur(var(--glass-blur,24px))_saturate(1.5)]",
        "[-webkit-backdrop-filter:blur(var(--glass-blur,24px))_saturate(1.5)]",
        "shadow-[var(--shadow-raised)]",
      ],
      variant === "interactive" && [
        "border border-[var(--border)] bg-[var(--card-bg)] cursor-pointer",
        "shadow-[var(--shadow-raised)]",
        "hover:shadow-[var(--shadow-card-hover,var(--shadow-floating))]",
        "hover:border-[var(--border-glow,var(--border-hover))]",
        "hover:-translate-y-0.5",
      ],
      variant === "premium" && [
        "border border-[var(--border)] bg-[var(--gradient-card,var(--card-bg))]",
        "shadow-[var(--shadow-raised)]",
        "hover:shadow-[var(--shadow-premium-glow,var(--shadow-floating))]",
        "hover:border-[var(--border-glow,var(--border-hover))]",
        "hover:-translate-y-0.5",
      ],
      variant === "flat" && ["bg-[var(--card-bg)]"],
      !noPadding && "p-[var(--space-card-padding,24px)]",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

/* ── CardHeader ── */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col gap-1.5 p-[var(--space-card-padding,24px)]",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/* ── CardTitle ── */
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-tight tracking-tight text-[var(--ink)]",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/* ── CardDescription ── */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--ink-secondary)]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/* ── CardContent ── */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-[var(--space-card-padding,24px)] pb-[var(--space-card-padding,24px)]",
      className,
    )}
    {...props}
  />
));
CardContent.displayName = "CardContent";

/* ── CardFooter ── */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center border-t border-[var(--border-subtle)] px-[var(--space-card-padding,24px)] py-4",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
