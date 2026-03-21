import type { AppConfig } from "../types.js";

type CamundaConfig = AppConfig["camunda"];

type OAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

export type CamundaProcessDefinitionResult = {
  processDefinitionId: string;
  processDefinitionKey: string;
  version: number;
  name?: string;
  resourceName?: string;
};

export type CamundaDeployResponse = {
  deploymentKey: string;
  deployments: Array<{
    processDefinition?: {
      bpmnProcessId: string;
      processDefinitionKey: string;
      processDefinitionVersion: number;
      resourceName?: string;
      tenantId?: string;
    };
  }>;
  warnings?: string[];
};

export type CamundaCreateProcessInstanceResponse = {
  processInstanceKey: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  processDefinitionVersion: number;
  variables?: Record<string, unknown>;
};

export type CamundaUserTaskState =
  | "CREATED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | string;

export type CamundaUserTaskResult = {
  userTaskKey: string;
  processInstanceKey: string;
  processDefinitionKey?: string;
  elementId: string;
  state: CamundaUserTaskState;
  name?: string;
  assignee?: string | null;
  candidateGroups?: string[] | null;
  creationDate?: string;
  completionDate?: string | null;
  dueDate?: string | null;
  followUpDate?: string | null;
};

export type CamundaProcessInstanceState = "ACTIVE" | "COMPLETED" | "CANCELED";

export type CamundaProcessInstanceResult = {
  processInstanceKey: string;
  processDefinitionKey: string;
  processDefinitionId?: string;
  state: CamundaProcessInstanceState;
  startDate?: string;
  endDate?: string | null;
};

type CamundaSearchResponse<T> = {
  items?: T[];
  page?: {
    totalItems?: number;
  };
};

export class CamundaApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CamundaApiError";
  }
}

