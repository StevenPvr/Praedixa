import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-md,10px)] text-sm font-semibold",
    "transition-all duration-[var(--duration-fast,200ms)] ease-[var(--ease-snappy)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset,white)]",
    "disabled:pointer-events-none disabled:opacity-45",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand)] text-[var(--ink-on-color)] shadow-sm hover:bg-[var(--brand-600)] hover:shadow-md",
        premium:
          "shine-effect bg-gradient-to-br from-[var(--brand)] to-[var(--brand-300)] text-[var(--ink-on-color)] shadow-sm hover:-translate-y-px hover:shadow-[var(--shadow-premium-glow)] hover:brightness-110",
        destructive:
          "bg-[var(--danger)] text-white shadow-sm hover:bg-[var(--danger-text)]",
        outline:
          "border border-[var(--border)] bg-transparent text-[var(--ink)] hover:bg-[var(--surface-interactive)] hover:border-[var(--border-hover)]",
        secondary:
          "bg-[var(--surface-interactive)] text-[var(--ink)] hover:bg-[var(--border-subtle)]",
        ghost:
          "text-[var(--ink-secondary)] hover:bg-[var(--surface-interactive)] hover:text-[var(--ink)]",
        link: "text-[var(--brand)] underline-offset-4 hover:underline shadow-none",
        glass:
          "border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md text-[var(--ink)] hover:bg-[var(--glass-bg-strong)]",
        accent:
          "bg-[var(--accent)] text-[var(--ink)] shadow-sm hover:bg-[var(--accent-500)]",
      },
      size: {
        default: "min-h-[24px] h-10 px-4 py-2 gap-2",
        xs: "min-h-[24px] h-7 px-2.5 text-xs gap-1",
        sm: "min-h-[24px] h-8 px-3 text-[13px] gap-1.5",
        lg: "min-h-[24px] h-11 px-6 text-[15px] gap-2.5",
        xl: "min-h-[24px] h-12 px-8 text-base gap-3",
        icon: "h-10 min-h-[24px] min-w-[24px] w-10",
        "icon-sm": "h-8 min-h-[24px] min-w-[24px] w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-20"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-80"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && (
          <span className="flex shrink-0 items-center">{leftIcon}</span>
        )}
        {loading ? <span className="opacity-70">{children}</span> : children}
        {!loading && rightIcon && (
          <span className="flex shrink-0 items-center">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
