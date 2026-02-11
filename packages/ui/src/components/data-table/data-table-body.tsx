import * as React from "react";
import { cn } from "../../utils/cn";
import type { DataTableColumn, DataTableSelection } from "./data-table-types";
import { alignClass } from "./data-table-utils";
import { DataTableCheckbox } from "./data-table-checkbox";

interface DataTableBodyProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  selection?: DataTableSelection;
  getRowKey?: (row: T, index: number) => string | number;
  emptyMessage: string;
  onRowClick?: (row: T, index: number) => void;
  onSelectRow: (key: string | number) => void;
  totalCols: number;
}

function DataTableBodyInner<T>({
  columns,
  data,
  selection,
  getRowKey,
  emptyMessage,
  onRowClick,
  onSelectRow,
  totalCols,
}: DataTableBodyProps<T>) {
  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={totalCols}
            className="px-4 py-16 text-center text-gray-400"
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {data.map((row, index) => {
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
                  "whitespace-nowrap px-4 py-2.5 text-sm text-charcoal",
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
