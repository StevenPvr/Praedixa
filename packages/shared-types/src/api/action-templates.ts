import type { ActionTemplate } from "../domain/action-template.js";

export interface ActionTemplateListRequest {
  actionType?: string;
  destinationType?: string;
  includeDeprecated?: boolean;
  search?: string;
  tags?: readonly string[];
}

export interface ActionTemplateListResponse {
  total: number;
  items: readonly ActionTemplate[];
}

export interface ActionTemplateResolveRequest {
  actionType: string;
  destinationType: string;
  templateId?: string;
  templateVersion?: number;
  includeDeprecated?: boolean;
}

export interface ActionTemplateResolveResponse {
  template: ActionTemplate;
}
