import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@praedixa/ui";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg",
    "min-h-[24px] min-w-[24px] text-sm font-semibold tracking-[-0.01em]",
    "transition-all duration-fast ease-snappy",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-45",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary text-white shadow-raised hover:border-primary-600 hover:bg-primary-600 hover:shadow-[var(--shadow-premium-glow)] shine-effect",
        premium:
          "border border-primary bg-primary text-white shadow-raised hover:border-primary-600 hover:bg-primary-600 hover:shadow-[var(--shadow-premium-glow)] shine-effect",
        destructive: "bg-danger text-white shadow-raised hover:opacity-90",
        outline:
          "border border-border bg-surface text-ink hover:border-border-hover hover:bg-surface-interactive hover:shadow-raised",
        secondary: "bg-surface-interactive text-ink hover:bg-border",
        ghost: "text-ink-secondary hover:bg-surface-interactive hover:text-ink",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
        glass: "surface-glass text-ink shadow-raised hover:shadow-floating",
        accent: "bg-accent text-ink shadow-raised hover:bg-accent-500",
      },
      size: {
        default: "h-10 px-5 py-2 gap-2",
        sm: "h-8 px-3.5 text-caption gap-1.5",
        lg: "h-12 px-7 text-[15px] gap-2.5",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
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
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
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
            <span className="opacity-70">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
