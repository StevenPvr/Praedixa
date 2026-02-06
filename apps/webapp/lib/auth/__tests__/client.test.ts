import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateBrowserClient = vi.fn(() => ({
  auth: { getUser: vi.fn(), getSession: vi.fn() },
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
}));

// We need to reset the module-level singleton between tests.
// Import the function dynamically in each relevant test.

describe("getSupabaseBrowserClient", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateBrowserClient.mockClear();
    // Set env vars
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("should return a Supabase client", async () => {
    const { getSupabaseBrowserClient } = await import("../client");
    const client = getSupabaseBrowserClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("should return the same instance on subsequent calls (singleton)", async () => {
    const { getSupabaseBrowserClient } = await import("../client");
    const client1 = getSupabaseBrowserClient();
    const client2 = getSupabaseBrowserClient();

    expect(client1).toBe(client2);
    expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1);
  });

  it("should pass environment variables to createBrowserClient", async () => {
    const { getSupabaseBrowserClient } = await import("../client");
    getSupabaseBrowserClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
    );
  });

  it("should create a new instance after module reset", async () => {
    // First import — creates one client
    const mod1 = await import("../client");
    mod1.getSupabaseBrowserClient();

    // Reset modules to clear the singleton
    vi.resetModules();

    // Second import — should create another client
    const mod2 = await import("../client");
    mod2.getSupabaseBrowserClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2);
  });
});
