/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseApiGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/lib/auth/client", () => ({
  getValidAccessToken: vi.fn(() => Promise.resolve("token")),
  useCurrentUser: vi.fn(() => ({
    permissions: [
      "admin:org:write",
      "admin:integrations:read",
      "admin:integrations:write",
    ],
  })),
  clearAuthSession: vi.fn(),
}));

const mockContext = {
  orgId: "org-1",
  orgName: "Test Org",
  selectedSiteId: null as string | null,
  setSelectedSiteId: vi.fn(),
  hierarchy: [],
};

vi.mock("../../client-context", () => ({
  useClientContext: () => mockContext,
}));

vi.mock("@praedixa/ui", async () => {
  const actual = await vi.importActual<object>("@praedixa/ui");
  return {
    ...actual,
    SkeletonCard: () => (
      <div data-testid="skeleton-card" role="status" aria-label="Chargement" />
    ),
    DataTable: ({ data, columns }: any) => (
      <div data-testid="data-table">
        {data?.[0] &&
          columns?.map((col: any) => (
            <div key={col.key}>
              {col.render
                ? col.render(data[0])
                : String(data[0][col.key] ?? "")}
            </div>
          ))}
      </div>
    ),
  };
});

import ConfigPage from "../page";

const mockCostParams = [
  {
    id: "cp-1",
    category: "Cout interne",
    value: 250,
    effectiveFrom: "2026-01-01T00:00:00Z",
    effectiveUntil: "2026-12-31T00:00:00Z",
    siteName: "Lyon",
  },
];

const mockProofPacks = [
  {
    id: "pp-1",
    name: "Pack Q1 2026",
    status: "generated",
    generatedAt: "2026-03-01T10:00:00Z",
    downloadUrl: "/api/proof-packs/pp-1/download",
  },
];

const mockResolvedDecisionConfig = {
  organizationId: "org-1",
  siteId: null,
  versionId: "version-active-12345678",
  effectiveAt: "2026-03-05T10:00:00Z",
  resolvedAt: "2026-03-05T10:00:01Z",
  nextVersion: null,
  payload: {
    horizons: [
      { id: "j3", label: "J+3", days: 3, rank: 1, active: true, isDefault: false },
      { id: "j7", label: "J+7", days: 7, rank: 2, active: true, isDefault: true },
    ],
    optionCatalog: [{ optionType: "hs", enabled: true }],
    policiesByHorizon: [
      { horizonId: "j3", weights: { cost: 0.2, service: 0.5, risk: 0.2, feasibility: 0.1 } },
      { horizonId: "j7", weights: { cost: 0.3, service: 0.4, risk: 0.2, feasibility: 0.1 } },
    ],
  },
};

const mockDecisionConfigVersions = [
  {
    id: "version-active-12345678",
    organizationId: "org-1",
    siteId: null,
    status: "active",
    effectiveAt: "2026-03-05T10:00:00Z",
    activatedAt: "2026-03-05T10:00:00Z",
    payload: mockResolvedDecisionConfig.payload,
    rollbackFromVersionId: null,
    createdBy: "admin-1",
    createdAt: "2026-03-05T09:00:00Z",
    updatedAt: "2026-03-05T10:00:00Z",
  },
];

const mockIntegrationConnections = [
  {
    id: "conn-1",
    vendor: "salesforce",
    displayName: "Salesforce Push",
    status: "active",
    authorizationState: "authorized",
    authMode: "oauth2",
    sourceObjects: ["Account"],
    updatedAt: "2026-03-06T10:00:00Z",
  },
];

const mockIngestCredentials = [
  {
    id: "cred-1",
    label: "CRM outbound",
    keyId: "key-1",
    authMode: "bearer_hmac",
    tokenPreview: "prdx_live_",
    lastUsedAt: "2026-03-06T10:00:00Z",
    expiresAt: null,
    revokedAt: null,
    createdAt: "2026-03-06T09:00:00Z",
  },
];

