import { describe, expect, it } from "vitest";

import {
  buildStableMappingPreview,
  normalizeMappingProfile,
  summarizeMappingCoverage,
  validateMappingPublication,
  type MappingStudioProfileDraft,
} from "../services/mapping-studio.js";

function makeDraft(
  overrides: Partial<MappingStudioProfileDraft> = {},
): MappingStudioProfileDraft {
  return {
    profileId: "claims-mapping",
    version: 3,
    datasetKey: "claims_raw",
    sourceColumns: [
      {
        sourceColumnKey: "member_id",
        label: "Member ID",
        dataType: "string",
      },
      {
        sourceColumnKey: "first_name",
        label: "First Name",
        dataType: "string",
      },
      {
        sourceColumnKey: "last_name",
        label: "Last Name",
        dataType: "string",
      },
      {
        sourceColumnKey: "claim_amount",
        label: "Claim Amount",
        dataType: "string",
      },
    ],
    targetFields: [
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
        targetFieldKey: "member_id",
        sourceColumnKeys: ["member_id"],
        transformation: { kind: "trim" },
      },
      {
        targetFieldKey: "full_name",
        sourceColumnKeys: ["last_name", "first_name"],
        transformation: { kind: "concat", delimiter: ", " },
      },
      {
        targetFieldKey: "claim_amount",
        sourceColumnKeys: ["claim_amount"],
        transformation: { kind: "to_number" },
      },
    ],
    previewSourceRows: [
      {
        rowKey: "row-b",
        sourceValues: {
          member_id: " B-002 ",
          first_name: "Ada",
          last_name: "Lovelace",
          claim_amount: "120.75",
        },
      },
      {
        rowKey: "row-a",
        sourceValues: {
          member_id: "A-001",
          first_name: "Grace",
          last_name: "Hopper",
          claim_amount: "80",
        },
      },
    ],
    ...overrides,
  };
}

describe("mapping-studio service", () => {
  it("normalizes a mapping profile and preserves a ready publication state", () => {
    const profile = normalizeMappingProfile(makeDraft());
    const publication = validateMappingPublication(profile);

    expect(profile.validationStatus).toBe("ready");
    expect(profile.coverage.mappedTargetFields).toBe(3);
    expect(publication.isPublishable).toBe(true);
    expect(publication.blockingIssues).toEqual([]);
  });

  it("computes coverage and publication failures for missing required mappings", () => {
    const profile = normalizeMappingProfile(
      makeDraft({
        mappings: [
          {
            targetFieldKey: "full_name",
            sourceColumnKeys: ["last_name", "first_name"],
            transformation: { kind: "concat", delimiter: ", " },
          },
        ],
      }),
    );
    const coverage = summarizeMappingCoverage(profile);
    const publication = validateMappingPublication(profile);

    expect(profile.validationStatus).toBe("invalid");
    expect(coverage.missingRequiredTargetFieldKeys).toEqual(["member_id"]);
    expect(publication.isPublishable).toBe(false);
    expect(publication.blockingIssues.map((issue) => issue.code)).toEqual([
      "missing_required_target_mapping",
    ]);
  });

  it("builds a deterministic stable preview from the normalized profile", () => {
    const draft = makeDraft();
    const profile = normalizeMappingProfile(draft);
    const preview = buildStableMappingPreview(
      profile,
      draft.previewSourceRows ?? [],
    );

    expect(preview.map((row) => row.rowKey)).toEqual(["row-a", "row-b"]);
    expect(preview[0]?.cells.map((cell) => cell.value)).toEqual([
      80,
      "Hopper, Grace",
      "A-001",
    ]);
  });

  it("fails closed when required structural data is missing", () => {
    expect(() =>
      normalizeMappingProfile({
        ...makeDraft(),
        targetFields: [],
      }),
    ).toThrowError("targetFields must contain at least one item");
  });
});
