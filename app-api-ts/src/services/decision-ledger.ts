import type {
  LedgerEntry,
  LedgerMetricSnapshot,
  LedgerRoi,
  LedgerRoiComponent,
  LedgerStatus,
  LedgerValidationStatus,
} from "@praedixa/shared-types/domain";

const LEDGER_TRANSITIONS: Record<LedgerStatus, readonly LedgerStatus[]> = {
  open: ["measuring", "closed", "disputed"],
  measuring: ["closed", "disputed"],
  closed: ["recalculated", "disputed"],
  recalculated: ["recalculated", "disputed"],
  disputed: [],
};

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

function roundLedgerAmount(value: number): number {
  return Number(value.toFixed(2));
}

function cloneLedgerComponents(
  components: readonly LedgerRoiComponent[],
): LedgerRoiComponent[] {
  return [...components]
    .map((component) => ({
      ...component,
      value: roundLedgerAmount(
        assertFiniteNumber(component.value, component.key),
      ),
    }))
    .sort((left, right) => {
      const keyOrder = left.key.localeCompare(right.key);
      return keyOrder !== 0 ? keyOrder : left.label.localeCompare(right.label);
    });
}

function assertFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }

  return value;
}

function assertCurrency(currency: string): void {
  if (!CURRENCY_PATTERN.test(currency)) {
    throw new Error(
      "Ledger ROI currency must be a 3-letter uppercase ISO code",
    );
  }
}

function assertValidatedComponents(
  components: readonly LedgerRoiComponent[],
  validationStatus: LedgerValidationStatus,
): void {
  if (validationStatus !== "validated") {
    return;
  }

  const hasNonValidatedComponent = components.some(
    (component) => component.validationStatus !== "validated",
  );

  if (hasNonValidatedComponent) {
    throw new Error(
      "Validated ledger ROI requires every component to be validated",
    );
  }
}

export function normalizeLedgerRatio(value: number): number {
  return roundLedgerAmount(
    Math.min(1, Math.max(0, assertFiniteNumber(value, "Ledger ratio"))),
  );
}

export function clampLedgerRatio(value: number): number {
  return normalizeLedgerRatio(value);
}

export function calculateLedgerPercentage(
  numerator: number,
  denominator: number,
): number {
  const safeNumerator = assertFiniteNumber(
    numerator,
    "Ledger percentage numerator",
  );
  const safeDenominator = assertFiniteNumber(
    denominator,
    "Ledger percentage denominator",
  );

  if (safeDenominator <= 0) {
    return 0;
  }

  return normalizeLedgerRatio(safeNumerator / safeDenominator);
}

export function canTransitionLedger(
  current: LedgerStatus,
  next: LedgerStatus,
): boolean {
  return LEDGER_TRANSITIONS[current].includes(next);
}

export function computeLedgerRoi(
  components: readonly LedgerRoiComponent[],
  validationStatus: LedgerValidationStatus,
  currency: string,
): LedgerRoi {
  assertCurrency(currency);
  assertValidatedComponents(components, validationStatus);

  const normalizedComponents = cloneLedgerComponents(components);
  const total = normalizedComponents.reduce((sum, component) => {
    return (
      sum + (component.kind === "benefit" ? component.value : -component.value)
    );
  }, 0);
  const estimatedValue = roundLedgerAmount(total);

  return {
    currency,
    estimatedValue,
    ...(validationStatus === "validated"
      ? { realizedValue: estimatedValue }
      : {}),
    validationStatus,
    components: normalizedComponents,
  };
}

export function calculateLedgerRoi(
  currency: string,
  components: readonly LedgerRoiComponent[],
  validationStatus: LedgerValidationStatus,
): LedgerRoi {
  return computeLedgerRoi(components, validationStatus, currency);
}

export function setLedgerValidationStatus(
  entry: LedgerEntry,
  validationStatus: LedgerValidationStatus,
  changedAt: string,
  validatedBy?: string,
): LedgerEntry {
  if (validationStatus === "validated") {
    const realizedValue = entry.roi.realizedValue ?? entry.roi.estimatedValue;
    return {
      ...entry,
      roi: {
        ...entry.roi,
        validationStatus,
        ...(realizedValue !== undefined ? { realizedValue } : {}),
        validatedAt: changedAt,
        ...(validatedBy !== undefined ? { validatedBy } : {}),
      },
    };
  }

  if (validationStatus === "estimated") {
    const roi = { ...entry.roi };
    delete roi.realizedValue;
    delete roi.validatedAt;
    delete roi.validatedBy;
    return {
      ...entry,
      roi: {
        ...roi,
        validationStatus,
      },
    };
  }

  return {
    ...entry,
    roi: {
      ...entry.roi,
      validationStatus,
    },
  };
}

export function closeLedgerEntry(
  entry: LedgerEntry,
  actual: LedgerMetricSnapshot,
  closedAt: string,
  roi: LedgerRoi,
): LedgerEntry {
  if (!canTransitionLedger(entry.status, "closed")) {
    throw new Error("Only open or measuring ledger entries can be closed");
  }

  return {
    ...entry,
    status: "closed",
    actual,
    closedAt,
    roi,
  };
}

export function recalculateLedgerEntry(
  entry: LedgerEntry,
  actual: LedgerMetricSnapshot,
  recalculatedAt: string,
  roi: LedgerRoi,
): LedgerEntry {
  if (!canTransitionLedger(entry.status, "recalculated")) {
    throw new Error("Only closed ledger entries can be recalculated");
  }

  return {
    ...entry,
    status: "recalculated",
    revision: entry.revision + 1,
    actual,
    closedAt: recalculatedAt,
    roi,
    supersedes: {
      ledgerId: entry.ledgerId,
      revision: entry.revision,
    },
  };
}
