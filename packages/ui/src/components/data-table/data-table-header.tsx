import * as React from "react";
import { cn } from "../../utils/cn";
import type {
  DataTableColumn,
  DataTableSort,
  DataTableSelection,
  SortDirection,
} from "./data-table-types";
import { alignClass } from "./data-table-utils";
import { DataTableCheckbox } from "./data-table-checkbox";
import { DataTableSortIcon } from "./data-table-sort-icon";

interface DataTableHeaderProps<T> {
  columns: DataTableColumn<T>[];
  sort?: DataTableSort;
  onSort?: (sort: DataTableSort) => void;
  selection?: DataTableSelection;
  selectionMode: "single" | "multiple";
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: () => void;
  stickyHeader: boolean;
  onResizeStart: (
    e: React.MouseEvent,
    col: DataTableColumn<T>,
    currentWidth: number,
  ) => void;
}

function DataTableHeaderInner<T>({
  columns,
  sort,
  onSort,
  selection,
  selectionMode,
  allSelected,
  someSelected,
  onSelectAll,
  stickyHeader,
  onResizeStart,
}: DataTableHeaderProps<T>) {
  const handleSort = React.useCallback(
    (column: DataTableColumn<T>) => {
      if (!column.sortable || !onSort) return;
      const newDirection: SortDirection =
        sort?.key === column.key && sort.direction === "asc" ? "desc" : "asc";
      onSort({ key: column.key, direction: newDirection });
    },
    [sort, onSort],
  );

  return (
    <thead
      className={cn(
        stickyHeader && [
          "sticky top-0 z-10",
          "bg-[var(--glass-bg,white)] backdrop-blur-xl",
          "shadow-[0_1px_0_var(--border)]",
        ],
      )}
    >
      <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken,var(--card-bg-muted))]">
        {selection && selectionMode === "multiple" && (
          <th className="w-10 px-3 py-2.5">
            <DataTableCheckbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={onSelectAll}
              aria-label="Tout selectionner"
            />
          </th>
        )}
        {selection && selectionMode === "single" && (
          <th className="w-10 px-3 py-2.5" />
        )}
        {columns.map((col) => (
          <th
            key={col.key}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5",
              "text-overline text-[var(--ink-tertiary)]",
              alignClass(col.align),
              col.sortable &&
                "cursor-pointer select-none hover:text-[var(--ink)]",
              col.resizable && "overflow-hidden text-ellipsis",
            )}
            onClick={() => handleSort(col)}
            aria-sort={
              sort?.key === col.key
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : undefined
            }
          >
            {col.label}
            {col.sortable && (
              <DataTableSortIcon
                active={sort?.key === col.key}
                direction={sort?.direction}
              />
            )}
            {col.resizable && (
              <span
                role="separator"
                aria-orientation="vertical"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full opacity-0 transition-opacity hover:opacity-100 bg-[var(--brand)]"
                onMouseDown={(e) => {
                  const th = e.currentTarget.parentElement;
                  onResizeStart(e, col, th?.offsetWidth ?? 100);
                }}
              />
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export const DataTableHeader = React.memo(
  DataTableHeaderInner,
) as typeof DataTableHeaderInner;
(DataTableHeader as { displayName?: string }).displayName = "DataTableHeader";
