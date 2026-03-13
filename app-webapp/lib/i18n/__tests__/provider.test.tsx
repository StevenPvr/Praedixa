import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "../provider";

const mockApiGet = vi.fn();
const mockApiPatch = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPatch: (...args: unknown[]) => mockApiPatch(...args),
}));

function Harness() {
  const { locale, preferencesSyncError, preferencesSyncState, setLocale } =
    useI18n();

  return (
    <div>
      <p data-testid="locale">{locale}</p>
      <p data-testid="sync-state">{preferencesSyncState}</p>
      <p data-testid="sync-error">{preferencesSyncError ?? ""}</p>
      <button type="button" onClick={() => setLocale("en")}>
        Switch to English
      </button>
    </div>
  );
}

describe("I18nProvider", () => {
  const localStorageMock = {
    clear: vi.fn(),
    getItem: vi.fn(),
    key: vi.fn(),
    length: 0,
    removeItem: vi.fn(),
    setItem: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });

    localStorageMock.getItem.mockReturnValue(null);
    mockApiGet.mockResolvedValue({ data: { language: "fr" } });
    mockApiPatch.mockResolvedValue({ data: { language: "en" } });
  });

  it("hydrates locale from server preferences through the same-origin API", async () => {
    localStorageMock.getItem.mockReturnValue("fr");
    mockApiGet.mockResolvedValueOnce({ data: { language: "en" } });

    render(
      <I18nProvider>
        <Harness />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en");
    });
    expect(screen.getByTestId("sync-state")).toHaveTextContent("ready");
    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/users/me/preferences");
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("fails closed when preference loading is unavailable instead of restoring a local locale", async () => {
    localStorageMock.getItem.mockReturnValue("en");
    mockApiGet.mockRejectedValueOnce(new Error("backend unavailable"));

    render(
      <I18nProvider>
        <Harness />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("sync-state")).toHaveTextContent("unavailable");
    });
    expect(screen.getByTestId("locale")).toHaveTextContent("fr");
    expect(screen.getByTestId("sync-error")).toHaveTextContent(
      "Preferences indisponibles.",
    );
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("refuses locale changes while persistence is unavailable", async () => {
    mockApiGet.mockRejectedValueOnce(new Error("backend unavailable"));

    render(
      <I18nProvider>
        <Harness />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("sync-state")).toHaveTextContent("unavailable");
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to English" }));

    expect(mockApiPatch).not.toHaveBeenCalled();
    expect(screen.getByTestId("locale")).toHaveTextContent("fr");
    expect(screen.getByTestId("sync-error")).toHaveTextContent(
      "Preferences indisponibles.",
    );
  });

  it("restores the last confirmed locale when saving preferences fails", async () => {
    mockApiGet.mockResolvedValueOnce({ data: { language: "fr" } });
    mockApiPatch.mockRejectedValueOnce(new Error("write failed"));

    render(
      <I18nProvider>
        <Harness />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("sync-state")).toHaveTextContent("ready");
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to English" }));

    await waitFor(() => {
      expect(screen.getByTestId("sync-state")).toHaveTextContent("error");
    });
    expect(screen.getByTestId("locale")).toHaveTextContent("fr");
    expect(screen.getByTestId("sync-error")).toHaveTextContent(
      "Enregistrement impossible.",
    );
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});
