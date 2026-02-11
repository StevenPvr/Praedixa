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
      className={
        stickyHeader
          ? "sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          : undefined
      }
    >
      <tr className="border-b border-gray-200 bg-gray-50/80">
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
              "relative whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500",
              alignClass(col.align),
              col.sortable && "cursor-pointer select-none hover:text-charcoal",
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
                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-amber-300"
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
