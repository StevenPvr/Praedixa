/**
 * Minimal mock Supabase auth server for E2E tests.
 *
 * Responds to the endpoints the Next.js middleware and Supabase SSR client
 * call server-side, so that authentication "succeeds" without a real
 * Supabase project.
 *
 * Started automatically by Playwright via `webServer` config.
 */

import http from "node:http";

const MOCK_USER = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  aud: "authenticated",
  role: "authenticated",
  email: "admin@praedixa-demo.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: {
    provider: "email",
    providers: ["email"],
    role: "admin",
  },
  user_metadata: {
    org_id: "org-00000000-0000-0000-0000-000000000001",
    role: "admin",
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// Super-admin user for admin back-office E2E tests
const MOCK_ADMIN_USER = {
  id: "sa-00000000-0000-0000-0000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "superadmin@praedixa.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: {
    provider: "email",
    providers: ["email"],
    role: "super_admin",
  },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const MOCK_SESSION = {
  access_token: "mock-access-token-e2e",
  token_type: "bearer",
  expires_in: 43_200,
  expires_at: Math.floor(Date.now() / 1000) + 43_200,
  refresh_token: "mock-refresh-token-e2e",
  user: MOCK_USER,
};

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /auth/v1/user — called by middleware's getUser()
  // Detect admin token from Authorization header to return super_admin user
  if (req.url?.startsWith("/auth/v1/user")) {
    const authHeader = req.headers.authorization || "";
    const isAdmin = authHeader.includes("admin");
    res.writeHead(200);
    res.end(JSON.stringify(isAdmin ? MOCK_ADMIN_USER : MOCK_USER));
    return;
  }

  // POST /auth/v1/token — session refresh / signIn
  if (req.url?.startsWith("/auth/v1/token")) {
    res.writeHead(200);
    res.end(JSON.stringify(MOCK_SESSION));
    return;
  }

  // POST /auth/v1/signup, POST /auth/v1/logout, etc.
  if (req.url?.startsWith("/auth/v1/")) {
    res.writeHead(200);
    res.end(JSON.stringify({}));
    return;
  }

  // REST API catch-all (for Supabase client queries)
  if (req.url?.startsWith("/rest/v1/")) {
    res.writeHead(200);
    res.end(JSON.stringify([]));
    return;
  }

  // Default
  res.writeHead(200);
  res.end(JSON.stringify({}));
});

const PORT = 54321;
server.listen(PORT, () => {
  console.log(`Mock Supabase server running on http://localhost:${PORT}`);
});
