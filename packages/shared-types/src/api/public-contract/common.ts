export type PublicApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export type PublicApiAuthMode = "public" | "bearer";
export type PublicApiResponseEnvelope =
  | "SuccessObject"
  | "SuccessArray"
  | "PaginatedSuccess";

export interface PublicApiCompatibilityPolicy {
  additiveChangesWithinMajorOnly: true;
  breakingChangesRequireNewMajor: true;
  minDeprecationNoticeDays: number;
  deprecationHeader: "Deprecation";
  sunsetHeader: "Sunset";
  replacementRequiredBeforeRemoval: true;
}

export const PUBLIC_API_COMPATIBILITY_POLICY = {
  additiveChangesWithinMajorOnly: true,
  breakingChangesRequireNewMajor: true,
  minDeprecationNoticeDays: 90,
  deprecationHeader: "Deprecation",
  sunsetHeader: "Sunset",
  replacementRequiredBeforeRemoval: true,
} as const satisfies PublicApiCompatibilityPolicy;

export interface PublicApiOperationContract<TypeName extends string = string> {
  operationId: string;
  method: PublicApiMethod;
  path: string;
  auth: PublicApiAuthMode;
  responseEnvelope: PublicApiResponseEnvelope;
  responseTypeName: TypeName;
  requestTypeName?: TypeName | null;
  requestBodyRequired?: boolean;
}
