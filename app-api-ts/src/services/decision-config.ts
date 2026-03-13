import { randomUUID } from "node:crypto";

import { Pool } from "pg";

type ScenarioOptionType =
  | "hs"
  | "interim"
  | "realloc_intra"
  | "realloc_inter"
  | "service_adjust"
  | "outsource";

export interface DecisionHorizonConfig {
  id: string;
  label: string;
  days: number;
  rank: number;
  active: boolean;
  isDefault: boolean;
}

export interface RecommendationOptionCatalogRule {
  optionType: ScenarioOptionType;
  enabled: boolean;
  label?: string;
  maxCoveredHours?: number;
}

export interface RecommendationWeights {
  cost: number;
  service: number;
  risk: number;
  feasibility: number;
}

export interface RecommendationConstraints {
  minServicePct?: number;
  maxRiskScore?: number;
  minFeasibilityScore?: number;
  requirePolicyCompliance?: boolean;
}

export interface RecommendationPolicyByHorizon {
  horizonId: string;
  weights: RecommendationWeights;
  constraints?: RecommendationConstraints;
  tieBreakers?: string[];
}

export interface DecisionEngineConfigPayload {
  horizons: DecisionHorizonConfig[];
  optionCatalog: RecommendationOptionCatalogRule[];
  policiesByHorizon: RecommendationPolicyByHorizon[];
}

export type DecisionConfigVersionStatus = "scheduled" | "active" | "cancelled";

