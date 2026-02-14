import type * as React from "react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
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
  selectedKeys: Set<string | number>;
  onSelectionChange: (keys: Set<string | number>) => void;
  mode?: "single" | "multiple";
}

export interface DataTableProps<
  T,
> extends React.HTMLAttributes<HTMLDivElement> {
  columns: DataTableColumn<T>[];
  data: T[];
  sort?: DataTableSort;
  onSort?: (sort: DataTableSort) => void;
  pagination?: DataTablePagination;
  getRowKey?: (row: T, index: number) => string | number;
  emptyMessage?: string;
  selection?: DataTableSelection;
  stickyHeader?: boolean;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T, index: number) => void;
  /** Enable row virtualisation (auto-enabled when data.length > 100) */
  virtualise?: boolean;
}
