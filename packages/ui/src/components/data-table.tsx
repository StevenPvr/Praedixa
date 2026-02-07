// Generic data table component for dashboard views
import * as React from "react";
import { cn } from "../utils/cn";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

export interface DataTableColumn<T> {
  /** Unique key for the column (keyof T or custom) */
  key: string;
  /** Display label for column header */
  label: string;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Custom render function for cell content */
  render?: (row: T, index: number) => React.ReactNode;
  /** Header alignment */
  align?: "left" | "center" | "right";
}

export type SortDirection = "asc" | "desc";

export interface DataTableSort {
  key: string;
  direction: SortDirection;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<
  T,
> extends React.HTMLAttributes<HTMLDivElement> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Data rows */
  data: T[];
  /** Current sort state */
  sort?: DataTableSort;
  /** Sort handler */
  onSort?: (sort: DataTableSort) => void;
  /** Pagination config */
  pagination?: DataTablePagination;
  /** Row key extractor */
  getRowKey?: (row: T, index: number) => string | number;
  /** Empty state message */
  emptyMessage?: string;
}

/* ────────────────────────────────────────────── */
/*  Sort icon                                     */
/* ────────────────────────────────────────────── */

function SortIcon({
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

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

function DataTableInner<T>(
  {
    columns,
    data,
    sort,
    onSort,
    pagination,
    getRowKey,
    emptyMessage = "Aucune donnee",
    className,
    ...props
  }: DataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;
    const newDirection: SortDirection =
      sort?.key === column.key && sort.direction === "asc" ? "desc" : "asc";
    onSort({ key: column.key, direction: newDirection });
  };

  const alignClass = (align?: "left" | "center" | "right") => {
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  };

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 0;

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-card border border-gray-200 bg-card",
        className,
      )}
      {...props}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500",
                    alignClass(col.align),
                    col.sortable &&
                      "cursor-pointer select-none hover:text-charcoal",
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
                    <SortIcon
                      active={sort?.key === col.key}
                      direction={sort?.direction}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={getRowKey ? getRowKey(row, index) : index}
                  className={cn(
                    "border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50",
                    index % 2 === 1 && "bg-gray-50",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "whitespace-nowrap px-4 py-3 text-charcoal",
                        alignClass(col.align),
                      )}
                    >
                      {col.render
                        ? col.render(row, index)
                        : String(
                            (row as Record<string, unknown>)[col.key] ?? "",
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Page {pagination.page} sur {totalPages} ({pagination.total}{" "}
            resultats)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Precedent
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Use a wrapper to support generics with forwardRef
export const DataTable = React.forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => React.ReactElement;

(DataTable as { displayName?: string }).displayName = "DataTable";
