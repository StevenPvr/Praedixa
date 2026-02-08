// Praedixa UI Component Library
// Shared React components for all applications

// Utilities
export { cn } from "./utils/cn";

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
export { Badge, type BadgeProps } from "./components/badge";
export { Input, type InputProps } from "./components/input";
export { Label, type LabelProps } from "./components/label";
export { Spinner } from "./components/spinner";
export {
  Alert,
  AlertTitle,
  AlertDescription,
  type AlertProps,
} from "./components/alert";
export { Avatar, AvatarImage, AvatarFallback } from "./components/avatar";
export { StatCard, type StatCardProps } from "./components/stat-card";
export {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
  type DataTablePagination,
  type DataTableProps,
} from "./components/data-table";
export { StatusBadge, type StatusBadgeProps } from "./components/status-badge";
export {
  PageHeader,
  type PageHeaderProps,
  type Breadcrumb,
} from "./components/page-header";

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

// Sprint 5 components
export {
  HeatmapGrid,
  type HeatmapCell,
  type HeatmapGridProps,
} from "./components/heatmap-grid";
export { TabBar, type Tab, type TabBarProps } from "./components/tab-bar";
export {
  WaterfallChart,
  type WaterfallItem,
  type WaterfallChartProps,
} from "./components/waterfall-chart";
export {
  ParetoChart,
  type ParetoPoint,
  type ParetoChartProps,
} from "./components/pareto-chart";
export { FormField, type FormFieldProps } from "./components/form-field";
export {
  DateRangePicker,
  type DateRange,
  type DateRangePickerProps,
} from "./components/date-range-picker";
export {
  SelectDropdown,
  type SelectOption,
  type SelectDropdownProps,
} from "./components/select-dropdown";
export {
  MetricCard,
  type MetricCardProps,
  type MetricStatus,
} from "./components/metric-card";

// Hooks
export { useMediaQuery } from "./hooks/use-media-query";
