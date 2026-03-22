import * as React from "react";

type DataTableToolbarProps = Readonly<{
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  children?: React.ReactNode;
}>;

export function DataTableToolbar({
  selectedCount,
  totalCount,
  onClearSelection,
  children,
}: DataTableToolbarProps) {
  const hasMultipleSelections = selectedCount > 1;
  const toolbarActions = children ? (
    <div className="flex items-center gap-2">{children}</div>
  ) : null;

  return (
    <div className="flex items-center justify-between border-b border-border bg-primary-50/50 px-4 py-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-ink-secondary">
          {selectedCount} sur {totalCount} selectionne
          {hasMultipleSelections ? "s" : ""}
        </span>
        <button
          onClick={onClearSelection}
          className="text-xs text-ink-tertiary underline hover:text-ink-secondary"
        >
          Tout deselectionner
        </button>
      </div>
      {toolbarActions}
    </div>
  );
}
