/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

/**
 * Centralized mock factories for @praedixa/ui components.
 *
 * These are registered on globalThis.__mocks in the vitest setup file,
 * so they can be referenced inside vi.mock() factories without import issues.
 *
 * Usage in test files:
 *   vi.mock("@praedixa/ui", () => globalThis.__mocks.createUiMocks());
 */

function StatCardMock(props: {
  label: string;
  value: string;
  variant?: string;
  icon?: React.ReactNode;
}) {
  return React.createElement(
    "div",
    { "data-testid": `stat-${props.label}`, "data-variant": props.variant },
    props.value,
  );
}

function CardMock(props: { children: React.ReactNode; className?: string }) {
  return React.createElement(
    "div",
    { "data-testid": "card", className: props.className },
    props.children,
  );
}

function ButtonMock(props: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  [key: string]: any;
}) {
  const { children, ...rest } = props;
  return React.createElement("button", rest, children);
}

function DataTableMock(props: {
  data: Array<Record<string, any>>;
  columns?: Array<{
    key: string;
    label?: string;
    render?: (row: Record<string, any>) => React.ReactNode;
  }>;
  getRowKey?: (row: Record<string, any>) => string;
  emptyMessage?: string;
  pagination?: {
    page: number;
    total: number;
    onPageChange: (p: number) => void;
  };
}) {
  const { data, columns, getRowKey, emptyMessage, pagination } = props;
  const first = data[0];
  const children: React.ReactNode[] = [];

  if (data.length === 0) {
    children.push(
      React.createElement("p", { key: "empty" }, emptyMessage ?? "No data"),
    );
  } else {
    children.push(
      React.createElement("p", { key: "count" }, `${data.length} rows`),
    );
  }

  if (first && getRowKey) {
    children.push(
      React.createElement(
        "div",
        { key: "row-key", "data-testid": "row-key" },
        getRowKey(first),
      ),
    );
  }

  if (first && columns) {
    columns.forEach((col) => {
      children.push(
        React.createElement(
          "div",
          { key: col.key, "data-testid": `cell-${col.key}` },
          col.render ? col.render(first) : String(first[col.key] ?? ""),
        ),
      );
    });
  }

  if (pagination) {
    children.push(
      React.createElement(
        "div",
        { key: "pagination", "data-testid": "pagination" },
        `Page ${pagination.page} / total ${pagination.total}`,
        React.createElement(
          "button",
          { key: "p2", onClick: () => pagination.onPageChange(2) },
          "Page 2",
        ),
      ),
    );
  }

  return React.createElement(
    "div",
    { "data-testid": "data-table" },
    ...children,
  );
}

function SkeletonCardMock() {
  return React.createElement("div", {
    "data-testid": "skeleton-card",
    role: "status",
    "aria-label": "Chargement",
  });
}

function SkeletonChartMock() {
  return React.createElement("div", { "data-testid": "skeleton-chart" });
}

function SkeletonTableMock() {
  return React.createElement("div", { "data-testid": "skeleton-table" });
}

function cnMock(...inputs: unknown[]) {
  return inputs.filter(Boolean).join(" ");
}

export function createUiMocks() {
  return {
    StatCard: StatCardMock,
    Card: CardMock,
    Button: ButtonMock,
    DataTable: DataTableMock,
    SkeletonCard: SkeletonCardMock,
    SkeletonChart: SkeletonChartMock,
    SkeletonTable: SkeletonTableMock,
    cn: cnMock,
  };
}

export {
  StatCardMock,
  CardMock,
  ButtonMock,
  DataTableMock,
  SkeletonCardMock,
  SkeletonChartMock,
  SkeletonTableMock,
  cnMock,
};
