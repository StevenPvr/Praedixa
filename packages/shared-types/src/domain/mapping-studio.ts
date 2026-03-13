export const MAPPING_STUDIO_SCHEMA_VERSION = 1 as const;

export type MappingStudioScalar = string | number | boolean | null;

export type MappingStudioFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime";

export type MappingStudioTransformationKind =
  | "direct"
  | "trim"
  | "uppercase"
  | "lowercase"
  | "to_number"
  | "to_boolean"
  | "to_iso_datetime"
  | "concat";

export type MappingStudioValidationStatus =
  | "draft"
  | "invalid"
  | "warning"
  | "ready";

export type MappingStudioMappingStatus =
  | "unmapped"
  | "invalid"
  | "warning"
  | "valid";

export type MappingStudioIssueSeverity = "blocking" | "non_blocking";

export type MappingStudioIssueCode =
  | "duplicate_target_mapping"
  | "missing_required_target_mapping"
  | "optional_target_unmapped"
  | "preview_source_value_missing"
  | "preview_transform_failed"
  | "transformation_source_count_invalid"
  | "unknown_source_column"
  | "unknown_target_field";

export interface MappingStudioSourceColumnDraft {
  sourceColumnKey: string;
  label?: string | null;
  dataType: MappingStudioFieldType;
  nullable?: boolean;
  sampleValues?: readonly MappingStudioScalar[];
}

export interface MappingStudioSourceColumn {
  sourceColumnKey: string;
  label: string;
  dataType: MappingStudioFieldType;
  nullable: boolean;
  sampleValues: MappingStudioScalar[];
}

export interface MappingStudioTargetFieldDraft {
  targetFieldKey: string;
  label?: string | null;
  dataType: MappingStudioFieldType;
  isRequired: boolean;
}

export interface MappingStudioTargetField {
  targetFieldKey: string;
  label: string;
  dataType: MappingStudioFieldType;
  isRequired: boolean;
}

export interface MappingStudioTransformationDraft {
  kind?: MappingStudioTransformationKind;
  delimiter?: string | null;
}

export interface MappingStudioTransformation {
  kind: MappingStudioTransformationKind;
  delimiter: string | null;
}

export interface MappingStudioFieldMappingDraft {
  targetFieldKey: string;
  sourceColumnKeys?: readonly string[];
  transformation?: MappingStudioTransformationDraft;
}

export interface MappingStudioIssue {
  code: MappingStudioIssueCode;
  severity: MappingStudioIssueSeverity;
  path: string;
  message: string;
}

export interface MappingStudioFieldMapping {
  mappingKey: string;
  targetFieldKey: string;
  sourceColumnKeys: string[];
  transformation: MappingStudioTransformation;
  status: MappingStudioMappingStatus;
  issues: MappingStudioIssue[];
}

export interface MappingStudioPreviewSourceRow {
  rowKey: string;
  sourceValues: Record<string, MappingStudioScalar>;
}

export interface MappingStudioPreviewCell {
  targetFieldKey: string;
  value: MappingStudioScalar;
  status: "mapped" | "empty" | "error";
  issues: MappingStudioIssue[];
}

export interface MappingStudioPreviewRow {
  rowKey: string;
  cells: MappingStudioPreviewCell[];
}

export interface MappingStudioCoverageSummary {
  totalTargetFields: number;
  requiredTargetFields: number;
  mappedTargetFields: number;
  validMappings: number;
  warningMappings: number;
  invalidMappings: number;
  unmappedMappings: number;
  missingRequiredTargetFieldKeys: string[];
  optionalUnmappedTargetFieldKeys: string[];
  coveragePct: number;
  requiredCoveragePct: number;
}

export interface MappingStudioPublicationValidation {
  isPublishable: boolean;
  blockingIssues: MappingStudioIssue[];
  nonBlockingIssues: MappingStudioIssue[];
}

export interface MappingStudioProfileDraft {
  profileId: string;
  version: number;
  datasetKey: string;
  sourceColumns: readonly MappingStudioSourceColumnDraft[];
  targetFields: readonly MappingStudioTargetFieldDraft[];
  mappings?: readonly MappingStudioFieldMappingDraft[];
  previewSourceRows?: readonly MappingStudioPreviewSourceRow[];
}

