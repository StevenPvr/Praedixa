import type {
  CreateOnboardingCaseRequest,
  OnboardingTaskDomain,
  OnboardingTaskStatus,
} from "@praedixa/shared-types/api";

export const ONBOARDING_PROCESS_DEFINITION_ID = "client-onboarding-v1";
export const ONBOARDING_PROCESS_RESOURCE_NAME = "client-onboarding-v1.bpmn";
const CANDIDATE_GROUP = "praedixa-admin-onboarding";

export type OnboardingTaskTemplate = {
  taskKey: string;
  elementId: string;
  title: string;
  domain: OnboardingTaskDomain;
  taskType: string;
  sortOrder: number;
  enabled: (request: CreateOnboardingCaseRequest) => boolean;
};

export const ONBOARDING_TASK_TEMPLATES: readonly OnboardingTaskTemplate[] = [
  {
    taskKey: "scope-contract",
    elementId: "scope-contract",
    title:
      "Valider le scope contractuel, la residence data et l'environnement cible",
    domain: "scope",
    taskType: "human_validation",
    sortOrder: 10,
    enabled: () => true,
  },
  {
    taskKey: "access-model",
    elementId: "access-model",
    title: "Configurer le modele d'acces, les roles client et le SSO",
    domain: "access",
    taskType: "human_validation",
    sortOrder: 20,
    enabled: () => true,
  },
  {
    taskKey: "source-strategy",
    elementId: "source-strategy",
    title: "Confirmer la strategie de sources critiques V1",
    domain: "sources",
    taskType: "human_validation",
    sortOrder: 30,
    enabled: () => true,
  },
  {
    taskKey: "activate-api-sources",
    elementId: "activate-api-sources",
    title: "Activer les connecteurs API, probes et first sync",
    domain: "sources",
    taskType: "integration_activation",
    sortOrder: 40,
    enabled: (request) => request.sourceModes.includes("api"),
  },
  {
    taskKey: "configure-file-sources",
    elementId: "configure-file-sources",
    title: "Configurer les imports CSV/Excel/SFTP et leurs profils",
    domain: "sources",
    taskType: "file_activation",
    sortOrder: 50,
    enabled: (request) =>
      request.sourceModes.includes("file") ||
      request.sourceModes.includes("sftp"),
  },
  {
    taskKey: "publish-mappings",
    elementId: "publish-mappings",
    title: "Publier les mappings et fermer la quarantaine critique",
    domain: "mapping",
    taskType: "mapping_publish",
    sortOrder: 60,
    enabled: () => true,
  },
  {
    taskKey: "configure-product-scope",
    elementId: "configure-product-scope",
    title: "Configurer modules, KPI, horizons et leviers d'optimisation",
    domain: "product",
    taskType: "product_configuration",
    sortOrder: 70,
    enabled: () => true,
  },
  {
    taskKey: "activation-review",
    elementId: "activation-review",
    title: "Passer la revue readiness et preparer l'activation pilote",
    domain: "activation",
    taskType: "readiness_review",
    sortOrder: 80,
    enabled: () => true,
  },
  {
    taskKey: "execute-activation",
    elementId: "execute-activation",
    title: "Executer l'activation et ouvrir l'hypercare",
    domain: "activation",
    taskType: "activation_execute",
    sortOrder: 90,
    enabled: (request) => request.activationMode !== "shadow",
  },
  {
    taskKey: "close-hypercare",
    elementId: "close-hypercare",
    title: "Clore l'hypercare et signer la stabilisation",
    domain: "activation",
    taskType: "hypercare_close",
    sortOrder: 100,
    enabled: (request) => request.activationMode !== "shadow",
  },
] as const;

export function buildOnboardingTaskTemplates(
  request: CreateOnboardingCaseRequest,
): readonly OnboardingTaskTemplate[] {
  return ONBOARDING_TASK_TEMPLATES.filter((template) =>
    template.enabled(request),
  );
}

