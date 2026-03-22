import type { AppConfig } from "../types.js";
import { PersistenceError } from "./persistence.js";
import {
  buildOnboardingStartVariables,
  CLIENT_ONBOARDING_BPMN_XML,
  ONBOARDING_PROCESS_DEFINITION_ID,
  ONBOARDING_PROCESS_RESOURCE_NAME,
} from "./admin-onboarding-process.js";
import {
  CamundaApiError,
  CamundaRestClient,
  type CamundaProcessDefinitionResult,
  type CamundaProcessInstanceResult,
  type CamundaUserTaskResult,
} from "./camunda-rest.js";
import type { CreateOnboardingCaseRequest } from "@praedixa/shared-types/api";

type CamundaConfig = AppConfig["camunda"];

type StartOnboardingWorkflowInput = {
  caseId: string;
  organizationId: string;
  request: CreateOnboardingCaseRequest;
};

type CompleteOnboardingWorkflowTaskInput = {
  userTaskKey: string;
  assignee: string;
  note?: string | null;
};

export type OnboardingWorkflowProjection = {
  processState: CamundaProcessInstanceResult["state"] | null;
  userTasks: readonly CamundaUserTaskResult[];
};

function mapCamundaError(error: unknown): PersistenceError {
  if (error instanceof PersistenceError) {
    return error;
  }
  if (error instanceof CamundaApiError) {
    return new PersistenceError(
      error.message,
      error.statusCode >= 500 ? 503 : error.statusCode,
      error.code,
      error.details,
    );
  }
  return new PersistenceError(
    "Camunda onboarding runtime failed.",
    503,
    "CAMUNDA_RUNTIME_FAILED",
    {
      cause: error instanceof Error ? error.message : String(error),
    },
  );
}

function requireEnabled(config: CamundaConfig): void {
  if (config.enabled && config.baseUrl) {
    return;
  }

  throw new PersistenceError(
    "Camunda onboarding runtime is not configured.",
    503,
    "CAMUNDA_UNAVAILABLE",
  );
}

class OnboardingCamundaRuntime {
  private readonly client: CamundaRestClient;
  private deployedDefinitionPromise: Promise<CamundaProcessDefinitionResult> | null =
    null;
  private deployedDefinition: CamundaProcessDefinitionResult | null = null;

  constructor(private readonly config: CamundaConfig) {
    requireEnabled(config);
    this.client = new CamundaRestClient(config);
  }

  private async resolveLatestDefinition(): Promise<CamundaProcessDefinitionResult | null> {
    const definitions = await this.client.searchProcessDefinitions(
      ONBOARDING_PROCESS_DEFINITION_ID,
    );
    return definitions[0] ?? null;
  }

  private async deployDefinition(): Promise<CamundaProcessDefinitionResult> {
    const response = await this.client.deployProcessResource({
      fileName: ONBOARDING_PROCESS_RESOURCE_NAME,
      xml: CLIENT_ONBOARDING_BPMN_XML,
    });
    const deployment = response.deployments.find(
      (entry) =>
        entry.processDefinition?.bpmnProcessId ===
        ONBOARDING_PROCESS_DEFINITION_ID,
    )?.processDefinition;
    if (!deployment) {
      throw new PersistenceError(
        "Camunda deployment completed without the onboarding process metadata.",
        503,
        "CAMUNDA_DEPLOY_FAILED",
        { warnings: response.warnings ?? [] },
      );
    }

    return {
      processDefinitionId: deployment.bpmnProcessId,
      processDefinitionKey: deployment.processDefinitionKey,
      version: deployment.processDefinitionVersion,
      ...(deployment.resourceName !== undefined
        ? { resourceName: deployment.resourceName }
        : {}),
    };
  }

  async ensureProcessDeployed(): Promise<CamundaProcessDefinitionResult> {
    if (this.deployedDefinition) {
      return this.deployedDefinition;
    }
    if (this.deployedDefinitionPromise) {
      return await this.deployedDefinitionPromise;
    }

    this.deployedDefinitionPromise = (async () => {
      try {
        const existing = await this.resolveLatestDefinition();
        const definition = existing ?? (await this.deployDefinition());
        this.deployedDefinition = definition;
        return definition;
      } catch (error) {
        throw mapCamundaError(error);
      } finally {
        this.deployedDefinitionPromise = null;
      }
    })();

    return await this.deployedDefinitionPromise;
  }

