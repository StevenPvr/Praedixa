// Praedixa UI Component Library
// Shared React components for all applications

// Utilities
export { cn } from "./utils/cn.js";
export { formatRelativeTime } from "./utils/date.js";

// Components
export { Button, type ButtonProps } from "./components/button.js";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card.js";
export {
  StatCard,
  type StatCardProps,
  type MetricStatus,
  type TrendDirection,
} from "./components/stat-card.js";
export {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
  type DataTablePagination,
  type DataTableSelection,
  type DataTableProps,
  type SortDirection,
} from "./components/data-table/index.js";

export {
  Skeleton,
  SkeletonCard,
  SkeletonMetricRow,
  SkeletonTable,
  SkeletonChart,
  type SkeletonProps,
  type SkeletonCardProps,
  type SkeletonMetricRowProps,
  type SkeletonTableProps,
  type SkeletonChartProps,
} from "./components/skeleton.js";

// Logo
export { PraedixaLogo } from "./components/praedixa-logo.js";

// Hooks
export { useMediaQuery } from "./hooks/use-media-query.js";
