import * as React from "react";

interface DataTableCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  "aria-label"?: string;
}

export function DataTableCheckbox({
  checked,
  indeterminate,
  onChange,
  ...props
}: DataTableCheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate ?? false;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
      aria-label={props["aria-label"]}
      aria-checked={indeterminate ? "mixed" : undefined}
    />
  );
}