export interface MappingStudioProfile {
  schemaVersion: typeof MAPPING_STUDIO_SCHEMA_VERSION;
  profileId: string;
  version: number;
  datasetKey: string;
  sourceColumns: MappingStudioSourceColumn[];
  targetFields: MappingStudioTargetField[];
  mappings: MappingStudioFieldMapping[];
  previewRows: MappingStudioPreviewRow[];
  coverage: MappingStudioCoverageSummary;
  issues: MappingStudioIssue[];
  validationStatus: MappingStudioValidationStatus;
}

const DEFAULT_TRANSFORMATION_KIND: MappingStudioTransformationKind = "direct";

const ISSUE_SEVERITY_RANK: Record<MappingStudioIssueSeverity, number> = {
  non_blocking: 0,
  blocking: 1,
};

function requireNonEmptyString(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TypeError(`${field} is required`);
  }
  return normalized;
}

function requirePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive integer`);
  }
  return value;
}

function normalizeOrderedKeyList(
  values: readonly string[] | undefined,
): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values ?? []) {
    const candidate = value.trim();
    if (!candidate || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    normalized.push(candidate);
  }

  return normalized;
}

function normalizeScalarArray(
  values: readonly MappingStudioScalar[] | undefined,
): MappingStudioScalar[] {
  return [...(values ?? [])];
}

function requireNonEmptyArray<T>(
  value: readonly T[] | undefined,
  field: string,
): readonly T[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${field} must contain at least one item`);
  }
  return value;
}

function normalizeFieldType(
  value: MappingStudioFieldType,
): MappingStudioFieldType {
  switch (value) {
    case "string":
    case "number":
    case "boolean":
    case "date":
    case "datetime":
      return value;
    default:
      throw new TypeError(`Unsupported field type: ${String(value)}`);
  }
}

function normalizeTransformation(
  input: MappingStudioTransformationDraft | undefined,
): MappingStudioTransformation {
  const kind = input?.kind ?? DEFAULT_TRANSFORMATION_KIND;
  const delimiter =
    kind === "concat"
      ? input?.delimiter == null
        ? " "
        : input.delimiter
      : null;

  switch (kind) {
    case "direct":
    case "trim":
    case "uppercase":
    case "lowercase":
    case "to_number":
    case "to_boolean":
    case "to_iso_datetime":
    case "concat":
      return { kind, delimiter };
    default:
      throw new TypeError(`Unsupported transformation kind: ${String(kind)}`);
  }
}

