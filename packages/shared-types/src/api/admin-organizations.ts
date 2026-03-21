export type AdminOrganizationStatus =
  | "trial"
  | "active"
  | "suspended"
  | "churned";

export type AdminOrganizationPlan =
  | "free"
  | "starter"
  | "professional"
  | "enterprise";

export interface AdminOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  status: AdminOrganizationStatus;
  plan: AdminOrganizationPlan;
  contactEmail: string;
  isTest: boolean;
  userCount: number;
  siteCount: number;
  createdAt: string;
}

export interface CreateAdminOrganizationRequest {
  name: string;
  slug: string;
  contactEmail: string;
  isTest?: boolean;
  plan?: AdminOrganizationPlan;
}

export interface DeleteAdminOrganizationRequest {
  organizationSlug: string;
  confirmationText: "SUPPRIMER";
  acknowledgeTestDeletion: true;
}

export interface DeleteAdminOrganizationResponse {
  organizationId: string;
  slug: string;
  deleted: true;
}
