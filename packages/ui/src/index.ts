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

// Hooks
export { useMediaQuery } from "./hooks/use-media-query";