function sortIssues(
  issues: readonly MappingStudioIssue[],
): MappingStudioIssue[] {
  return [...issues].sort((left, right) => {
    const severityDiff =
      ISSUE_SEVERITY_RANK[right.severity] - ISSUE_SEVERITY_RANK[left.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    const codeDiff = left.code.localeCompare(right.code);
    if (codeDiff !== 0) {
      return codeDiff;
    }
    return left.path.localeCompare(right.path);
  });
}

function dedupeIssues(
  issues: readonly MappingStudioIssue[],
): MappingStudioIssue[] {
  return sortIssues(
    Array.from(
      new Map(
        issues.map((issue) => [`${issue.code}:${issue.path}`, issue]),
      ).values(),
    ),
  );
}

function buildIssue(
  code: MappingStudioIssueCode,
  severity: MappingStudioIssueSeverity,
  path: string,
  message: string,
): MappingStudioIssue {
  return { code, severity, path, message };
}

function normalizeSourceColumns(
  input: readonly MappingStudioSourceColumnDraft[],
): MappingStudioSourceColumn[] {
  const seen = new Set<string>();

  return [...input]
    .map((column) => {
      const sourceColumnKey = requireNonEmptyString(
        column.sourceColumnKey,
        "sourceColumns[].sourceColumnKey",
      );
      if (seen.has(sourceColumnKey)) {
        throw new TypeError(`Duplicate source column key: ${sourceColumnKey}`);
      }
      seen.add(sourceColumnKey);

      return {
        sourceColumnKey,
        label: column.label?.trim() || sourceColumnKey,
        dataType: normalizeFieldType(column.dataType),
        nullable: Boolean(column.nullable),
        sampleValues: normalizeScalarArray(column.sampleValues),
      };
    })
    .sort((left, right) =>
      left.sourceColumnKey.localeCompare(right.sourceColumnKey),
    );
}

function normalizeTargetFields(
  input: readonly MappingStudioTargetFieldDraft[],
): MappingStudioTargetField[] {
  const seen = new Set<string>();

  return [...input]
    .map((field) => {
      const targetFieldKey = requireNonEmptyString(
        field.targetFieldKey,
        "targetFields[].targetFieldKey",
      );
      if (seen.has(targetFieldKey)) {
        throw new TypeError(`Duplicate target field key: ${targetFieldKey}`);
      }
      seen.add(targetFieldKey);

      return {
        targetFieldKey,
        label: field.label?.trim() || targetFieldKey,
        dataType: normalizeFieldType(field.dataType),
        isRequired: field.isRequired,
      };
    })
    .sort((left, right) =>
      left.targetFieldKey.localeCompare(right.targetFieldKey),
    );
}

function deriveMappingStatus(
  issues: readonly MappingStudioIssue[],
  sourceColumnKeys: readonly string[],
): MappingStudioMappingStatus {
  if (issues.some((issue) => issue.severity === "blocking")) {
    return "invalid";
  }
  if (sourceColumnKeys.length === 0) {
    return "unmapped";
  }
  if (issues.length > 0) {
    return "warning";
  }
  return "valid";
}

function normalizeMappings(
  targetFields: readonly MappingStudioTargetField[],
  sourceColumns: readonly MappingStudioSourceColumn[],
  drafts: readonly MappingStudioFieldMappingDraft[],
): {
  mappings: MappingStudioFieldMapping[];
  profileIssues: MappingStudioIssue[];
} {
  const sourceKeys = new Set(
    sourceColumns.map((column) => column.sourceColumnKey),
  );
  const draftsByTarget = new Map<string, MappingStudioFieldMappingDraft[]>();
  const profileIssues: MappingStudioIssue[] = [];

  for (const draft of drafts) {
    const targetFieldKey = requireNonEmptyString(
      draft.targetFieldKey,
      "mappings[].targetFieldKey",
    );

    if (
      !targetFields.some((field) => field.targetFieldKey === targetFieldKey)
    ) {
      profileIssues.push(
        buildIssue(
          "unknown_target_field",
          "blocking",
          `mappings.${targetFieldKey}`,
          `Unknown target field: ${targetFieldKey}`,
        ),
      );
      continue;
    }

    const current = draftsByTarget.get(targetFieldKey) ?? [];
    current.push(draft);
    draftsByTarget.set(targetFieldKey, current);
  }

  const mappings = targetFields.map((targetField) => {
    const targetDrafts = draftsByTarget.get(targetField.targetFieldKey) ?? [];
    const primaryDraft = targetDrafts[0];
    const issues: MappingStudioIssue[] = [];

    if (targetDrafts.length > 1) {
      issues.push(
        buildIssue(
          "duplicate_target_mapping",
          "blocking",
          `mappings.${targetField.targetFieldKey}`,
          `Multiple mappings target ${targetField.targetFieldKey}`,
        ),
      );
    }

    const sourceColumnKeys = normalizeOrderedKeyList(
      primaryDraft?.sourceColumnKeys,
    );
    const transformation = normalizeTransformation(
      primaryDraft?.transformation,
    );

    if (sourceColumnKeys.length === 0) {
      issues.push(
        buildIssue(
          targetField.isRequired
            ? "missing_required_target_mapping"
            : "optional_target_unmapped",
          targetField.isRequired ? "blocking" : "non_blocking",
          `mappings.${targetField.targetFieldKey}`,
          targetField.isRequired
            ? `Required target field ${targetField.targetFieldKey} is not mapped`
            : `Optional target field ${targetField.targetFieldKey} is not mapped`,
        ),
      );
    }

    const unknownSourceColumns = sourceColumnKeys.filter(
      (sourceColumnKey) => !sourceKeys.has(sourceColumnKey),
    );

    if (unknownSourceColumns.length > 0) {
      issues.push(
        buildIssue(
          "unknown_source_column",
          "blocking",
          `mappings.${targetField.targetFieldKey}`,
          `Unknown source column(s): ${unknownSourceColumns.join(", ")}`,
        ),
      );
    }

    const expectsSingleSource = transformation.kind !== "concat";
    if (
      sourceColumnKeys.length > 0 &&
      ((expectsSingleSource && sourceColumnKeys.length !== 1) ||
        (!expectsSingleSource && sourceColumnKeys.length < 1))
    ) {
      issues.push(
        buildIssue(
          "transformation_source_count_invalid",
          "blocking",
          `mappings.${targetField.targetFieldKey}`,
          expectsSingleSource
            ? `${transformation.kind} expects exactly one source column`
            : `${transformation.kind} expects at least one source column`,
        ),
      );
    }

    const status = deriveMappingStatus(issues, sourceColumnKeys);

    return {
      mappingKey: targetField.targetFieldKey,
      targetFieldKey: targetField.targetFieldKey,
      sourceColumnKeys,
      transformation,
      status,
      issues: sortIssues(issues),
    };
  });

  return {
    mappings,
    profileIssues: dedupeIssues(profileIssues),
  };
}

export function calculateMappingStudioCoverage(
  profile: Pick<MappingStudioProfile, "mappings" | "targetFields">,
): MappingStudioCoverageSummary {
  const requiredTargetFields = profile.targetFields.filter(
    (field) => field.isRequired,
  );
  const mappedTargetFields = profile.mappings.filter(
    (mapping) => mapping.sourceColumnKeys.length > 0,
  );
  const missingRequiredTargetFieldKeys = profile.targetFields
    .filter((field) => {
      if (!field.isRequired) {
        return false;
      }
      const mapping = profile.mappings.find(
        (candidate) => candidate.targetFieldKey === field.targetFieldKey,
      );
      return (
        !mapping ||
        mapping.status === "invalid" ||
        mapping.status === "unmapped"
      );
    })
    .map((field) => field.targetFieldKey)
    .sort((left, right) => left.localeCompare(right));
  const optionalUnmappedTargetFieldKeys = profile.targetFields
    .filter((field) => {
      if (field.isRequired) {
        return false;
      }
      const mapping = profile.mappings.find(
        (candidate) => candidate.targetFieldKey === field.targetFieldKey,
      );
      return !mapping || mapping.sourceColumnKeys.length === 0;
    })
    .map((field) => field.targetFieldKey)
    .sort((left, right) => left.localeCompare(right));
  const totalTargetFields = profile.targetFields.length;
  const totalRequiredTargetFields = requiredTargetFields.length;
  const coveragePct =
    totalTargetFields === 0
      ? 0
      : Number(
          ((mappedTargetFields.length / totalTargetFields) * 100).toFixed(2),
        );
  const requiredCoveragePct =
    totalRequiredTargetFields === 0
      ? 100
      : Number(
          (
            ((totalRequiredTargetFields -
              missingRequiredTargetFieldKeys.length) /
              totalRequiredTargetFields) *
            100
          ).toFixed(2),
        );

  return {
    totalTargetFields,
    requiredTargetFields: totalRequiredTargetFields,
    mappedTargetFields: mappedTargetFields.length,
    validMappings: profile.mappings.filter(
      (mapping) => mapping.status === "valid",
    ).length,
    warningMappings: profile.mappings.filter(
      (mapping) => mapping.status === "warning",
    ).length,
    invalidMappings: profile.mappings.filter(
      (mapping) => mapping.status === "invalid",
    ).length,
    unmappedMappings: profile.mappings.filter(
      (mapping) => mapping.status === "unmapped",
    ).length,
    missingRequiredTargetFieldKeys,
    optionalUnmappedTargetFieldKeys,
    coveragePct,
    requiredCoveragePct,
  };
}

function normalizePreviewSourceRows(
  rows: readonly MappingStudioPreviewSourceRow[] | undefined,
): MappingStudioPreviewSourceRow[] {
  return [...(rows ?? [])]
    .map((row) => ({
      rowKey: requireNonEmptyString(row.rowKey, "previewSourceRows[].rowKey"),
      sourceValues: Object.fromEntries(
        Object.entries(row.sourceValues)
          .map(([key, value]) => [key.trim(), value] as const)
          .filter(([key]) => key.length > 0)
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
    }))
    .sort((left, right) => left.rowKey.localeCompare(right.rowKey));
}

function normalizeBoolean(value: MappingStudioScalar): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(normalized)) {
    return false;
  }
  return null;
}

