import { hasAnyPermission } from "@/lib/auth/permissions";

export interface WorkspaceTabDefinition {
  label: string;
  href: string;
  requiredPermissions: string[];
}

export const CLIENT_WORKSPACE_TABS: WorkspaceTabDefinition[] = [
  {
    label: "Dashboard",
    href: "dashboard",
    requiredPermissions: ["admin:org:read", "admin:monitoring:read"],
  },
  {
    label: "Donnees",
    href: "donnees",
    requiredPermissions: ["admin:org:read"],
  },
  {
    label: "Previsions",
    href: "previsions",
    requiredPermissions: ["admin:org:read"],
  },
  {
    label: "Actions",
    href: "actions",
    requiredPermissions: ["admin:org:read"],
  },
  {
    label: "Alertes",
    href: "alertes",
    requiredPermissions: ["admin:org:read"],
  },
  {
    label: "Rapports",
    href: "rapports",
    requiredPermissions: ["admin:org:read"],
  },
  {
    label: "Onboarding",
    href: "onboarding",
    requiredPermissions: ["admin:onboarding:read", "admin:onboarding:write"],
  },
  {
    label: "Config",
    href: "config",
    requiredPermissions: ["admin:org:write", "admin:billing:read"],
  },
  {
    label: "Equipe",
    href: "equipe",
    requiredPermissions: ["admin:users:read", "admin:users:write"],
  },
  {
    label: "Messages",
    href: "messages",
    requiredPermissions: ["admin:messages:read", "admin:messages:write"],
  },
];

const ROOT_ROUTE_PERMISSIONS: Array<{
  prefix: string;
  requiredPermissions: string[];
}> = [
  {
    prefix: "/demandes-contact",
    requiredPermissions: ["admin:support:read", "admin:support:write"],
  },
  {
    prefix: "/journal",
    requiredPermissions: [
      "admin:audit:read",
      "admin:org:write",
      "admin:billing:write",
      "admin:support:write",
    ],
  },
  {
    prefix: "/parametres",
    requiredPermissions: [
      "admin:onboarding:read",
      "admin:onboarding:write",
      "admin:org:write",
      "admin:billing:write",
    ],
  },
];

const CLIENT_ROUTE_PERMISSIONS: Record<string, string[]> = Object.fromEntries(
  CLIENT_WORKSPACE_TABS.map((tab) => [tab.href, tab.requiredPermissions]),
);

CLIENT_ROUTE_PERMISSIONS["vue-client"] = ["admin:org:read", "admin:billing:read"];

export function getRequiredPermissionsForPath(pathname: string): string[] {
  if (!pathname || pathname === "/") {
    return ["admin:monitoring:read", "admin:org:read"];
  }

  const matchedRootRoute = ROOT_ROUTE_PERMISSIONS.find((route) =>
    pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );
  if (matchedRootRoute) {
    return matchedRootRoute.requiredPermissions;
  }

  if (pathname === "/clients" || pathname.startsWith("/clients/")) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length <= 1) {
      return ["admin:org:read", "admin:monitoring:read"];
    }

    const section = segments[2] ?? "dashboard";
    return (
      CLIENT_ROUTE_PERMISSIONS[section] ?? [
        "admin:org:read",
        "admin:monitoring:read",
      ]
    );
  }

  return [];
}

export function canAccessPath(
  pathname: string,
  permissions: readonly string[] | null | undefined,
): boolean {
  const requiredPermissions = getRequiredPermissionsForPath(pathname);
  if (requiredPermissions.length === 0) {
    return true;
  }
  return hasAnyPermission(permissions, requiredPermissions);
}
