import {
  buildMappingStudioPreview,
  calculateMappingStudioCoverage,
  normalizeMappingStudioDraft,
  validateMappingStudioPublication,
} from "@praedixa/shared-types/domain";
import type {
  MappingStudioCoverageSummary,
  MappingStudioPreviewRow,
  MappingStudioPreviewSourceRow,
  MappingStudioProfile,
  MappingStudioProfileDraft,
  MappingStudioPublicationValidation,
} from "@praedixa/shared-types/domain";

export type {
  MappingStudioCoverageSummary,
  MappingStudioPreviewRow,
  MappingStudioPreviewSourceRow,
  MappingStudioProfile,
  MappingStudioProfileDraft,
  MappingStudioPublicationValidation,
};

export function normalizeMappingProfile(
  draft: MappingStudioProfileDraft,
): MappingStudioProfile {
  return normalizeMappingStudioDraft(draft);
}

export function summarizeMappingCoverage(
  profile: Pick<MappingStudioProfile, "mappings" | "targetFields">,
): MappingStudioCoverageSummary {
  return calculateMappingStudioCoverage(profile);
}

export function buildStableMappingPreview(
  profile: Pick<MappingStudioProfile, "mappings" | "targetFields">,
  previewSourceRows: readonly MappingStudioPreviewSourceRow[],
): MappingStudioPreviewRow[] {
  return buildMappingStudioPreview(profile, previewSourceRows);
}

export function validateMappingPublication(
  profile: Pick<MappingStudioProfile, "coverage" | "issues">,
): MappingStudioPublicationValidation {
  return validateMappingStudioPublication(profile);
}
