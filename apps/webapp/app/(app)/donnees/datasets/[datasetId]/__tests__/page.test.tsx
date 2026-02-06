import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DatasetDetailPage from "../page";

/* ─── Hoisted mocks ─────────────────────────────── */

const mockUseApiGet = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

let mockDatasetId = "550e8400-e29b-41d4-a716-446655440000";

vi.mock("next/navigation", () => ({
  useParams: () => ({ datasetId: mockDatasetId }),
}));

vi.mock("@/lib/uuid", () => ({
  isUuid: (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
}));

vi.mock("@praedixa/ui", () => ({
  PageHeader: ({
    title,
    children,
  }: {
    title: string;
    children?: React.ReactNode;
  }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {children}
    </div>
  ),
  SkeletonTable: ({ rows, columns }: { rows: number; columns: number }) => (
    <div data-testid="skeleton-table" data-rows={rows} data-columns={columns} />
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({
    message,
    onRetry,
  }: {
    message?: string;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-fallback">
      {message}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

vi.mock("@/components/donnees/dataset-status-badge", () => ({
  DatasetStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="dataset-status-badge">{status}</span>
  ),
}));

vi.mock("@/components/donnees/column-metadata-table", () => ({
  ColumnMetadataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="column-metadata-table">{data.length} columns</div>
  ),
}));

vi.mock("@/components/donnees/dataset-table", () => ({
  DatasetTable: ({ columns, rows }: { columns: string[]; rows: unknown[] }) => (
    <div data-testid="dataset-table">
      {columns.length} cols, {rows.length} rows
    </div>
  ),
}));

vi.mock("@/components/donnees/ingestion-history-list", () => ({
  IngestionHistoryList: ({ entries }: { entries: unknown[] }) => (
    <div data-testid="ingestion-history-list">{entries.length} entries</div>
  ),
}));

/* ─── Helpers ────────────────────────────────────── */

const DATASET_ID = "550e8400-e29b-41d4-a716-446655440000";

const DEFAULT_HOOK = {
  loading: true,
  data: null,
  error: null,
  refetch: vi.fn(),
};

/**
 * URL-based mock: deterministic regardless of React 19 StrictMode double-invoke.
 * Maps the first argument (URL string or null) to a specific response.
 */
function mockApiGetResponses({
  dataset = DEFAULT_HOOK,
  preview = DEFAULT_HOOK,
  ingestion = DEFAULT_HOOK,
}: {
  dataset?: {
    loading: boolean;
    data: unknown;
    error: string | null;
    refetch: ReturnType<typeof vi.fn>;
  };
  preview?: {
    loading: boolean;
    data: unknown;
    error: string | null;
    refetch: ReturnType<typeof vi.fn>;
  };
  ingestion?: {
    loading: boolean;
    data: unknown;
    error: string | null;
    refetch: ReturnType<typeof vi.fn>;
  };
}) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url === null) return DEFAULT_HOOK;
    if (url.includes("/ingestion-log")) return ingestion;
    if (url.includes("/data?")) return preview;
    return dataset;
  });
}

const mockDataset = {
  id: DATASET_ID,
  name: "effectifs",
  status: "active",
  tableName: "tbl_effectifs",
  temporalIndex: "date",
  groupBy: ["departement", "site"],
  rowCount: 5000,
  columns: [
    {
      id: "col-1",
      datasetId: DATASET_ID,
      name: "date",
      dtype: "date",
      role: "temporal_index",
      nullable: false,
      rulesOverride: null,
      ordinalPosition: 1,
    },
    {
      id: "col-2",
      datasetId: DATASET_ID,
      name: "nb_employes",
      dtype: "float",
      role: "target",
      nullable: true,
      rulesOverride: null,
      ordinalPosition: 2,
    },
  ],
};

const mockPreview = {
  columns: ["date", "departement", "nb_employes"],
  rows: [{ date: "2026-02-01", departement: "Logistique", nb_employes: 42 }],
  maskedColumns: [],
  total: 1,
};

const mockIngestion = {
  entries: [
    {
      id: "ing-1",
      datasetId: DATASET_ID,
      mode: "incremental",
      rowsReceived: 500,
      rowsTransformed: 480,
      startedAt: "2026-02-05T14:00:00Z",
      completedAt: "2026-02-05T14:05:00Z",
      status: "success",
      errorMessage: null,
      triggeredBy: "shift_cron",
      requestId: "req-1",
    },
  ],
  total: 1,
};

/* ─── Tests ──────────────────────────────────────── */

describe("DatasetDetailPage", () => {
  beforeEach(() => {
    mockUseApiGet.mockReset();
  });

  // --- Loading states ---

  it("shows skeleton card when dataset is loading", () => {
    mockApiGetResponses({
      dataset: { loading: true, data: null, error: null, refetch: vi.fn() },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("shows skeleton table when preview is loading", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: { loading: true, data: null, error: null, refetch: vi.fn() },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  // --- Error states ---

  it("shows error fallback when dataset fetch fails", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: null,
        error: "Not found",
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    const errorFallbacks = screen.getAllByTestId("error-fallback");
    expect(errorFallbacks[0]).toHaveTextContent("Not found");
  });

  it("shows error fallback when preview fetch fails", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: null,
        error: "Preview error",
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByText("Preview error")).toBeInTheDocument();
  });

  it("shows error fallback when ingestion fetch fails", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: null,
        error: "Ingestion error",
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByText("Ingestion error")).toBeInTheDocument();
  });

  // --- Success state ---

  it("renders dataset name as heading when loaded", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(
      screen.getByRole("heading", { name: "effectifs" }),
    ).toBeInTheDocument();
  });

  it("renders DatasetStatusBadge", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByTestId("dataset-status-badge")).toHaveTextContent(
      "active",
    );
  });

  it("renders metadata items: Table, Index temporel, Regroupements, Lignes", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("tbl_effectifs")).toBeInTheDocument();
    expect(screen.getByText("Index temporel")).toBeInTheDocument();
    expect(screen.getByText("date")).toBeInTheDocument();
    expect(screen.getByText("Regroupements")).toBeInTheDocument();
    expect(screen.getByText("departement, site")).toBeInTheDocument();
    expect(screen.getByText("Lignes")).toBeInTheDocument();
  });

  it("renders 'Aucun' when groupBy is empty", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: { ...mockDataset, groupBy: [] },
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByText("Aucun")).toBeInTheDocument();
  });

  it("renders ColumnMetadataTable with correct data", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByTestId("column-metadata-table")).toHaveTextContent(
      "2 columns",
    );
  });

  it("renders Schema des colonnes section heading", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByText("Schema des colonnes")).toBeInTheDocument();
  });

  it("renders DatasetTable when preview loads", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByTestId("dataset-table")).toBeInTheDocument();
  });

  it("renders IngestionHistoryList when ingestion loads", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByTestId("ingestion-history-list")).toHaveTextContent(
      "1 entries",
    );
  });

  it("renders section headings for data preview and ingestion history", () => {
    mockApiGetResponses({
      dataset: {
        loading: false,
        data: mockDataset,
        error: null,
        refetch: vi.fn(),
      },
      preview: {
        loading: false,
        data: mockPreview,
        error: null,
        refetch: vi.fn(),
      },
      ingestion: {
        loading: false,
        data: mockIngestion,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<DatasetDetailPage />);
    expect(screen.getByText("Apercu des donnees")).toBeInTheDocument();
  });

  it("calls useApiGet with encoded datasetId in URL", () => {
    mockApiGetResponses({});
    render(<DatasetDetailPage />);

    // First call should be for dataset detail
    expect(mockUseApiGet).toHaveBeenCalledWith(
      `/api/v1/datasets/${encodeURIComponent(DATASET_ID)}`,
    );
  });
});

describe("DatasetDetailPage — invalid UUID", () => {
  beforeEach(() => {
    mockUseApiGet.mockReset();
  });

  afterEach(() => {
    // Restore default datasetId
    mockDatasetId = "550e8400-e29b-41d4-a716-446655440000";
  });

  it("shows error fallback for invalid dataset ID", () => {
    // Override the mutable variable to return an invalid UUID
    mockDatasetId = "not-a-uuid";

    // Re-mock useApiGet to return loading (it shouldn't even be called with null URL)
    mockUseApiGet.mockReturnValue({
      loading: false,
      data: null,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetDetailPage />);

    // The component should render the error fallback for invalid UUID
    const errorFallback = screen.getByTestId("error-fallback");
    expect(errorFallback).toHaveTextContent("Identifiant de dataset invalide.");
  });
});