function applyTransformation(
  mapping: MappingStudioFieldMapping,
  sourceValues: MappingStudioScalar[],
  rowPath: string,
): { value: MappingStudioScalar; issues: MappingStudioIssue[] } {
  if (mapping.status === "invalid") {
    return { value: null, issues: mapping.issues };
  }

  if (mapping.sourceColumnKeys.length === 0) {
    return { value: null, issues: mapping.issues };
  }

  const primaryValue = sourceValues[0] ?? null;
  const hasMissingSourceValue = sourceValues.some((value) => value == null);
  const issues = hasMissingSourceValue
    ? [
        buildIssue(
          "preview_source_value_missing",
          "non_blocking",
          rowPath,
          "Preview row is missing at least one mapped source value",
        ),
      ]
    : [];

  switch (mapping.transformation.kind) {
    case "direct":
      return { value: primaryValue, issues };
    case "trim":
      return {
        value: primaryValue == null ? null : String(primaryValue).trim(),
        issues,
      };
    case "uppercase":
      return {
        value: primaryValue == null ? null : String(primaryValue).toUpperCase(),
        issues,
      };
    case "lowercase":
      return {
        value: primaryValue == null ? null : String(primaryValue).toLowerCase(),
        issues,
      };
    case "concat":
      return {
        value: sourceValues
          .filter((value) => value != null && String(value).length > 0)
          .map((value) => String(value))
          .join(mapping.transformation.delimiter ?? " "),
        issues,
      };
    case "to_number": {
      const numericValue =
        typeof primaryValue === "number"
          ? primaryValue
          : primaryValue == null
            ? null
            : Number(primaryValue);
      if (numericValue == null || Number.isNaN(numericValue)) {
        return {
          value: null,
          issues: sortIssues([
            ...issues,
            buildIssue(
              "preview_transform_failed",
              "non_blocking",
              rowPath,
              "Preview value cannot be converted to number",
            ),
          ]),
        };
      }
      return { value: numericValue, issues };
    }
    case "to_boolean": {
      const booleanValue = normalizeBoolean(primaryValue);
      if (booleanValue == null) {
        return {
          value: null,
          issues: sortIssues([
            ...issues,
            buildIssue(
              "preview_transform_failed",
              "non_blocking",
              rowPath,
              "Preview value cannot be converted to boolean",
            ),
          ]),
        };
      }
      return { value: booleanValue, issues };
    }
    case "to_iso_datetime": {
      if (primaryValue == null) {
        return { value: null, issues };
      }
      const timestamp = Date.parse(String(primaryValue));
      if (Number.isNaN(timestamp)) {
        return {
          value: null,
          issues: sortIssues([
            ...issues,
            buildIssue(
              "preview_transform_failed",
              "non_blocking",
              rowPath,
              "Preview value cannot be converted to ISO datetime",
            ),
          ]),
        };
      }
      return { value: new Date(timestamp).toISOString(), issues };
    }
  }
}