  async startOnboardingWorkflow(input: StartOnboardingWorkflowInput): Promise<{
    workflowProvider: "camunda";
    processDefinitionKey: string;
    processDefinitionVersion: number;
    processInstanceKey: string;
  }> {
    try {
      const definition = await this.ensureProcessDeployed();
      const instance = await this.client.createProcessInstance({
        processDefinitionId: definition.processDefinitionId,
        processDefinitionVersion: definition.version,
        variables: buildOnboardingStartVariables(input),
      });
      return {
        workflowProvider: "camunda",
        processDefinitionKey: definition.processDefinitionId,
        processDefinitionVersion: definition.version,
        processInstanceKey: instance.processInstanceKey,
      };
    } catch (error) {
      throw mapCamundaError(error);
    }
  }

  async readProjection(
    processInstanceKey: string,
  ): Promise<OnboardingWorkflowProjection> {
    try {
      const [processInstances, userTasks] = await Promise.all([
        this.client.searchProcessInstances(processInstanceKey),
        this.client.searchUserTasks(processInstanceKey),
      ]);

      return {
        processState: processInstances[0]?.state ?? null,
        userTasks: [...userTasks].sort((left, right) =>
          `${left.creationDate ?? ""}-${left.userTaskKey}`.localeCompare(
            `${right.creationDate ?? ""}-${right.userTaskKey}`,
          ),
        ),
      };
    } catch (error) {
      throw mapCamundaError(error);
    }
  }

  async completeWorkflowTask(
    input: CompleteOnboardingWorkflowTaskInput,
  ): Promise<void> {
    try {
      await this.client.assignUserTask({
        userTaskKey: input.userTaskKey,
        assignee: input.assignee,
        allowOverride: true,
      });
      await this.client.completeUserTask({
        userTaskKey: input.userTaskKey,
        ...(input.note && input.note.trim().length > 0
          ? { variables: { lastTaskCompletionNote: input.note.trim() } }
          : {}),
        action: "complete",
      });
    } catch (error) {
      throw mapCamundaError(error);
    }
  }

  async cancelWorkflow(processInstanceKey: string): Promise<void> {
    try {
      await this.client.cancelProcessInstance(processInstanceKey);
    } catch (error) {
      throw mapCamundaError(error);
    }
  }
}

let singleton: OnboardingCamundaRuntime | null = null;

export async function initializeOnboardingCamundaRuntime(
  config: CamundaConfig,
): Promise<void> {
  if (!config.enabled) {
    singleton = null;
    return;
  }

  singleton = new OnboardingCamundaRuntime(config);
  if (config.deployOnStartup) {
    await singleton.ensureProcessDeployed();
  }
}

export function getOnboardingCamundaRuntime(): OnboardingCamundaRuntime {
  if (singleton) {
    return singleton;
  }

  const config: CamundaConfig = {
    enabled: (process.env["CAMUNDA_ENABLED"]?.trim() ?? "true") === "true",
    baseUrl:
      process.env["CAMUNDA_BASE_URL"]?.trim() || "http://127.0.0.1:8088/v2",
    authMode:
      (process.env["CAMUNDA_AUTH_MODE"]?.trim().toLowerCase() as
        | "none"
        | "basic"
        | "oidc"
        | undefined) ?? "none",
    basicUsername: process.env["CAMUNDA_BASIC_USERNAME"]?.trim() || null,
    basicPassword: process.env["CAMUNDA_BASIC_PASSWORD"]?.trim() || null,
    oauthTokenUrl: process.env["CAMUNDA_OAUTH_TOKEN_URL"]?.trim() || null,
    oauthClientId: process.env["CAMUNDA_OAUTH_CLIENT_ID"]?.trim() || null,
    oauthClientSecret:
      process.env["CAMUNDA_OAUTH_CLIENT_SECRET"]?.trim() || null,
    oauthAudience: process.env["CAMUNDA_OAUTH_AUDIENCE"]?.trim() || null,
    oauthScope: process.env["CAMUNDA_OAUTH_SCOPE"]?.trim() || null,
    processTenantId: process.env["CAMUNDA_PROCESS_TENANT_ID"]?.trim() || null,
    deployOnStartup:
      (process.env["CAMUNDA_DEPLOY_ON_STARTUP"]?.trim() ?? "true") === "true",
    requestTimeoutMs: Number.parseInt(
      process.env["CAMUNDA_REQUEST_TIMEOUT_MS"]?.trim() ?? "10000",
      10,
    ),
  };
  singleton = new OnboardingCamundaRuntime(config);
  return singleton;
}
