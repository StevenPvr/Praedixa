import * as React from "react";
import { cn } from "../../utils/cn";
import type { DataTableColumn, DataTableProps } from "./data-table-types";
import { DataTableHeader } from "./data-table-header";
import { DataTableBody } from "./data-table-body";
import { DataTablePaginationBar } from "./data-table-pagination";

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
  const resizeCleanupRef = React.useRef<(() => void) | null>(null);

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

  const handleSelectAll = React.useCallback(() => {
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
  }, [selection, allSelected, rowKeys]);

  const selectionMode = selection?.mode ?? "multiple";

  const handleSelectRow = React.useCallback(
    (key: string | number) => {
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
    },
    [selection, selectionMode],
  );

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
        resizeCleanupRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      resizeCleanupRef.current = handleMouseUp;
    },
    [],
  );

  React.useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

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
          <DataTableHeader
            columns={columns}
            sort={sort}
            onSort={onSort}
            selection={selection}
            selectionMode={selectionMode}
            allSelected={allSelected ?? false}
            someSelected={someSelected ?? false}
            onSelectAll={handleSelectAll}
            stickyHeader={stickyHeader}
            onResizeStart={handleResizeStart}
          />
          <DataTableBody
            columns={columns}
            data={data}
            selection={selection}
            getRowKey={getRowKey}
            emptyMessage={emptyMessage}
            onRowClick={onRowClick}
            onSelectRow={handleSelectRow}
            totalCols={totalCols}
          />
        </table>
      </div>

      {pagination && (
        <DataTablePaginationBar
          pagination={pagination}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}

// React.forwardRef erases generic type parameters, so we cast the result
// back to a generic function signature to preserve type safety for callers.
export const DataTable = React.forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => React.ReactElement;

(DataTable as { displayName?: string }).displayName = "DataTable";
