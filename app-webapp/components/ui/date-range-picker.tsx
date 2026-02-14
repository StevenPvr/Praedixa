// Date range picker with two native date inputs
import * as React from "react";
import { cn } from "@praedixa/ui";

export interface DateRange {
  from: string;
  to: string;
}

export interface DateRangePickerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  value: DateRange;
  onChange: (range: DateRange) => void;
  minDate?: string;
  maxDate?: string;
}

const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
  ({ value, onChange, minDate, maxDate, className, ...props }, ref) => {
    const inputClasses =
      "rounded-md border border-border bg-card px-3 py-2 text-sm text-ink transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

    function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
      const from = e.target.value;
      // If new from is after current to, adjust to
      const to = from > value.to && value.to ? from : value.to;
      onChange({ from, to });
    }

    function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
      const to = e.target.value;
      // If new to is before current from, adjust from
      const from = to < value.from && value.from ? to : value.from;
      onChange({ from, to });
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-3", className)}
        {...props}
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="date-range-from"
            className="text-xs font-medium text-ink-secondary"
          >
            Du
          </label>
          <input
            id="date-range-from"
            type="date"
            value={value.from}
            onChange={handleFromChange}
            min={minDate}
            max={maxDate}
            className={inputClasses}
          />
        </div>

        <span className="mt-5 text-ink-secondary">—</span>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="date-range-to"
            className="text-xs font-medium text-ink-secondary"
          >
            Au
          </label>
          <input
            id="date-range-to"
            type="date"
            value={value.to}
            onChange={handleToChange}
            min={minDate}
            max={maxDate}
            className={inputClasses}
          />
        </div>
      </div>
    );
  },
);

DateRangePicker.displayName = "DateRangePicker";

export { DateRangePicker };
