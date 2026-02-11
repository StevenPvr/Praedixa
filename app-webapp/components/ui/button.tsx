import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@praedixa/ui";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-button text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-sm hover:bg-primary-dark hover:shadow-md",
        destructive: "bg-danger text-white shadow-sm hover:opacity-90",
        outline:
          "border border-black/10 bg-white text-ink hover:border-black/20 hover:bg-black/[0.02]",
        secondary: "bg-black/[0.04] text-ink hover:bg-black/[0.08]",
        ghost: "text-ink-secondary hover:bg-black/[0.04] hover:text-ink",
        link: "text-primary underline-offset-4 hover:underline",
        glass:
          "border border-white/25 bg-white/70 text-ink backdrop-blur-md shadow-sm hover:bg-white/85",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-11 w-11",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
