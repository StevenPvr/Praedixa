import {
  Card,
  CardContent,
  DataTable,
  SkeletonCard,
  type DataTableColumn,
} from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";

interface AsyncDataTableBlockProps<T> {
  title: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  contentClassName?: string;
}

export function AsyncDataTableBlock<T>({
  title,
  loading,
  error,
  onRetry,
  columns,
  data,
  getRowKey,
  contentClassName = "p-0",
}: AsyncDataTableBlockProps<T>) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{title}</p>
      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <ErrorFallback message={error} onRetry={onRetry} />
      ) : (
        <Card className="rounded-2xl shadow-soft">
          <CardContent className={contentClassName}>
            <DataTable columns={columns} data={data} getRowKey={getRowKey} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
