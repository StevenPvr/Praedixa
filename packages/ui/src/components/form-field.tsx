// Form field wrapper with label, input, and error message
import * as React from "react";
import { cn } from "../utils/cn";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    { label, htmlFor, error, required, hint, children, className, ...props },
    ref,
  ) => {
    const errorId = `${htmlFor}-error`;
    const hintId = `${htmlFor}-hint`;
    const describedBy = [error && errorId, hint && hintId]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-charcoal"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>

        {hint && (
          <p id={hintId} className="text-xs text-gray-400">
            {hint}
          </p>
        )}

        <div aria-describedby={describedBy || undefined}>{children}</div>

        {error && (
          <p id={errorId} className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export { FormField };
