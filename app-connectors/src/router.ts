import type {
  CompiledRoute,
  HttpMethod,
  RouteDefinition,
  RouteHandler,
  ServiceTokenCapability,
} from "./types.js";

export class RouteMatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteMatchError";
  }
}

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
    requiredCapabilities?: readonly ServiceTokenCapability[];
  },
): RouteDefinition {
  return {
    method,
    template,
    authRequired: options?.authRequired ?? true,
    requiredCapabilities: options?.requiredCapabilities ?? [],
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
      requiredCapabilities: entry.requiredCapabilities,
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
        try {
          params[name] = decodeURIComponent(value);
        } catch {
          throw new RouteMatchError(
            `Invalid encoding for route parameter "${name}"`,
          );
        }
      }
    }

    return {
      route: candidate,
      params,
    };
  }

  return null;
}