export function buildMappingStudioPreview(
  profile: Pick<MappingStudioProfile, "mappings" | "targetFields">,
  previewSourceRows: readonly MappingStudioPreviewSourceRow[],
): MappingStudioPreviewRow[] {
  const mappingByTarget = new Map(
    profile.mappings.map((mapping) => [mapping.targetFieldKey, mapping]),
  );

  return normalizePreviewSourceRows(previewSourceRows).map((row) => ({
    rowKey: row.rowKey,
    cells: profile.targetFields.map((targetField) => {
      const mapping = mappingByTarget.get(targetField.targetFieldKey);
      if (!mapping) {
        return {
          targetFieldKey: targetField.targetFieldKey,
          value: null,
          status: "error",
          issues: [
            buildIssue(
              "missing_required_target_mapping",
              "blocking",
              `previewRows.${row.rowKey}.${targetField.targetFieldKey}`,
              `No mapping exists for ${targetField.targetFieldKey}`,
            ),
          ],
        } satisfies MappingStudioPreviewCell;
      }

      const applied = applyTransformation(
        mapping,
        mapping.sourceColumnKeys.map(
          (sourceColumnKey) => row.sourceValues[sourceColumnKey] ?? null,
        ),
        `previewRows.${row.rowKey}.${targetField.targetFieldKey}`,
      );

      return {
        targetFieldKey: targetField.targetFieldKey,
        value: applied.value,
        status:
          mapping.status === "invalid"
            ? "error"
            : applied.value == null || applied.value === ""
              ? "empty"
              : "mapped",
        issues: sortIssues(applied.issues),
      } satisfies MappingStudioPreviewCell;
    }),
  }));
}

