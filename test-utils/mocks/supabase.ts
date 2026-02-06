import { vi } from "vitest";

interface MockUser {
  id: string;
  email: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
}

interface MockSession {
  access_token: string;
  refresh_token: string;
  user: MockUser;
}

let mockUser: MockUser | null = null;
let mockSession: MockSession | null = null;
let mockError: { message: string; status?: number } | null = null;

export function setMockUser(user: MockUser | null) {
  mockUser = user;
  if (user) {
    mockSession = {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      user,
    };
  } else {
    mockSession = null;
  }
}

export function setMockError(
  error: { message: string; status?: number } | null,
) {
  mockError = error;
}

export function resetSupabase() {
  mockUser = null;
  mockSession = null;
  mockError = null;
}

export const mockSignInWithPassword = vi.fn(() =>
  Promise.resolve({
    data: mockError
      ? { user: null, session: null }
      : { user: mockUser, session: mockSession },
    error: mockError,
  }),
);

export const mockSignUp = vi.fn(() =>
  Promise.resolve({
    data: mockError
      ? { user: null, session: null }
      : { user: mockUser, session: mockSession },
    error: mockError,
  }),
);

export const mockSignOut = vi.fn(() => Promise.resolve({ error: mockError }));

export const mockGetUser = vi.fn(() =>
  Promise.resolve({
    data: { user: mockError ? null : mockUser },
    error: mockError,
  }),
);

export const mockGetSession = vi.fn(() =>
  Promise.resolve({
    data: { session: mockError ? null : mockSession },
    error: mockError,
  }),
);

export const mockExchangeCodeForSession = vi.fn(() =>
  Promise.resolve({
    data: mockError
      ? { user: null, session: null }
      : { user: mockUser, session: mockSession },
    error: mockError,
  }),
);

function createMockSupabaseClient() {
  return {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getUser: mockGetUser,
      getSession: mockGetSession,
      exchangeCodeForSession: mockExchangeCodeForSession,
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  };
}

export function createSupabaseSsrMock() {
  return {
    createBrowserClient: vi.fn(() => createMockSupabaseClient()),
    createServerClient: vi.fn((_url: string, _key: string, _opts: unknown) =>
      createMockSupabaseClient(),
    ),
  };
}
