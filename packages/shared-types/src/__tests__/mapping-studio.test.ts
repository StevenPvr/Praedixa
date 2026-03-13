import { describe, expect, it } from "vitest";

import {
  buildMappingStudioPreview,
  calculateMappingStudioCoverage,
  normalizeMappingStudioDraft,
  validateMappingStudioPublication,
  type MappingStudioProfileDraft,
} from "../domain/mapping-studio.js";

function makeDraft(
  overrides: Partial<MappingStudioProfileDraft> = {},
): MappingStudioProfileDraft {
  return {
    profileId: "profile-coverage",
    version: 2,
    datasetKey: "coverage_claims",
    sourceColumns: [
      {
        sourceColumnKey: "last_name",
        label: "Last Name",
        dataType: "string",
      },
      {
        sourceColumnKey: "first_name",
        label: "First Name",
        dataType: "string",
      },
      {
        sourceColumnKey: "member_id",
        label: "Member ID",
        dataType: "string",
      },
      {
        sourceColumnKey: "claim_amount",
        label: "Claim Amount",
        dataType: "string",
      },
      {
        sourceColumnKey: "service_date",
        label: "Service Date",
        dataType: "string",
      },
    ],
    targetFields: [
      {
        targetFieldKey: "service_date",
        label: "Service Date",
        dataType: "datetime",
        isRequired: true,
      },
      {
        targetFieldKey: "member_id",
        label: "Member ID",
        dataType: "string",
        isRequired: true,
      },
      {
        targetFieldKey: "full_name",
        label: "Full Name",
        dataType: "string",
        isRequired: false,
      },
      {
        targetFieldKey: "claim_amount",
        label: "Claim Amount",
        dataType: "number",
        isRequired: false,
      },
    ],
    mappings: [
      {
        targetFieldKey: "full_name",
        sourceColumnKeys: ["last_name", "first_name"],
        transformation: {
          kind: "concat",
          delimiter: ", ",
        },
      },
      {
        targetFieldKey: "claim_amount",
        sourceColumnKeys: ["claim_amount"],
        transformation: {
          kind: "to_number",
        },
      },
      {
        targetFieldKey: "member_id",
        sourceColumnKeys: ["member_id"],
        transformation: {
          kind: "trim",
        },
      },
      {
        targetFieldKey: "service_date",
        sourceColumnKeys: ["service_date"],
        transformation: {
          kind: "to_iso_datetime",
        },
      },
    ],
    previewSourceRows: [
      {
        rowKey: "row-2",
        sourceValues: {
          first_name: "Ada",
          last_name: "Lovelace",
          member_id: "  M-001 ",
          claim_amount: "125.5",
          service_date: "2026-03-12 09:45:00Z",
        },
      },
      {
        rowKey: "row-1",
        sourceValues: {
          first_name: "Grace",
          last_name: "Hopper",
          member_id: "M-002",
          claim_amount: "90",
          service_date: "2026-03-11T08:30:00.000Z",
        },
      },
    ],
    ...overrides,
  };
}

describe("normalizeMappingStudioDraft", () => {
  it("normalizes a valid draft into a publishable profile", () => {
    const profile = normalizeMappingStudioDraft(makeDraft());

    expect(profile.schemaVersion).toBe(1);
    expect(profile.validationStatus).toBe("ready");
    expect(
      profile.sourceColumns.map((column) => column.sourceColumnKey),
    ).toEqual([
      "claim_amount",
      "first_name",
      "last_name",
      "member_id",
      "service_date",
    ]);
    expect(profile.targetFields.map((field) => field.targetFieldKey)).toEqual([
      "claim_amount",
      "full_name",
      "member_id",
      "service_date",
    ]);
    expect(profile.coverage).toMatchObject({
      totalTargetFields: 4,
      requiredTargetFields: 2,
      mappedTargetFields: 4,
      missingRequiredTargetFieldKeys: [],
      coveragePct: 100,
      requiredCoveragePct: 100,
    });
  });

  it("tracks blocking and non-blocking issues with fail-closed publication", () => {
    const profile = normalizeMappingStudioDraft(
      makeDraft({
        mappings: [
          {
            targetFieldKey: "member_id",
            sourceColumnKeys: ["missing_column"],
            transformation: {
              kind: "trim",
            },
          },
        ],
      }),
    );
    const publication = validateMappingStudioPublication(profile);

    expect(profile.validationStatus).toBe("invalid");
    expect(profile.coverage.missingRequiredTargetFieldKeys).toEqual([
      "member_id",
      "service_date",
    ]);
    expect(publication.isPublishable).toBe(false);
    expect(publication.blockingIssues.map((issue) => issue.code)).toEqual([
      "missing_required_target_mapping",
      "missing_required_target_mapping",
      "unknown_source_column",
    ]);
    expect(publication.nonBlockingIssues.map((issue) => issue.code)).toEqual([
      "optional_target_unmapped",
      "optional_target_unmapped",
    ]);
  });

  it("builds a stable preview with deterministic row and target ordering", () => {
    const profile = normalizeMappingStudioDraft(makeDraft());
    const preview = buildMappingStudioPreview(
      profile,
      makeDraft().previewSourceRows ?? [],
    );

    expect(preview.map((row) => row.rowKey)).toEqual(["row-1", "row-2"]);
    expect(preview[0]?.cells.map((cell) => cell.targetFieldKey)).toEqual([
      "claim_amount",
      "full_name",
      "member_id",
      "service_date",
    ]);
    expect(preview[0]?.cells.map((cell) => cell.value)).toEqual([
      90,
      "Hopper, Grace",
      "M-002",
      "2026-03-11T08:30:00.000Z",
    ]);
  });

  it("marks optional unmapped fields as warnings without blocking publication", () => {
    const profile = normalizeMappingStudioDraft(
      makeDraft({
        targetFields: [
          ...makeDraft().targetFields,
          {
            targetFieldKey: "provider_name",
            label: "Provider Name",
            dataType: "string",
            isRequired: false,
          },
        ],
      }),
    );
    const coverage = calculateMappingStudioCoverage(profile);
    const publication = validateMappingStudioPublication(profile);

    expect(profile.validationStatus).toBe("warning");
    expect(coverage.optionalUnmappedTargetFieldKeys).toEqual(["provider_name"]);
    expect(publication.isPublishable).toBe(true);
    expect(publication.nonBlockingIssues.map((issue) => issue.code)).toContain(
      "optional_target_unmapped",
    );
  });

  it("fails closed when required top-level data is missing", () => {
    expect(() =>
      normalizeMappingStudioDraft({
        ...makeDraft(),
        sourceColumns: [],
      }),
    ).toThrowError("sourceColumns must contain at least one item");
  });
});
