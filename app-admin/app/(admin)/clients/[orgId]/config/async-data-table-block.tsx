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

export function AsyncDataTableBlock<T>(
  props: Readonly<AsyncDataTableBlockProps<T>>,
) {
  const {
    title,
    loading,
    error,
    onRetry,
    columns,
    data,
    getRowKey,
    contentClassName = "p-0",
  } = props;
  let content;

  if (loading) {
    content = <SkeletonCard />;
  } else if (error) {
    content = <ErrorFallback message={error} onRetry={onRetry} />;
  } else {
    content = (
      <Card className="rounded-2xl shadow-soft">
        <CardContent className={contentClassName}>
          <DataTable columns={columns} data={data} getRowKey={getRowKey} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{title}</p>
      {content}
    </div>
  );
}
