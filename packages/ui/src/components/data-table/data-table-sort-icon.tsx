import { cn } from "../../utils/cn";
import type { SortDirection } from "./data-table-types";

export function DataTableSortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction?: SortDirection;
}) {
  return (
    <svg
      className={cn(
        "ml-1 inline-block h-3.5 w-3.5",
        active ? "text-charcoal" : "text-gray-300",
      )}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3L4 6.5h6L7 3z"
        fill={active && direction === "asc" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="0.5"
      />
      <path
        d="M7 11L4 7.5h6L7 11z"
        fill={active && direction === "desc" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="0.5"
      />
    </svg>
  );
}