export function mapCamundaTaskStateToStatus(
  state: string | null | undefined,
): OnboardingTaskStatus {
  switch (state) {
    case null:
    case undefined:
      return "todo";
    case "COMPLETED":
      return "done";
    case "CANCELED":
      return "blocked";
    case "CREATED":
    case "ASSIGNED":
    case "IN_PROGRESS":
      return "in_progress";
    default:
      return "todo";
  }
}

export function buildOnboardingStartVariables(input: {
  caseId: string;
  organizationId: string;
  request: CreateOnboardingCaseRequest;
}): Record<string, unknown> {
  const sourceModes = [...input.request.sourceModes];
  return {
    caseId: input.caseId,
    organizationId: input.organizationId,
    ownerUserId: input.request.ownerUserId ?? null,
    sponsorUserId: input.request.sponsorUserId ?? null,
    activationMode: input.request.activationMode,
    environmentTarget: input.request.environmentTarget,
    dataResidencyRegion: input.request.dataResidencyRegion,
    subscriptionModules: [...input.request.subscriptionModules],
    selectedPacks: [...input.request.selectedPacks],
    sourceModes,
    hasApiSource: sourceModes.includes("api"),
    hasFileSource: sourceModes.includes("file") || sourceModes.includes("sftp"),
    targetGoLiveAt: input.request.targetGoLiveAt ?? null,
    onboardingRuntime: "praedixa-admin",
  };
}

