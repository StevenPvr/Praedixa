import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ParametresPage from "../page";

const mockUseCurrentUser = vi.fn();
const mockUseI18n = vi.fn();
const mockUseDecisionConfig = vi.fn();

vi.mock("@/lib/auth/client", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("@/lib/i18n/provider", () => ({
  useI18n: () => mockUseI18n(),
}));

vi.mock("@/hooks/use-decision-config", () => ({
  useDecisionConfig: (...args: unknown[]) => mockUseDecisionConfig(...args),
}));

const STORAGE_KEY = "praedixa_notifications_critical_only";

describe("ParametresPage", () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });

    localStorageMock.getItem.mockReturnValue(null);

    mockUseCurrentUser.mockReturnValue({
      id: "u1",
      email: "user@praedixa.com",
      role: "manager",
      organizationId: "org-1",
      siteId: "site-1",
    });

    mockUseI18n.mockReturnValue({
      locale: "fr",
      setLocale: vi.fn(),
      t: (key: string) => key,
    });

    mockUseDecisionConfig.mockReturnValue({
      config: {
        versionId: "version-123",
        nextVersion: null,
        payload: {
          horizons: [
            {
              id: "j7",
              label: "J+7",
              days: 7,
              rank: 1,
              active: true,
              isDefault: true,
            },
          ],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders heading and profile information", () => {
    render(<ParametresPage />);

    expect(
      screen.getByRole("heading", { name: "Parametres" }),
    ).toBeInTheDocument();
    expect(screen.getByText("user@praedixa.com")).toBeInTheDocument();
    expect(screen.getByText("manager")).toBeInTheDocument();
    expect(screen.getByText("org-1")).toBeInTheDocument();
    expect(screen.getByText("Configuration active")).toBeInTheDocument();
  });

  it("renders fallback values when user is unavailable", () => {
    mockUseCurrentUser.mockReturnValue(null);
    render(<ParametresPage />);

    expect(screen.getAllByText("--").length).toBeGreaterThan(0);
  });

  it("changes language using i18n setter", () => {
    const setLocale = vi.fn();
    mockUseI18n.mockReturnValue({
      locale: "fr",
      setLocale,
      t: (key: string) => key,
    });

    render(<ParametresPage />);

    fireEvent.change(screen.getByRole("combobox", { name: "Langue" }), {
      target: { value: "en" },
    });

    expect(setLocale).toHaveBeenCalledWith("en");
  });

  it("loads notification preference from localStorage", async () => {
    localStorageMock.getItem.mockReturnValue("0");

    render(<ParametresPage />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Alertes critiques uniquement",
    });

    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it("persists notification preference when enabling critical-only mode", async () => {
    localStorageMock.getItem.mockReturnValue("0");

    render(<ParametresPage />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Alertes critiques uniquement",
    });

    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
    });

    fireEvent.click(checkbox);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, "1");
  });

  it("persists notification preference when disabling critical-only mode", async () => {
    localStorageMock.getItem.mockReturnValue("1");

    render(<ParametresPage />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Alertes critiques uniquement",
    });

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });

    fireEvent.click(checkbox);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, "0");
  });
});
