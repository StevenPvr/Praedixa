"use client";

import { useMemo } from "react";
import type { DatasetDataRow } from "@praedixa/shared-types";
import { DataTable, type DataTableColumn } from "@praedixa/ui";
import { PiiMaskIndicator } from "./pii-mask-indicator";

interface DatasetTableProps {
  /** Column names in display order */
  columns: string[];
  /** Data rows (dynamic key/value pairs) */
  rows: DatasetDataRow[];
  /** Columns that are PII-masked */
  maskedColumns: string[];
  /** Pagination */
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function DatasetTable({
  columns: columnNames,
  rows,
  maskedColumns,
  total,
  page,
  pageSize,
  onPageChange,
}: DatasetTableProps) {
  const maskedSet = useMemo(() => new Set(maskedColumns), [maskedColumns]);

  const tableColumns = useMemo<DataTableColumn<DatasetDataRow>[]>(
    () =>
      columnNames.map((name) => ({
        key: name,
        label: name,
        sortable: false,
        render: maskedSet.has(name)
          ? () => <PiiMaskIndicator />
          : (row: DatasetDataRow) => {
              const value = row[name];
              if (value == null)
                return <span className="text-gray-300">-</span>;
              return String(value);
            },
      })),
    [columnNames, maskedSet],
  );

  return (
    <div className="overflow-x-auto">
      <DataTable<DatasetDataRow>
        columns={tableColumns}
        data={rows}
        getRowKey={(_, index) => index}
        pagination={{ page, pageSize, total, onPageChange }}
        emptyMessage="Aucune donnee dans ce dataset"
      />
    </div>
  );
}