export const CLIENT_ONBOARDING_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
  id="Definitions_client_onboarding_v1"
  targetNamespace="https://praedixa.com/camunda/onboarding">
  <bpmn:process id="${ONBOARDING_PROCESS_DEFINITION_ID}" name="Praedixa Client Onboarding V1" isExecutable="true">
    <bpmn:startEvent id="start_event" name="Case created">
      <bpmn:outgoing>flow_start_to_scope</bpmn:outgoing>
    </bpmn:startEvent>

    <bpmn:userTask id="scope-contract" name="Valider le scope contractuel, la residence data et l'environnement cible">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_start_to_scope</bpmn:incoming>
      <bpmn:outgoing>flow_scope_to_access</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:userTask id="access-model" name="Configurer le modele d'acces, les roles client et le SSO">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_scope_to_access</bpmn:incoming>
      <bpmn:outgoing>flow_access_to_source_strategy</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:userTask id="source-strategy" name="Confirmer la strategie de sources critiques V1">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_access_to_source_strategy</bpmn:incoming>
      <bpmn:outgoing>flow_source_strategy_to_gateway_api</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:exclusiveGateway id="gateway_has_api" default="flow_skip_api">
      <bpmn:incoming>flow_source_strategy_to_gateway_api</bpmn:incoming>
      <bpmn:outgoing>flow_activate_api</bpmn:outgoing>
      <bpmn:outgoing>flow_skip_api</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:userTask id="activate-api-sources" name="Activer les connecteurs API, probes et first sync">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_activate_api</bpmn:incoming>
      <bpmn:outgoing>flow_api_to_gateway_file</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:exclusiveGateway id="gateway_has_file" default="flow_skip_file">
      <bpmn:incoming>flow_skip_api</bpmn:incoming>
      <bpmn:incoming>flow_api_to_gateway_file</bpmn:incoming>
      <bpmn:outgoing>flow_activate_file</bpmn:outgoing>
      <bpmn:outgoing>flow_skip_file</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:userTask id="configure-file-sources" name="Configurer les imports CSV/Excel/SFTP et leurs profils">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_activate_file</bpmn:incoming>
      <bpmn:outgoing>flow_file_to_publish_mappings</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:userTask id="publish-mappings" name="Publier les mappings et fermer la quarantaine critique">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_skip_file</bpmn:incoming>
      <bpmn:incoming>flow_file_to_publish_mappings</bpmn:incoming>
      <bpmn:outgoing>flow_publish_to_product_scope</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:userTask id="configure-product-scope" name="Configurer modules, KPI, horizons et leviers d'optimisation">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_publish_to_product_scope</bpmn:incoming>
      <bpmn:outgoing>flow_product_scope_to_activation_review</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:userTask id="activation-review" name="Passer la revue readiness et preparer l'activation pilote">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_product_scope_to_activation_review</bpmn:incoming>
      <bpmn:outgoing>flow_activation_review_to_end</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:userTask id="execute-activation" name="Executer l'activation et ouvrir l'hypercare">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_activation_review_to_gateway_rollout</bpmn:incoming>
      <bpmn:outgoing>flow_execute_activation_to_hypercare</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:exclusiveGateway id="gateway_is_shadow" default="flow_shadow_to_end">
      <bpmn:incoming>flow_activation_review_to_gateway_rollout</bpmn:incoming>
      <bpmn:outgoing>flow_execute_activation</bpmn:outgoing>
      <bpmn:outgoing>flow_shadow_to_end</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:userTask id="close-hypercare" name="Clore l'hypercare et signer la stabilisation">
      <bpmn:extensionElements>
        <zeebe:assignmentDefinition candidateGroups="${CANDIDATE_GROUP}" />
        <zeebe:userTask />
      </bpmn:extensionElements>
      <bpmn:incoming>flow_execute_activation_to_hypercare</bpmn:incoming>
      <bpmn:outgoing>flow_hypercare_to_end</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:endEvent id="end_ready" name="Case ready">
      <bpmn:incoming>flow_shadow_to_end</bpmn:incoming>
      <bpmn:incoming>flow_hypercare_to_end</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:sequenceFlow id="flow_start_to_scope" sourceRef="start_event" targetRef="scope-contract" />
    <bpmn:sequenceFlow id="flow_scope_to_access" sourceRef="scope-contract" targetRef="access-model" />
    <bpmn:sequenceFlow id="flow_access_to_source_strategy" sourceRef="access-model" targetRef="source-strategy" />
    <bpmn:sequenceFlow id="flow_source_strategy_to_gateway_api" sourceRef="source-strategy" targetRef="gateway_has_api" />
    <bpmn:sequenceFlow id="flow_activate_api" sourceRef="gateway_has_api" targetRef="activate-api-sources">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">= hasApiSource</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="flow_skip_api" sourceRef="gateway_has_api" targetRef="gateway_has_file" />
    <bpmn:sequenceFlow id="flow_api_to_gateway_file" sourceRef="activate-api-sources" targetRef="gateway_has_file" />
    <bpmn:sequenceFlow id="flow_activate_file" sourceRef="gateway_has_file" targetRef="configure-file-sources">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">= hasFileSource</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="flow_skip_file" sourceRef="gateway_has_file" targetRef="publish-mappings" />
    <bpmn:sequenceFlow id="flow_file_to_publish_mappings" sourceRef="configure-file-sources" targetRef="publish-mappings" />
    <bpmn:sequenceFlow id="flow_publish_to_product_scope" sourceRef="publish-mappings" targetRef="configure-product-scope" />
    <bpmn:sequenceFlow id="flow_product_scope_to_activation_review" sourceRef="configure-product-scope" targetRef="activation-review" />
    <bpmn:sequenceFlow id="flow_activation_review_to_gateway_rollout" sourceRef="activation-review" targetRef="gateway_is_shadow" />
    <bpmn:sequenceFlow id="flow_execute_activation" sourceRef="gateway_is_shadow" targetRef="execute-activation">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">= activationMode != "shadow"</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="flow_shadow_to_end" sourceRef="gateway_is_shadow" targetRef="end_ready" />
    <bpmn:sequenceFlow id="flow_execute_activation_to_hypercare" sourceRef="execute-activation" targetRef="close-hypercare" />
    <bpmn:sequenceFlow id="flow_hypercare_to_end" sourceRef="close-hypercare" targetRef="end_ready" />
  </bpmn:process>
</bpmn:definitions>
`;
