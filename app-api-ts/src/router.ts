import type {
  CompiledRoute,
  HttpMethod,
  RoutePermissionMode,
  RouteDefinition,
  RouteHandler,
  RouteRateLimit,
  UserRole,
} from "./types.js";

function compileTemplate(template: string): {
  regex: RegExp;
  paramNames: string[];
} {
  const chunks = template.split("/").filter((chunk) => chunk.length > 0);
  const paramNames: string[] = [];
  const patternParts = chunks.map((chunk) => {
    if (chunk.startsWith(":")) {
      const paramName = chunk.slice(1);
      paramNames.push(paramName);
      return "([^/]+)";
    }

    return chunk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });

  const pattern = "^/" + patternParts.join("/") + "$";
  return {
    regex: new RegExp(pattern),
    paramNames,
  };
}

export function route(
  method: HttpMethod,
  template: string,
  handler: RouteHandler,
  options?: {
    authRequired?: boolean;
    allowedRoles?: readonly UserRole[];
    requiredPermissions?: readonly string[];
    permissionMode?: RoutePermissionMode;
    rateLimit?: RouteRateLimit;
  },
): RouteDefinition {
  return {
    method,
    template,
    authRequired: options?.authRequired ?? true,
    allowedRoles: options?.allowedRoles ?? null,
    requiredPermissions: options?.requiredPermissions ?? null,
    permissionMode: options?.permissionMode ?? "all",
    rateLimit: options?.rateLimit ?? null,
    handler,
  };
}

export function compileRoutes(routes: RouteDefinition[]): CompiledRoute[] {
  return routes.map((entry) => {
    const compiled = compileTemplate(entry.template);
    return {
      method: entry.method,
      template: entry.template,
      authRequired: entry.authRequired,
      allowedRoles: entry.allowedRoles,
      requiredPermissions: entry.requiredPermissions,
      permissionMode: entry.permissionMode,
      rateLimit: entry.rateLimit,
      handler: entry.handler,
      regex: compiled.regex,
      paramNames: compiled.paramNames,
    };
  });
}

export function matchRoute(
  compiledRoutes: CompiledRoute[],
  method: HttpMethod,
  path: string,
): { route: CompiledRoute; params: Record<string, string> } | null {
  for (const candidate of compiledRoutes) {
    if (candidate.method !== method) {
      continue;
    }

    const matched = candidate.regex.exec(path);
    if (matched == null) {
      continue;
    }

    const params: Record<string, string> = {};
    for (let i = 0; i < candidate.paramNames.length; i += 1) {
      const name = candidate.paramNames[i];
      const value = matched[i + 1];
      if (name != null && value != null) {
        params[name] = decodeURIComponent(value);
      }
    }

    return {
      route: candidate,
      params,
    };
  }

  return null;
}