const mockRawEvents = [
  {
    id: "evt-row-1",
    credentialId: "cred-1",
    eventId: "evt-1",
    sourceObject: "Account",
    sourceRecordId: "001",
    schemaVersion: "crm.account.v1",
    sizeBytes: 128,
    receivedAt: "2026-03-06T10:05:00Z",
  },
];

type SetupOptions = {
  costError?: string | null;
  proofError?: string | null;
  decisionConfigError?: string | null;
  versionsError?: string | null;
  loading?: boolean;
  proofDownloadUrl?: string | null;
};

function setupApiGetMocks(options?: SetupOptions) {
  const loading = options?.loading ?? false;
  const proofData =
    options?.proofDownloadUrl === undefined
      ? mockProofPacks
      : [{ ...mockProofPacks[0], downloadUrl: options.proofDownloadUrl }];

  mockUseApiGet.mockImplementation((url: string) => {
    if (url.includes("/cost-params")) {
      return {
        data: options?.costError ? null : mockCostParams,
        loading,
        error: options?.costError ?? null,
        refetch: vi.fn(),
      };
    }
    if (url.includes("/proof-packs")) {
      return {
        data: options?.proofError ? null : proofData,
        loading,
        error: options?.proofError ?? null,
        refetch: vi.fn(),
      };
    }
    if (url.includes("/decision-config/resolved")) {
      return {
        data: options?.decisionConfigError ? null : mockResolvedDecisionConfig,
        loading,
        error: options?.decisionConfigError ?? null,
        refetch: vi.fn(),
      };
    }
    if (url.includes("/decision-config/versions")) {
      return {
        data: options?.versionsError ? null : mockDecisionConfigVersions,
        loading,
        error: options?.versionsError ?? null,
        refetch: vi.fn(),
      };
    }
    if (url.includes("/integrations/connections/") && url.includes("/ingest-credentials")) {
      return {
        data: mockIngestCredentials,
        loading,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (url.includes("/integrations/connections/") && url.includes("/raw-events")) {
      return {
        data: mockRawEvents,
        loading,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (url.includes("/integrations/connections")) {
      return {
        data: mockIntegrationConnections,
        loading,
        error: null,
        refetch: vi.fn(),
      };
    }
    return {
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
  });
}

describe("ConfigPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.selectedSiteId = null;
    setupApiGetMocks();
  });

  it("renders heading and cost parameters table", () => {
    render(<ConfigPage />);
    expect(screen.getByText("Configuration")).toBeInTheDocument();
    expect(screen.getByText("Cout interne")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("Lyon")).toBeInTheDocument();
  });

  it("renders recommendation engine section", () => {
    render(<ConfigPage />);
    expect(screen.getByText("Moteur de recommandation")).toBeInTheDocument();
    expect(screen.getByText("J+7 (7 jours)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Planifier version" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rollback" })).toBeInTheDocument();
  });

  it("renders proof packs table", () => {
    render(<ConfigPage />);
    expect(screen.getByText("Pack Q1 2026")).toBeInTheDocument();
    expect(screen.getByText("generated")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    setupApiGetMocks({ loading: true });
    render(<ConfigPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows cost params error fallback", () => {
    setupApiGetMocks({ costError: "Cost params error" });
    render(<ConfigPage />);
    expect(screen.getByText("Cost params error")).toBeInTheDocument();
  });

  it("shows proof packs error fallback", () => {
    setupApiGetMocks({ proofError: "Proof error" });
    render(<ConfigPage />);
    expect(screen.getByText("Proof error")).toBeInTheDocument();
  });

  it("passes site_id filter when selectedSiteId is set", () => {
    mockContext.selectedSiteId = "site-77";
    render(<ConfigPage />);
    const calledUrls = mockUseApiGet.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.includes("site_id=site-77"))).toBe(true);
  });

  it("renders proof pack with no download url", () => {
    setupApiGetMocks({ proofDownloadUrl: null });
    render(<ConfigPage />);
    expect(screen.queryByText("PDF")).not.toBeInTheDocument();
  });
});