export interface DecisionEngineConfigVersion {
  id: string;
  organizationId: string;
  siteId: string | null;
  status: DecisionConfigVersionStatus;
  effectiveAt: string;
  activatedAt: string | null;
  payload: DecisionEngineConfigPayload;
  rollbackFromVersionId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionConfigAuditEntry {
  id: string;
  organizationId: string;
  siteId: string | null;
  action: string;
  actorUserId: string | null;
  requestId: string | null;
  targetVersionId: string | null;
  beforePayload: DecisionEngineConfigPayload | null;
  afterPayload: DecisionEngineConfigPayload | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ResolvedDecisionEngineConfig {
  organizationId: string;
  siteId: string | null;
  versionId: string;
  effectiveAt: string;
  resolvedAt: string;
  payload: DecisionEngineConfigPayload;
  nextVersion: {
    id: string;
    effectiveAt: string;
  } | null;
}

interface CreateVersionInput {
  organizationId: string;
  siteId?: string | null;
  effectiveAt: string;
  payload: DecisionEngineConfigPayload;
  createdBy?: string | null;
  reason?: string;
  requestId?: string | null;
  rollbackFromVersionId?: string | null;
}

interface ResolveConfigInput {
  organizationId: string;
  siteId?: string | null;
  at?: string;
}

interface CancelVersionInput {
  organizationId: string;
  versionId: string;
  siteId?: string | null;
  actorUserId?: string | null;
  reason?: string;
  requestId?: string | null;
}

interface RollbackInput {
  organizationId: string;
  siteId?: string | null;
  actorUserId?: string | null;
  reason?: string;
  requestId?: string | null;
}

interface OptionCandidate {
  id: string;
  optionType: string;
  coutTotalEur: number;
  serviceAttenduPct: number;
  feasibilityScore?: number;
  riskScore?: number;
  policyCompliance?: boolean;
  heuresCouvertes?: number;
}

const DEFAULT_TIE_BREAKERS = [
  "service_desc",
  "cost_asc",
  "feasibility_desc",
] as const;

const SUPPORTED_OPTION_TYPES: readonly ScenarioOptionType[] = [
  "hs",
  "interim",
  "realloc_intra",
  "realloc_inter",
  "service_adjust",
  "outsource",
];

function normalizeSiteId(siteId: string | null | undefined): string | null {
  const value = siteId?.trim();
  return value && value.length > 0 ? value : null;
}

function toIso(value: string | Date): string {
  return typeof value === "string"
    ? new Date(value).toISOString()
    : value.toISOString();
}

function clonePayload(
  payload: DecisionEngineConfigPayload,
): DecisionEngineConfigPayload {
  return JSON.parse(JSON.stringify(payload)) as DecisionEngineConfigPayload;
}

function defaultConfigPayload(): DecisionEngineConfigPayload {
  return {
    horizons: [
      {
        id: "j3",
        label: "J+3",
        days: 3,
        rank: 1,
        active: true,
        isDefault: false,
      },
      {
        id: "j7",
        label: "J+7",
        days: 7,
        rank: 2,
        active: true,
        isDefault: true,
      },
      {
        id: "j14",
        label: "J+14",
        days: 14,
        rank: 3,
        active: true,
        isDefault: false,
      },
    ],
    optionCatalog: SUPPORTED_OPTION_TYPES.map((optionType) => ({
      optionType,
      enabled: true,
    })),
    policiesByHorizon: [
      {
        horizonId: "j3",
        weights: { cost: 0.2, service: 0.5, risk: 0.2, feasibility: 0.1 },
        constraints: {
          minServicePct: 92,
          maxRiskScore: 0.55,
          minFeasibilityScore: 0.45,
          requirePolicyCompliance: true,
        },
      },
      {
        horizonId: "j7",
        weights: { cost: 0.25, service: 0.4, risk: 0.2, feasibility: 0.15 },
        constraints: {
          minServicePct: 90,
          maxRiskScore: 0.6,
          minFeasibilityScore: 0.4,
          requirePolicyCompliance: true,
        },
      },
      {
        horizonId: "j14",
        weights: { cost: 0.35, service: 0.3, risk: 0.2, feasibility: 0.15 },
        constraints: {
          minServicePct: 88,
          maxRiskScore: 0.65,
          minFeasibilityScore: 0.35,
          requirePolicyCompliance: false,
        },
      },
    ],
  };
}

function validatePayload(payload: DecisionEngineConfigPayload): void {
  if (!Array.isArray(payload.horizons) || payload.horizons.length === 0) {
    throw new Error("At least one horizon must be configured");
  }
  if (
    !Array.isArray(payload.optionCatalog) ||
    payload.optionCatalog.length === 0
  ) {
    throw new Error("Option catalog cannot be empty");
  }

  const ids = new Set<string>();
  let defaultCount = 0;
  for (const horizon of payload.horizons) {
    const id = horizon.id.trim();
    if (id.length === 0) {
      throw new Error("Horizon id cannot be empty");
    }
    if (ids.has(id)) {
      throw new Error(`Duplicate horizon id "${id}"`);
    }
    ids.add(id);
    if (horizon.days <= 0) {
      throw new Error(`Horizon "${id}" must have days > 0`);
    }
    if (horizon.isDefault && horizon.active) {
      defaultCount += 1;
    }
  }

  if (defaultCount !== 1) {
    throw new Error("Exactly one active default horizon is required");
  }

  const policyHorizonIds = new Set(
    payload.policiesByHorizon.map((policy) => policy.horizonId),
  );
  for (const horizon of payload.horizons) {
    if (!policyHorizonIds.has(horizon.id)) {
      throw new Error(
        `Missing recommendation policy for horizon "${horizon.id}"`,
      );
    }
  }
}

function scoreOption(
  option: OptionCandidate,
  normalizedCost: number,
  weights: RecommendationWeights,
): number {
  const service = Math.max(0, Math.min(1, option.serviceAttenduPct / 100));
  const risk =
    option.riskScore == null ? 0.5 : Math.max(0, Math.min(1, option.riskScore));
  const feasibility =
    option.feasibilityScore == null
      ? 0.5
      : Math.max(0, Math.min(1, option.feasibilityScore));
  return (
    weights.cost * normalizedCost +
    weights.service * service +
    weights.risk * (1 - risk) +
    weights.feasibility * feasibility
  );
}

function compareByTieBreakers(
  a: OptionCandidate,
  b: OptionCandidate,
  tieBreakers: readonly string[],
): number {
  for (const tieBreaker of tieBreakers) {
    if (
      tieBreaker === "service_desc" &&
      b.serviceAttenduPct !== a.serviceAttenduPct
    ) {
      return b.serviceAttenduPct - a.serviceAttenduPct;
    }
    if (tieBreaker === "cost_asc" && a.coutTotalEur !== b.coutTotalEur) {
      return a.coutTotalEur - b.coutTotalEur;
    }
    if (
      tieBreaker === "feasibility_desc" &&
      (b.feasibilityScore ?? 0) !== (a.feasibilityScore ?? 0)
    ) {
      return (b.feasibilityScore ?? 0) - (a.feasibilityScore ?? 0);
    }
  }
  return a.id.localeCompare(b.id);
}

function pickPolicy(
  payload: DecisionEngineConfigPayload,
  horizonId: string,
): RecommendationPolicyByHorizon | null {
  return (
    payload.policiesByHorizon.find(
      (policy) => policy.horizonId === horizonId,
    ) ??
    payload.policiesByHorizon[0] ??
    null
  );
}

function enabledOptionRules(
  payload: DecisionEngineConfigPayload,
): Map<string, RecommendationOptionCatalogRule> {
  const map = new Map<string, RecommendationOptionCatalogRule>();
  for (const rule of payload.optionCatalog) {
    if (rule.enabled) {
      map.set(rule.optionType, rule);
    }
  }
  return map;
}

export function pickRecommendedOptionId(
  options: OptionCandidate[],
  payload: DecisionEngineConfigPayload,
  horizonId: string,
): string | null {
  if (options.length === 0) return null;
  const policy = pickPolicy(payload, horizonId);
  if (!policy) return null;

  const enabledRules = enabledOptionRules(payload);
  const filtered = options.filter((option) => {
    const rule = enabledRules.get(option.optionType);
    if (!rule) return false;
    if (
      rule.maxCoveredHours != null &&
      (option.heuresCouvertes ?? 0) > rule.maxCoveredHours
    ) {
      return false;
    }

    const constraints = policy.constraints;
    if (
      constraints?.minServicePct != null &&
      option.serviceAttenduPct < constraints.minServicePct
    ) {
      return false;
    }
    if (
      constraints?.maxRiskScore != null &&
      option.riskScore != null &&
      option.riskScore > constraints.maxRiskScore
    ) {
      return false;
    }
    if (
      constraints?.minFeasibilityScore != null &&
      option.feasibilityScore != null &&
      option.feasibilityScore < constraints.minFeasibilityScore
    ) {
      return false;
    }
    if (
      constraints?.requirePolicyCompliance &&
      option.policyCompliance === false
    ) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) return null;

  const costs = filtered.map((option) => option.coutTotalEur);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const range = Math.max(1, maxCost - minCost);

  const scored = filtered.map((option) => {
    const normalizedCost = 1 - (option.coutTotalEur - minCost) / range;
    return {
      option,
      score: scoreOption(option, normalizedCost, policy.weights),
    };
  });

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    const tieBreakers = policy.tieBreakers ?? [...DEFAULT_TIE_BREAKERS];
    return compareByTieBreakers(left.option, right.option, tieBreakers);
  });

  return scored[0]?.option.id ?? null;
}

type DbVersionRow = {
  id: string;
  organization_id: string;
  site_id: string | null;
  status: DecisionConfigVersionStatus;
  effective_at: string | Date;
  activated_at: string | Date | null;
  payload: DecisionEngineConfigPayload;
  rollback_from_version_id: string | null;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type DbAuditRow = {
  id: string;
  organization_id: string;
  site_id: string | null;
  action: string;
  actor_user_id: string | null;
  request_id: string | null;
  target_version_id: string | null;
  before_payload: DecisionEngineConfigPayload | null;
  after_payload: DecisionEngineConfigPayload | null;
  metadata: Record<string, unknown>;
  created_at: string | Date;
};

function toVersion(row: DbVersionRow): DecisionEngineConfigVersion {
  return {
    id: row.id,
    organizationId: row.organization_id,
    siteId: row.site_id,
    status: row.status,
    effectiveAt: toIso(row.effective_at),
    activatedAt: row.activated_at == null ? null : toIso(row.activated_at),
    payload: clonePayload(row.payload),
    rollbackFromVersionId: row.rollback_from_version_id,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function toAuditEntry(row: DbAuditRow): DecisionConfigAuditEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    siteId: row.site_id,
    action: row.action,
    actorUserId: row.actor_user_id,
    requestId: row.request_id,
    targetVersionId: row.target_version_id,
    beforePayload:
      row.before_payload == null ? null : clonePayload(row.before_payload),
    afterPayload:
      row.after_payload == null ? null : clonePayload(row.after_payload),
    metadata: row.metadata ?? {},
    createdAt: toIso(row.created_at),
  };
}

export class DecisionConfigService {
  private readonly pool: Pool | null;

  private readonly memoryVersions: DecisionEngineConfigVersion[] = [];

  private readonly memoryAudit: DecisionConfigAuditEntry[] = [];

  private readonly schemaReady: Promise<void>;

  constructor(databaseUrl: string | null) {
    this.pool = databaseUrl
      ? new Pool({ connectionString: databaseUrl })
      : null;
    this.schemaReady = this.ensureSchema();
  }

  private async ensureSchema(): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS decision_engine_config_versions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        site_id TEXT NULL,
        status TEXT NOT NULL CHECK (status IN ('scheduled', 'active', 'cancelled')),
        effective_at TIMESTAMPTZ NOT NULL,
        activated_at TIMESTAMPTZ NULL,
        payload JSONB NOT NULL,
        rollback_from_version_id TEXT NULL,
        created_by TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_decision_config_versions_scope
      ON decision_engine_config_versions (
        organization_id,
        site_id,
        status,
        effective_at
      );
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS decision_engine_config_audit (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        site_id TEXT NULL,
        action TEXT NOT NULL,
        actor_user_id TEXT NULL,
        request_id TEXT NULL,
        target_version_id TEXT NULL,
        before_payload JSONB NULL,
        after_payload JSONB NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_decision_config_audit_scope
      ON decision_engine_config_audit (
        organization_id,
        site_id,
        created_at DESC
      );
    `);
  }

  private async ready(): Promise<void> {
    await this.schemaReady;
  }

  private async writeAudit(
    entry: Omit<DecisionConfigAuditEntry, "id" | "createdAt">,
  ): Promise<void> {
    await this.ready();
    const row: DecisionConfigAuditEntry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry,
    };
    if (!this.pool) {
      this.memoryAudit.unshift(row);
      return;
    }
    await this.pool.query(
      `
      INSERT INTO decision_engine_config_audit (
        id,
        organization_id,
        site_id,
        action,
        actor_user_id,
        request_id,
        target_version_id,
        before_payload,
        after_payload,
        metadata,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      [
        row.id,
        row.organizationId,
        row.siteId,
        row.action,
        row.actorUserId,
        row.requestId,
        row.targetVersionId,
        row.beforePayload,
        row.afterPayload,
        row.metadata,
        row.createdAt,
      ],
    );
  }

  async listAudit(
    organizationId: string,
    siteId?: string | null,
    limit = 200,
  ): Promise<DecisionConfigAuditEntry[]> {
    await this.ready();
    const normalizedSiteId = normalizeSiteId(siteId);
    if (!this.pool) {
      return this.memoryAudit
        .filter((row) => row.organizationId === organizationId)
        .filter((row) =>
          siteId === undefined ? true : row.siteId === normalizedSiteId,
        )
        .slice(0, limit)
        .map((row) => ({ ...row, metadata: { ...row.metadata } }));
    }

    const rows = await this.pool.query<DbAuditRow>(
      `
      SELECT *
      FROM decision_engine_config_audit
      WHERE organization_id = $1
        AND ($2::text IS NULL OR site_id IS NOT DISTINCT FROM $2::text)
      ORDER BY created_at DESC
      LIMIT $3
      `,
      [organizationId, siteId === undefined ? null : normalizedSiteId, limit],
    );
    return rows.rows.map(toAuditEntry);
  }

  private async ensureBootstrap(organizationId: string): Promise<void> {
    await this.ready();
    const now = new Date().toISOString();
    if (!this.pool) {
      const hasOrgConfig = this.memoryVersions.some(
        (version) =>
          version.organizationId === organizationId && version.siteId == null,
      );
      if (hasOrgConfig) return;

      const boot: DecisionEngineConfigVersion = {
        id: randomUUID(),
        organizationId,
        siteId: null,
        status: "active",
        effectiveAt: now,
        activatedAt: now,
        payload: defaultConfigPayload(),
        rollbackFromVersionId: null,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      };
      this.memoryVersions.push(boot);
      await this.writeAudit({
        organizationId,
        siteId: null,
        action: "decision_config_bootstrapped",
        actorUserId: null,
        requestId: null,
        targetVersionId: boot.id,
        beforePayload: null,
        afterPayload: boot.payload,
        metadata: { source: "auto_bootstrap" },
      });
      return;
    }

    const existing = await this.pool.query<{ count: string }>(
      `
      SELECT COUNT(*)::text AS count
      FROM decision_engine_config_versions
      WHERE organization_id = $1
        AND site_id IS NULL
      `,
      [organizationId],
    );
    const count = Number(existing.rows[0]?.count ?? "0");
    if (count > 0) return;

    const id = randomUUID();
    const payload = defaultConfigPayload();
    await this.pool.query(
      `
      INSERT INTO decision_engine_config_versions (
        id,
        organization_id,
        site_id,
        status,
        effective_at,
        activated_at,
        payload,
        rollback_from_version_id,
        created_by,
        created_at,
        updated_at
      )
      VALUES ($1,$2,NULL,'active',$3,$3,$4,NULL,NULL,$3,$3)
      `,
      [id, organizationId, now, payload],
    );
    await this.writeAudit({
      organizationId,
      siteId: null,
      action: "decision_config_bootstrapped",
      actorUserId: null,
      requestId: null,
      targetVersionId: id,
      beforePayload: null,
      afterPayload: payload,
      metadata: { source: "auto_bootstrap" },
    });
  }

  private async activateDueVersions(
    organizationId: string,
    siteId: string | null,
    at: string,
    actorUserId?: string | null,
    requestId?: string | null,
  ): Promise<void> {
    await this.ready();
    const normalizedSiteId = normalizeSiteId(siteId);
    if (!this.pool) {
      const due = this.memoryVersions
        .filter(
          (version) =>
            version.organizationId === organizationId &&
            version.siteId === normalizedSiteId &&
            version.status === "scheduled" &&
            version.effectiveAt <= at,
        )
        .sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt));
      for (const version of due) {
        for (const current of this.memoryVersions) {
          if (
            current.organizationId === organizationId &&
            current.siteId === normalizedSiteId &&
            current.status === "active"
          ) {
            current.status = "cancelled";
            current.updatedAt = at;
          }
        }
        version.status = "active";
        version.activatedAt = at;
        version.updatedAt = at;
        await this.writeAudit({
          organizationId,
          siteId: normalizedSiteId,
          action: "decision_config_version_activated",
          actorUserId: actorUserId ?? null,
          requestId: requestId ?? null,
          targetVersionId: version.id,
          beforePayload: null,
          afterPayload: version.payload,
          metadata: { effectiveAt: version.effectiveAt },
        });
      }
      return;
    }

    const due = await this.pool.query<DbVersionRow>(
      `
      SELECT *
      FROM decision_engine_config_versions
      WHERE organization_id = $1
        AND site_id IS NOT DISTINCT FROM $2::text
        AND status = 'scheduled'
        AND effective_at <= $3::timestamptz
      ORDER BY effective_at ASC
      `,
      [organizationId, normalizedSiteId, at],
    );

    for (const row of due.rows) {
      const nowIso = new Date().toISOString();
      await this.pool.query(
        `
        UPDATE decision_engine_config_versions
        SET status = 'cancelled', updated_at = $4
        WHERE organization_id = $1
          AND site_id IS NOT DISTINCT FROM $2::text
          AND status = 'active'
          AND id <> $3
        `,
        [organizationId, normalizedSiteId, row.id, nowIso],
      );
      await this.pool.query(
        `
        UPDATE decision_engine_config_versions
        SET status = 'active', activated_at = $2, updated_at = $2
        WHERE id = $1
        `,
        [row.id, nowIso],
      );
      await this.writeAudit({
        organizationId,
        siteId: normalizedSiteId,
        action: "decision_config_version_activated",
        actorUserId: actorUserId ?? null,
        requestId: requestId ?? null,
        targetVersionId: row.id,
        beforePayload: null,
        afterPayload: row.payload,
        metadata: { effectiveAt: toIso(row.effective_at) },
      });
    }
  }

