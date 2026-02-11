// Praedixa UI Component Library
// Shared React components for all applications

// Utilities
export { cn } from "./utils/cn";
export { formatRelativeTime } from "./utils/date";

// Components
export { Button, type ButtonProps } from "./components/button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card";
export { StatCard, type StatCardProps } from "./components/stat-card";
export {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
  type DataTablePagination,
  type DataTableSelection,
  type DataTableProps,
  type SortDirection,
} from "./components/data-table/index";

export {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  type SkeletonProps,
  type SkeletonCardProps,
  type SkeletonTableProps,
  type SkeletonChartProps,
} from "./components/skeleton";

// Hooks
export { useMediaQuery } from "./hooks/use-media-query";
