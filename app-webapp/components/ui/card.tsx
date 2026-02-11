import * as React from "react";
import { cn } from "@praedixa/ui";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    noPadding?: boolean;
    hoverable?: boolean;
    variant?: "default" | "elevated" | "flat";
  }
>(
  (
    {
      className,
      noPadding = false,
      hoverable = false,
      variant = "default",
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card rounded-card transition-all duration-normal",
          // Variants
          variant === "default" && "shadow-card border border-gray-100/50",
          variant === "elevated" && "shadow-elevated border-none",
          variant === "flat" &&
            "shadow-none border border-gray-100 bg-gray-50/50",
          // Interaction
          hoverable &&
            "hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer",
          // Padding
          !noPadding && "p-6",
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-serif text-lg font-semibold leading-none tracking-tight text-ink",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-ink-secondary", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
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
