import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "../../utils/cn";
import type { DataTableColumn, DataTableSelection } from "./data-table-types";
import { alignClass } from "./data-table-utils";
import { DataTableCheckbox } from "./data-table-checkbox";

const ROW_HEIGHT = 36;

interface DataTableBodyProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  selection?: DataTableSelection;
  getRowKey?: (row: T, index: number) => string | number;
  emptyMessage: string;
  onRowClick?: (row: T, index: number) => void;
  onSelectRow: (key: string | number) => void;
  totalCols: number;
  virtualise?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

const cellBaseClass = "whitespace-nowrap text-body-compact text-[var(--ink)]";
const cellCompactClass = "px-3 py-2";
const cellDefaultClass = "px-4 py-2.5";

function DataTableBodyInner<T>({
  columns,
  data,
  selection,
  getRowKey,
  emptyMessage,
  onRowClick,
  onSelectRow,
  totalCols,
  virtualise,
  scrollRef,
}: DataTableBodyProps<T>) {
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollRef?.current ?? null,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const virtualItems = virtualise ? rowVirtualizer.getVirtualItems() : [];
  const totalSize = virtualise ? rowVirtualizer.getTotalSize() : 0;

  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={totalCols}
            className={cn(
              "text-center text-[var(--ink-placeholder)]",
              virtualise ? "px-3 py-12" : "px-4 py-16",
            )}
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  if (virtualise && scrollRef && virtualItems.length > 0) {
    const first = virtualItems[0];
    const last = virtualItems[virtualItems.length - 1];

    return (
      <tbody>
        {first && first.start > 0 && (
          <tr aria-hidden>
            <td
              colSpan={totalCols}
              className="p-0 border-none"
              style={{ height: first.start, lineHeight: 0 }}
            />
          </tr>
        )}
        {virtualItems.map((virtualRow) => {
          const index = virtualRow.index;
          const row = data[index]!;
          const rowKey = getRowKey ? getRowKey(row, index) : index;
          const isSelected = selection?.selectedKeys.has(rowKey);
          return (
            <tr
              key={rowKey}
              className={cn(
                "border-b border-[var(--border-subtle)] last:border-0",
                "transition-colors duration-[var(--duration-instant,60ms)]",
                isSelected
                  ? "bg-[var(--brand-50)] hover:bg-[var(--brand-100)]"
                  : "hover:bg-[var(--surface-interactive)]",
                onRowClick && "cursor-pointer",
              )}
              style={{ height: ROW_HEIGHT }}
              onClick={() => onRowClick?.(row, index)}
            >
              {selection && (
                <td className={cn("w-10", cellCompactClass)}>
                  <DataTableCheckbox
                    checked={isSelected ?? false}
                    onChange={() => onSelectRow(rowKey)}
                    aria-label={`Selectionner ligne ${index + 1}`}
                  />
                </td>
              )}
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    cellBaseClass,
                    cellCompactClass,
                    alignClass(col.align),
                    col.resizable && "overflow-hidden text-ellipsis",
                  )}
                >
                  {col.render
                    ? col.render(row, index)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          );
        })}
        {last && last.end < totalSize && (
          <tr aria-hidden>
            <td
              colSpan={totalCols}
              className="p-0 border-none"
              style={{ height: totalSize - last.end, lineHeight: 0 }}
            />
          </tr>
        )}
      </tbody>
    );
  }

  const cellClass = cellDefaultClass;
  return (
    <tbody>
      {data.map((row, index) => {
        const rowKey = getRowKey ? getRowKey(row, index) : index;
        const isSelected = selection?.selectedKeys.has(rowKey);
        return (
          <tr
            key={rowKey}
            className={cn(
              "border-b border-[var(--border-subtle)] last:border-0",
              "transition-colors duration-[var(--duration-instant,60ms)]",
              isSelected
                ? "bg-[var(--brand-50)] hover:bg-[var(--brand-100)]"
                : "hover:bg-[var(--surface-interactive)]",
              onRowClick && "cursor-pointer",
            )}
            onClick={() => onRowClick?.(row, index)}
          >
            {selection && (
              <td className={cn("w-10", cellClass)}>
                <DataTableCheckbox
                  checked={isSelected ?? false}
                  onChange={() => onSelectRow(rowKey)}
                  aria-label={`Selectionner ligne ${index + 1}`}
                />
              </td>
            )}
            {columns.map((col) => (
              <td
                key={col.key}
                className={cn(
                  cellBaseClass,
                  cellClass,
                  alignClass(col.align),
                  col.resizable && "overflow-hidden text-ellipsis",
                )}
              >
                {col.render
                  ? col.render(row, index)
                  : String((row as Record<string, unknown>)[col.key] ?? "")}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}

export const DataTableBody = React.memo(
  DataTableBodyInner,
) as typeof DataTableBodyInner;
(DataTableBody as { displayName?: string }).displayName = "DataTableBody";
