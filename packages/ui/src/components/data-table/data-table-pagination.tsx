import * as React from "react";
import { cn } from "../../utils/cn.js";
import type { DataTablePagination } from "./data-table-types.js";
import { getPageNumbers } from "./data-table-utils.js";

interface DataTablePaginationBarProps {
  pagination: DataTablePagination;
  totalPages: number;
}

function DataTablePaginationBarInner({
  pagination,
  totalPages,
}: DataTablePaginationBarProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = React.useMemo(
    () => getPageNumbers(pagination.page, totalPages),
    [pagination.page, totalPages],
  );

  const startItem = (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
      <p className="text-caption text-[var(--ink-tertiary)]">
        {startItem}–{endItem} sur {pagination.total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => pagination.onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className={cn(
            "rounded-[var(--radius-sm,6px)] p-1.5",
            "text-[var(--ink-tertiary)] transition-colors duration-[var(--duration-fast,200ms)]",
            "hover:bg-[var(--surface-interactive)] hover:text-[var(--ink)]",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
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
        {pageNumbers.map((pageNum, i) =>
          pageNum === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1 text-caption text-[var(--ink-placeholder)]"
            >
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => pagination.onPageChange(pageNum as number)}
              className={cn(
                "min-w-[2rem] rounded-[var(--radius-sm,6px)] px-2 py-1 text-caption font-medium transition-colors duration-[var(--duration-fast,200ms)]",
                pageNum === pagination.page
                  ? "bg-[var(--brand)] text-white"
                  : "text-[var(--ink-secondary)] hover:bg-[var(--surface-interactive)]",
              )}
            >
              {pageNum}
            </button>
          ),
        )}
        <button
          onClick={() => pagination.onPageChange(pagination.page + 1)}
          disabled={pagination.page >= totalPages}
          className={cn(
            "rounded-[var(--radius-sm,6px)] p-1.5",
            "text-[var(--ink-tertiary)] transition-colors duration-[var(--duration-fast,200ms)]",
            "hover:bg-[var(--surface-interactive)] hover:text-[var(--ink)]",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
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
  );
}

export const DataTablePaginationBar = React.memo(DataTablePaginationBarInner);
DataTablePaginationBar.displayName = "DataTablePaginationBar";
