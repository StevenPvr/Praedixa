// Generic data table component for dashboard views
import * as React from "react";
import { cn } from "../utils/cn";

/* ────────────────────────────────────────────── */
/*  Inline Checkbox (internal to DataTable)       */
/* ────────────────────────────────────────────── */

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  "aria-label"?: string;
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  ...props
}: CheckboxProps) {
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
  /** Initial column width */
  width?: number | string;
  /** Minimum column width (px) when resizing */
  minWidth?: number;
  /** Maximum column width (px) when resizing */
  maxWidth?: number;
  /** Whether this column can be resized via drag handle */
  resizable?: boolean;
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

export interface DataTableSelection {
  /** Set of selected row keys */
  selectedKeys: Set<string | number>;
  /** Called when selection changes */
  onSelectionChange: (keys: Set<string | number>) => void;
  /** Selection mode: "multiple" (default) shows checkboxes, "single" allows one row */
  mode?: "single" | "multiple";
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
  /** Selection config — enables checkbox column */
  selection?: DataTableSelection;
  /** Make thead sticky when scrolling */
  stickyHeader?: boolean;
  /** Toolbar rendered above the table, inside the container */
  toolbar?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
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
/*  Page number helper                            */
/* ────────────────────────────────────────────── */

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push("...", total);
  } else if (current >= total - 3) {
    pages.push(1, "...");
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }
  return pages;
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
    selection,
    stickyHeader = false,
    toolbar,
    onRowClick,
    className,
    ...props
  }: DataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const [columnWidths, setColumnWidths] = React.useState<
    Record<string, number>
  >({});
  const resizingRef = React.useRef<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);

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

  /* ── Selection helpers ────────────────────── */
  const rowKeys = React.useMemo(() => {
    if (!selection) return [];
    return data.map((row, i) => (getRowKey ? getRowKey(row, i) : i));
  }, [data, getRowKey, selection]);

  const allSelected =
    selection &&
    data.length > 0 &&
    rowKeys.every((k) => selection.selectedKeys.has(k));
  const someSelected =
    selection &&
    !allSelected &&
    rowKeys.some((k) => selection.selectedKeys.has(k));

  const handleSelectAll = () => {
    if (!selection) return;
    if (allSelected) {
      const next = new Set(selection.selectedKeys);
      for (const k of rowKeys) next.delete(k);
      selection.onSelectionChange(next);
    } else {
      const next = new Set(selection.selectedKeys);
      for (const k of rowKeys) next.add(k);
      selection.onSelectionChange(next);
    }
  };

  const selectionMode = selection?.mode ?? "multiple";

  const handleSelectRow = (key: string | number) => {
    if (!selection) return;
    if (selectionMode === "single") {
      const next = selection.selectedKeys.has(key)
        ? new Set<string | number>()
        : new Set<string | number>([key]);
      selection.onSelectionChange(next);
    } else {
      const next = new Set(selection.selectedKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      selection.onSelectionChange(next);
    }
  };

  /* ── Column resize handlers ───────────────── */
  const hasAnyResizable = columns.some((c) => c.resizable);

  const handleResizeStart = React.useCallback(
    (e: React.MouseEvent, col: DataTableColumn<T>, currentWidth: number) => {
      e.preventDefault();
      e.stopPropagation();
      const minW = col.minWidth ?? 60;
      const maxW = col.maxWidth ?? Infinity;
      resizingRef.current = {
        key: col.key,
        startX: e.clientX,
        startWidth: currentWidth,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = ev.clientX - resizingRef.current.startX;
        const clamped = Math.min(
          maxW,
          Math.max(minW, resizingRef.current.startWidth + delta),
        );
        setColumnWidths((prev) => ({
          ...prev,
          [resizingRef.current!.key]: clamped,
        }));
      };

      const handleMouseUp = () => {
        resizingRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [],
  );

  const totalCols = columns.length + (selection ? 1 : 0);

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-200/80 bg-card shadow-soft",
        className,
      )}
      {...props}
    >
      {toolbar}
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm"
          style={hasAnyResizable ? { tableLayout: "fixed" } : undefined}
        >
          {hasAnyResizable && (
            <colgroup>
              {selection && <col style={{ width: 40 }} />}
              {columns.map((col) => {
                const w = columnWidths[col.key] ?? col.width;
                return (
                  <col
                    key={col.key}
                    style={
                      w != null
                        ? { width: typeof w === "number" ? w : w }
                        : undefined
                    }
                  />
                );
              })}
            </colgroup>
          )}
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
                  <Checkbox
                    checked={allSelected ?? false}
                    indeterminate={someSelected ?? false}
                    onChange={handleSelectAll}
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
                    col.sortable &&
                      "cursor-pointer select-none hover:text-charcoal",
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
                    <SortIcon
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
                        handleResizeStart(e, col, th?.offsetWidth ?? 100);
                      }}
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
                  colSpan={totalCols}
                  className="px-4 py-16 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const rowKey = getRowKey ? getRowKey(row, index) : index;
                const isSelected = selection?.selectedKeys.has(rowKey);
                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      "border-b border-gray-100/80 last:border-0 transition-colors duration-75",
                      isSelected
                        ? "bg-amber-50/50 hover:bg-amber-50/70"
                        : "hover:bg-gray-50/80",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={() => onRowClick?.(row, index)}
                  >
                    {selection && (
                      <td className="w-10 px-3 py-2.5">
                        <Checkbox
                          checked={isSelected ?? false}
                          onChange={() => handleSelectRow(rowKey)}
                          aria-label={`Selectionner ligne ${index + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "whitespace-nowrap px-4 py-2.5 text-sm text-charcoal",
                          alignClass(col.align),
                          col.resizable && "overflow-hidden text-ellipsis",
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">{pagination.total} resultats</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Page precedente"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 4L6 8l4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {getPageNumbers(pagination.page, totalPages).map((pageNum, i) =>
              pageNum === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-1 text-sm text-gray-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum as number)}
                  className={cn(
                    "min-w-[2rem] rounded-md px-2 py-1 text-sm font-medium transition-colors",
                    pageNum === pagination.page
                      ? "bg-charcoal text-white"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  {pageNum}
                </button>
              ),
            )}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Page suivante"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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