function joinPath(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function parseErrorBody(
  response: Response,
): Promise<Record<string, unknown>> {
  try {
    const parsed = (await response.json()) as unknown;
    return asRecord(parsed) ?? {};
  } catch {
    return {};
  }
}

export class CamundaRestClient {
  private tokenCache: {
    accessToken: string;
    expiresAtMs: number;
  } | null = null;

  constructor(private readonly config: CamundaConfig) {}

  private async getAuthorizationHeader(): Promise<string | null> {
    switch (this.config.authMode) {
      case "none":
        return null;
      case "basic": {
        const username = this.config.basicUsername ?? "";
        const password = this.config.basicPassword ?? "";
        return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
      }
      case "oidc":
        return `Bearer ${await this.getOAuthAccessToken()}`;
    }
  }

  private async getOAuthAccessToken(): Promise<string> {
    const cached = this.tokenCache;
    if (cached && cached.expiresAtMs > Date.now() + 30_000) {
      return cached.accessToken;
    }

    const tokenUrl = this.config.oauthTokenUrl;
    const clientId = this.config.oauthClientId;
    const clientSecret = this.config.oauthClientSecret;
    if (!tokenUrl || !clientId || !clientSecret) {
      throw new CamundaApiError(
        "Camunda OAuth configuration is incomplete.",
        500,
        "CAMUNDA_AUTH_CONFIG_INVALID",
      );
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    if (this.config.oauthAudience) {
      body.set("audience", this.config.oauthAudience);
    }
    if (this.config.oauthScope) {
      body.set("scope", this.config.oauthScope);
    }

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });
    if (!response.ok) {
      const details = await parseErrorBody(response);
      throw new CamundaApiError(
        "Unable to fetch Camunda OAuth token.",
        response.status,
        "CAMUNDA_AUTH_FAILED",
        details,
      );
    }

    const payload = (await response.json()) as OAuthTokenResponse;
    const accessToken = payload.access_token?.trim();
    if (!accessToken) {
      throw new CamundaApiError(
        "Camunda OAuth token response is missing access_token.",
        500,
        "CAMUNDA_AUTH_FAILED",
      );
    }

    this.tokenCache = {
      accessToken,
      expiresAtMs:
        Date.now() + Math.max((payload.expires_in ?? 300) - 15, 30) * 1000,
    };
    return accessToken;
  }

  private async requestJson<T>(path: string, init: RequestInit): Promise<T> {
    const authorization = await this.getAuthorizationHeader();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (authorization) {
      headers.set("Authorization", authorization);
    }

    const response = await fetch(joinPath(this.config.baseUrl ?? "", path), {
      ...init,
      headers,
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });
    if (!response.ok) {
      const details = await parseErrorBody(response);
      throw new CamundaApiError(
        String(details.message ?? `Camunda request failed for ${path}`),
        response.status,
        String(details.code ?? "CAMUNDA_REQUEST_FAILED"),
        details,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async searchProcessDefinitions(
    processDefinitionId: string,
  ): Promise<readonly CamundaProcessDefinitionResult[]> {
    const response = await this.requestJson<
      CamundaSearchResponse<CamundaProcessDefinitionResult>
    >("/process-definitions/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: { processDefinitionId },
        sort: [{ field: "version", order: "desc" }],
        page: { limit: 20 },
      }),
    });
    return response.items ?? [];
  }

  async deployProcessResource(input: {
    fileName: string;
    xml: string;
  }): Promise<CamundaDeployResponse> {
    const authorization = await this.getAuthorizationHeader();
    const form = new FormData();
    form.append(
      "resources",
      new Blob([input.xml], { type: "application/xml" }),
      input.fileName,
    );
    if (this.config.processTenantId) {
      form.append("tenantId", this.config.processTenantId);
    }

    const headers = new Headers();
    headers.set("Accept", "application/json");
    if (authorization) {
      headers.set("Authorization", authorization);
    }

    const response = await fetch(
      joinPath(this.config.baseUrl ?? "", "/deployments"),
      {
        method: "POST",
        headers,
        body: form,
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      },
    );
    if (!response.ok) {
      const details = await parseErrorBody(response);
      throw new CamundaApiError(
        String(details.message ?? "Camunda deployment failed."),
        response.status,
        String(details.code ?? "CAMUNDA_DEPLOY_FAILED"),
        details,
      );
    }

    return (await response.json()) as CamundaDeployResponse;
  }

  async createProcessInstance(input: {
    processDefinitionId: string;
    processDefinitionVersion?: number;
    variables: Record<string, unknown>;
  }): Promise<CamundaCreateProcessInstanceResponse> {
    return await this.requestJson<CamundaCreateProcessInstanceResponse>(
      "/process-instances",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processDefinitionId: input.processDefinitionId,
          ...(input.processDefinitionVersion
            ? { processDefinitionVersion: input.processDefinitionVersion }
            : {}),
          variables: input.variables,
        }),
      },
    );
  }

  async searchUserTasks(
    processInstanceKey: string,
  ): Promise<readonly CamundaUserTaskResult[]> {
    const response = await this.requestJson<
      CamundaSearchResponse<CamundaUserTaskResult>
    >("/user-tasks/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: { processInstanceKey },
        sort: [{ field: "creationDate", order: "asc" }],
        page: { limit: 100 },
      }),
    });
    return response.items ?? [];
  }

  async searchProcessInstances(
    processInstanceKey: string,
  ): Promise<readonly CamundaProcessInstanceResult[]> {
    const response = await this.requestJson<
      CamundaSearchResponse<CamundaProcessInstanceResult>
    >("/process-instances/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: { processInstanceKey },
        page: { limit: 10 },
      }),
    });
    return response.items ?? [];
  }

  async assignUserTask(input: {
    userTaskKey: string;
    assignee: string;
    allowOverride?: boolean;
  }): Promise<void> {
    await this.requestJson<void>(
      `/user-tasks/${encodeURIComponent(input.userTaskKey)}/assignment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignee: input.assignee,
          allowOverride: input.allowOverride ?? true,
        }),
      },
    );
  }

  async completeUserTask(input: {
    userTaskKey: string;
    variables?: Record<string, unknown>;
    action?: string;
  }): Promise<void> {
    await this.requestJson<void>(
      `/user-tasks/${encodeURIComponent(input.userTaskKey)}/completion`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(input.variables ? { variables: input.variables } : {}),
          ...(input.action ? { action: input.action } : {}),
        }),
      },
    );
  }

  async cancelProcessInstance(processInstanceKey: string): Promise<void> {
    await this.requestJson<void>(
      `/process-instances/${encodeURIComponent(processInstanceKey)}/cancellation`,
      {
        method: "POST",
      },
    );
  }
}
