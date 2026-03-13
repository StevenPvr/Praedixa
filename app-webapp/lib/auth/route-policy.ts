export type WebappRouteKind =
  | "root"
  | "app"
  | "login"
  | "auth"
  | "api"
  | "unknown";

export interface WebappRoutePolicy {
  kind: Exclude<WebappRouteKind, "unknown">;
  match: "exact" | "prefix";
  pathname: string;
  description: string;
}

export const WEBAPP_ROUTE_POLICIES: readonly WebappRoutePolicy[] = [
  {
    kind: "root",
    match: "exact",
    pathname: "/",
    description:
      "Root entrypoint that forwards authenticated users to /dashboard",
  },
  {
    kind: "app",
    match: "exact",
    pathname: "/dashboard",
    description: "Authenticated dashboard home",
  },
  {
    kind: "app",
    match: "exact",
    pathname: "/previsions",
    description: "Authenticated forecasts view",
  },
  {
    kind: "app",
    match: "exact",
    pathname: "/actions",
    description: "Authenticated decisions and actions view",
  },
  {
    kind: "app",
    match: "exact",
    pathname: "/messages",
    description: "Authenticated messaging view",
  },
  {
    kind: "app",
    match: "exact",
    pathname: "/parametres",
    description: "Authenticated settings view",
  },
  {
    kind: "login",
    match: "exact",
    pathname: "/login",
    description: "Public login page",
  },
  {
    kind: "auth",
    match: "prefix",
    pathname: "/auth",
    description: "Auth route handlers keep their own control flow",
  },
  {
    kind: "api",
    match: "prefix",
    pathname: "/api",
    description: "Same-origin BFF routes keep their own auth and CSRF checks",
  },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function resolveWebappRoutePolicy(pathname: string): {
  kind: WebappRouteKind;
  policy: WebappRoutePolicy | null;
} {
  for (const policy of WEBAPP_ROUTE_POLICIES) {
    if (policy.match === "exact" && pathname === policy.pathname) {
      return {
        kind: policy.kind,
        policy,
      };
    }

    if (policy.match === "prefix" && matchesPrefix(pathname, policy.pathname)) {
      return {
        kind: policy.kind,
        policy,
      };
    }
  }

  return {
    kind: "unknown",
    policy: null,
  };
}

export function listDocumentedWebappPagePaths(): string[] {
  return WEBAPP_ROUTE_POLICIES.filter(
    (policy) =>
      policy.kind === "root" ||
      policy.kind === "app" ||
      policy.kind === "login",
  )
    .map((policy) => policy.pathname)
    .sort();
}
