import * as React from "react";
import { cn } from "../../utils/cn";
import type { DataTablePagination } from "./data-table-types";
import { getPageNumbers } from "./data-table-utils";

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

  return (
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
        {pageNumbers.map((pageNum, i) =>
          pageNum === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">
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
  );
}

export const DataTablePaginationBar = React.memo(DataTablePaginationBarInner);
DataTablePaginationBar.displayName = "DataTablePaginationBar";