export function validateMappingStudioPublication(
  profile: Pick<MappingStudioProfile, "coverage" | "issues">,
): MappingStudioPublicationValidation {
  const coverageIssues = [
    ...profile.coverage.missingRequiredTargetFieldKeys.map((targetFieldKey) =>
      buildIssue(
        "missing_required_target_mapping",
        "blocking",
        `mappings.${targetFieldKey}`,
        `Required target field ${targetFieldKey} is not mapped`,
      ),
    ),
    ...profile.coverage.optionalUnmappedTargetFieldKeys.map((targetFieldKey) =>
      buildIssue(
        "optional_target_unmapped",
        "non_blocking",
        `mappings.${targetFieldKey}`,
        `Optional target field ${targetFieldKey} is not mapped`,
      ),
    ),
  ];
  const allIssues = dedupeIssues([...profile.issues, ...coverageIssues]);
  const blockingIssues = dedupeIssues(
    allIssues.filter((issue) => issue.severity === "blocking"),
  );
  const nonBlockingIssues = dedupeIssues(
    allIssues.filter((issue) => issue.severity === "non_blocking"),
  );

  return {
    isPublishable:
      blockingIssues.length === 0 &&
      profile.coverage.missingRequiredTargetFieldKeys.length === 0,
    blockingIssues,
    nonBlockingIssues,
  };
}

function classifyProfileValidationStatus(
  mappings: readonly MappingStudioFieldMapping[],
  publication: MappingStudioPublicationValidation,
): MappingStudioValidationStatus {
  const hasAnyMappedField = mappings.some(
    (mapping) => mapping.sourceColumnKeys.length > 0,
  );

  if (!hasAnyMappedField) {
    return "draft";
  }
  if (!publication.isPublishable) {
    return "invalid";
  }
  if (publication.nonBlockingIssues.length > 0) {
    return "warning";
  }
  return "ready";
}

export function normalizeMappingStudioDraft(
  draft: MappingStudioProfileDraft,
): MappingStudioProfile {
  const sourceColumns = normalizeSourceColumns(
    requireNonEmptyArray(draft.sourceColumns, "sourceColumns"),
  );
  const targetFields = normalizeTargetFields(
    requireNonEmptyArray(draft.targetFields, "targetFields"),
  );
  const normalizedMappings = normalizeMappings(
    targetFields,
    sourceColumns,
    draft.mappings ?? [],
  );
  const profileCore = {
    schemaVersion: MAPPING_STUDIO_SCHEMA_VERSION,
    profileId: requireNonEmptyString(draft.profileId, "profileId"),
    version: requirePositiveInteger(draft.version, "version"),
    datasetKey: requireNonEmptyString(draft.datasetKey, "datasetKey"),
    sourceColumns,
    targetFields,
    mappings: normalizedMappings.mappings,
  };
  const coverage = calculateMappingStudioCoverage(profileCore);
  const issues = dedupeIssues([
    ...normalizedMappings.profileIssues,
    ...profileCore.mappings.flatMap((mapping) => mapping.issues),
  ]);
  const previewRows = buildMappingStudioPreview(
    {
      mappings: profileCore.mappings,
      targetFields: profileCore.targetFields,
    },
    draft.previewSourceRows ?? [],
  );
  const publication = validateMappingStudioPublication({ coverage, issues });

  return {
    ...profileCore,
    previewRows,
    coverage,
    issues,
    validationStatus: classifyProfileValidationStatus(
      profileCore.mappings,
      publication,
    ),
  };
}
