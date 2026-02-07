// Input component
import * as React from "react";
import { cn } from "../utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error state */
  error?: boolean;
  /** Left addon/icon */
  leftAddon?: React.ReactNode;
  /** Right addon/icon */
  rightAddon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftAddon, rightAddon, ...props }, ref) => {
    const inputElement = (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          leftAddon && "pl-10",
          rightAddon && "pr-10",
          className,
        )}
        ref={ref}
        {...props}
      />
    );

    if (leftAddon || rightAddon) {
      return (
        <div className="relative">
          {leftAddon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              {leftAddon}
            </div>
          )}
          {inputElement}
          {rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
              {rightAddon}
            </div>
          )}
        </div>
      );
    }

    return inputElement;
  },
);

Input.displayName = "Input";

export { Input };
