// Styled native select dropdown
import * as React from "react";
import { cn } from "@praedixa/ui";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectDropdownProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

const SelectDropdown = React.forwardRef<HTMLDivElement, SelectDropdownProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder,
      label,
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    const selectId = React.useId();

    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-1.5", className)}
        {...props}
      >
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-charcoal"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full appearance-none rounded-md border border-gray-200 bg-white py-2 pl-3 pr-9 text-sm text-charcoal transition-colors",
              "focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100",
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
            )}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron */}
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    );
  },
);

SelectDropdown.displayName = "SelectDropdown";

export { SelectDropdown };