  async listVersions(
    organizationId: string,
    siteId?: string | null,
  ): Promise<DecisionEngineConfigVersion[]> {
    await this.ready();
    const normalizedSiteId = normalizeSiteId(siteId);
    if (!this.pool) {
      return this.memoryVersions
        .filter((version) => version.organizationId === organizationId)
        .filter((version) =>
          siteId === undefined ? true : version.siteId === normalizedSiteId,
        )
        .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))
        .map((version) => ({
          ...version,
          payload: clonePayload(version.payload),
        }));
    }

    const rows = await this.pool.query<DbVersionRow>(
      `
      SELECT *
      FROM decision_engine_config_versions
      WHERE organization_id = $1
        AND ($2::text IS NULL OR site_id IS NOT DISTINCT FROM $2::text)
      ORDER BY effective_at DESC, created_at DESC
      `,
      [organizationId, siteId === undefined ? null : normalizedSiteId],
    );
    return rows.rows.map(toVersion);
  }

  async createVersion(
    input: CreateVersionInput,
  ): Promise<DecisionEngineConfigVersion> {
    await this.ensureBootstrap(input.organizationId);
    validatePayload(input.payload);

    const normalizedSiteId = normalizeSiteId(input.siteId);
    const nowIso = new Date().toISOString();
    const effectiveAt = new Date(input.effectiveAt).toISOString();
    const versionId = randomUUID();

    if (!this.pool) {
      const version: DecisionEngineConfigVersion = {
        id: versionId,
        organizationId: input.organizationId,
        siteId: normalizedSiteId,
        status: "scheduled",
        effectiveAt,
        activatedAt: null,
        payload: clonePayload(input.payload),
        rollbackFromVersionId: input.rollbackFromVersionId ?? null,
        createdBy: input.createdBy ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.memoryVersions.push(version);
      await this.writeAudit({
        organizationId: input.organizationId,
        siteId: normalizedSiteId,
        action: "decision_config_version_created",
        actorUserId: input.createdBy ?? null,
        requestId: input.requestId ?? null,
        targetVersionId: version.id,
        beforePayload: null,
        afterPayload: version.payload,
        metadata: { reason: input.reason ?? null, effectiveAt },
      });
      await this.activateDueVersions(
        input.organizationId,
        normalizedSiteId,
        nowIso,
        input.createdBy ?? null,
        input.requestId ?? null,
      );
      const created = this.memoryVersions.find((row) => row.id === versionId);
      if (!created) {
        throw new Error("Created version not found");
      }
      return { ...created, payload: clonePayload(created.payload) };
    }

    await this.pool.query(
      `
      INSERT INTO decision_engine_config_versions (
        id,
        organization_id,
        site_id,
        status,
        effective_at,
        activated_at,
        payload,
        rollback_from_version_id,
        created_by,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,'scheduled',$4,NULL,$5,$6,$7,$8,$8)
      `,
      [
        versionId,
        input.organizationId,
        normalizedSiteId,
        effectiveAt,
        input.payload,
        input.rollbackFromVersionId ?? null,
        input.createdBy ?? null,
        nowIso,
      ],
    );
    await this.writeAudit({
      organizationId: input.organizationId,
      siteId: normalizedSiteId,
      action: "decision_config_version_created",
      actorUserId: input.createdBy ?? null,
      requestId: input.requestId ?? null,
      targetVersionId: versionId,
      beforePayload: null,
      afterPayload: input.payload,
      metadata: { reason: input.reason ?? null, effectiveAt },
    });
    await this.activateDueVersions(
      input.organizationId,
      normalizedSiteId,
      nowIso,
      input.createdBy ?? null,
      input.requestId ?? null,
    );

    const created = await this.pool.query<DbVersionRow>(
      `
      SELECT *
      FROM decision_engine_config_versions
      WHERE id = $1
      `,
      [versionId],
    );
    const row = created.rows[0];
    if (!row) {
      throw new Error("Created version not found");
    }
    return toVersion(row);
  }

  async cancelVersion(
    input: CancelVersionInput,
  ): Promise<DecisionEngineConfigVersion> {
    await this.ensureBootstrap(input.organizationId);
    const normalizedSiteId = normalizeSiteId(input.siteId);
    const nowIso = new Date().toISOString();
    if (!this.pool) {
      const row = this.memoryVersions.find(
        (version) =>
          version.id === input.versionId &&
          version.organizationId === input.organizationId &&
          version.siteId === normalizedSiteId,
      );
      if (!row) throw new Error("Version not found");
      if (row.status !== "scheduled") {
        throw new Error("Only scheduled versions can be cancelled");
      }
      row.status = "cancelled";
      row.updatedAt = nowIso;
      await this.writeAudit({
        organizationId: input.organizationId,
        siteId: normalizedSiteId,
        action: "decision_config_version_cancelled",
        actorUserId: input.actorUserId ?? null,
        requestId: input.requestId ?? null,
        targetVersionId: row.id,
        beforePayload: row.payload,
        afterPayload: row.payload,
        metadata: { reason: input.reason ?? null },
      });
      return { ...row, payload: clonePayload(row.payload) };
    }

    const existing = await this.pool.query<DbVersionRow>(
      `
      SELECT *
      FROM decision_engine_config_versions
      WHERE id = $1
        AND organization_id = $2
        AND site_id IS NOT DISTINCT FROM $3::text
      `,
      [input.versionId, input.organizationId, normalizedSiteId],
    );
    const row = existing.rows[0];
    if (!row) throw new Error("Version not found");
    if (row.status !== "scheduled") {
      throw new Error("Only scheduled versions can be cancelled");
    }

    await this.pool.query(
      `
      UPDATE decision_engine_config_versions
      SET status = 'cancelled', updated_at = $2
      WHERE id = $1
      `,
      [row.id, nowIso],
    );
    await this.writeAudit({
      organizationId: input.organizationId,
      siteId: normalizedSiteId,
      action: "decision_config_version_cancelled",
      actorUserId: input.actorUserId ?? null,
      requestId: input.requestId ?? null,
      targetVersionId: row.id,
      beforePayload: row.payload,
      afterPayload: row.payload,
      metadata: { reason: input.reason ?? null },
    });
    return {
      ...toVersion(row),
      status: "cancelled",
      updatedAt: nowIso,
    };
  }

  async rollback(input: RollbackInput): Promise<DecisionEngineConfigVersion> {
    await this.ensureBootstrap(input.organizationId);
    const normalizedSiteId = normalizeSiteId(input.siteId);
    const nowIso = new Date().toISOString();
    await this.activateDueVersions(
      input.organizationId,
      normalizedSiteId,
      nowIso,
      input.actorUserId ?? null,
      input.requestId ?? null,
    );

    const versions = await this.listVersions(
      input.organizationId,
      normalizedSiteId,
    );
    const current =
      versions.find((version) => version.status === "active") ?? null;
    const previous =
      versions
        .filter((version) => version.id !== current?.id)
        .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0] ?? null;
    const payload = previous ? previous.payload : defaultConfigPayload();

    const created = await this.createVersion({
      organizationId: input.organizationId,
      siteId: normalizedSiteId,
      effectiveAt: nowIso,
      payload,
      createdBy: input.actorUserId ?? null,
      requestId: input.requestId ?? null,
      reason: input.reason ?? "rollback_one_click",
      rollbackFromVersionId: current?.id ?? null,
    });

    await this.writeAudit({
      organizationId: input.organizationId,
      siteId: normalizedSiteId,
      action: "decision_config_rollback",
      actorUserId: input.actorUserId ?? null,
      requestId: input.requestId ?? null,
      targetVersionId: created.id,
      beforePayload: current?.payload ?? null,
      afterPayload: created.payload,
      metadata: {
        reason: input.reason ?? "rollback_one_click",
        fromVersionId: current?.id ?? null,
      },
    });

    return created;
  }

  private async getNextVersion(
    organizationId: string,
    siteId: string | null,
    at: string,
  ): Promise<{ id: string; effectiveAt: string } | null> {
    const normalizedSiteId = normalizeSiteId(siteId);
    if (!this.pool) {
      const next = this.memoryVersions
        .filter(
          (version) =>
            version.organizationId === organizationId &&
            version.siteId === normalizedSiteId &&
            version.status === "scheduled" &&
            version.effectiveAt > at,
        )
        .sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt))[0];
      return next ? { id: next.id, effectiveAt: next.effectiveAt } : null;
    }

    const next = await this.pool.query<DbVersionRow>(
      `
      SELECT *
      FROM decision_engine_config_versions
      WHERE organization_id = $1
        AND site_id IS NOT DISTINCT FROM $2::text
        AND status = 'scheduled'
        AND effective_at > $3::timestamptz
      ORDER BY effective_at ASC
      LIMIT 1
      `,
      [organizationId, normalizedSiteId, at],
    );
    const row = next.rows[0];
    return row ? { id: row.id, effectiveAt: toIso(row.effective_at) } : null;
  }

  private async getActiveVersion(
    organizationId: string,
    siteId: string | null,
    at: string,
  ): Promise<DecisionEngineConfigVersion | null> {
    const normalizedSiteId = normalizeSiteId(siteId);
    if (!this.pool) {
      const version =
        this.memoryVersions
          .filter(
            (row) =>
              row.organizationId === organizationId &&
              row.siteId === normalizedSiteId &&
              row.status === "active" &&
              row.effectiveAt <= at,
          )
          .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0] ??
        null;
      return version
        ? { ...version, payload: clonePayload(version.payload) }
        : null;
    }

    const rows = await this.pool.query<DbVersionRow>(
      `
      SELECT *
      FROM decision_engine_config_versions
      WHERE organization_id = $1
        AND site_id IS NOT DISTINCT FROM $2::text
        AND status = 'active'
        AND effective_at <= $3::timestamptz
      ORDER BY effective_at DESC
      LIMIT 1
      `,
      [organizationId, normalizedSiteId, at],
    );
    const row = rows.rows[0];
    return row ? toVersion(row) : null;
  }

  async resolveConfig(
    input: ResolveConfigInput,
  ): Promise<ResolvedDecisionEngineConfig> {
    await this.ensureBootstrap(input.organizationId);
    const atIso = input.at
      ? new Date(input.at).toISOString()
      : new Date().toISOString();
    const normalizedSiteId = normalizeSiteId(input.siteId);

    await this.activateDueVersions(input.organizationId, null, atIso);
    if (normalizedSiteId) {
      await this.activateDueVersions(
        input.organizationId,
        normalizedSiteId,
        atIso,
      );
    }

    const siteVersion = normalizedSiteId
      ? await this.getActiveVersion(
          input.organizationId,
          normalizedSiteId,
          atIso,
        )
      : null;
    const orgVersion = await this.getActiveVersion(
      input.organizationId,
      null,
      atIso,
    );
    const chosen = siteVersion ?? orgVersion;

    if (!chosen) {
      throw new Error("No decision config available after bootstrap");
    }

    const nextSite = normalizedSiteId
      ? await this.getNextVersion(input.organizationId, normalizedSiteId, atIso)
      : null;
    const nextOrg = await this.getNextVersion(
      input.organizationId,
      null,
      atIso,
    );
    const nextVersion = nextSite ?? nextOrg;

    return {
      organizationId: input.organizationId,
      siteId: normalizedSiteId,
      versionId: chosen.id,
      effectiveAt: chosen.effectiveAt,
      resolvedAt: new Date().toISOString(),
      payload: clonePayload(chosen.payload),
      nextVersion,
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

let singleton: DecisionConfigService | null = null;

export async function initializeDecisionConfigService(
  databaseUrl: string | null,
): Promise<void> {
  singleton = new DecisionConfigService(databaseUrl);
  await singleton.resolveConfig({
    organizationId: "11111111-1111-1111-1111-111111111111",
    siteId: null,
  });
}

export function getDecisionConfigService(): DecisionConfigService {
  if (!singleton) {
    singleton = new DecisionConfigService(
      process.env.DATABASE_URL?.trim() || null,
    );
  }
  return singleton;
}

export function getDefaultHorizon(
  payload: DecisionEngineConfigPayload,
): DecisionHorizonConfig | null {
  return (
    payload.horizons
      .filter((horizon) => horizon.active)
      .sort((a, b) => a.rank - b.rank)
      .find((horizon) => horizon.isDefault) ?? null
  );
}

export function getHorizonById(
  payload: DecisionEngineConfigPayload,
  horizonId: string | null | undefined,
): DecisionHorizonConfig | null {
  if (!horizonId) return null;
  return payload.horizons.find((horizon) => horizon.id === horizonId) ?? null;
}
