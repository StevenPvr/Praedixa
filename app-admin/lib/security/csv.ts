const DANGEROUS_CSV_PREFIXES = new Set(["=", "+", "-", "@"]);

function startsWithControlCharacter(value: string): boolean {
  if (value.length === 0) {
    return false;
  }
  const codePoint = value.codePointAt(0) ?? -1;
  return (codePoint >= 0x00 && codePoint <= 0x1f) || codePoint === 0x7f;
}

function stringifyCsvValue(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (typeof value === "symbol") {
    return value.description ?? "Symbol()";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "function") {
    return value.name || "[function]";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value) ?? Object.prototype.toString.call(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }

  return "";
}

export function neutralizeCsvCell(value: unknown): string {
  const normalized = stringifyCsvValue(value);
  if (
    normalized.length > 0 &&
    (DANGEROUS_CSV_PREFIXES.has(normalized.charAt(0)) ||
      startsWithControlCharacter(normalized))
  ) {
    return `'${normalized}`;
  }
  return normalized;
}

export function serializeCsvRow(values: readonly unknown[]): string {
  return values
    .map((value) => `"${neutralizeCsvCell(value).replaceAll('"', '""')}"`)
    .join(",");
}

export function buildCsvDocument(
  header: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  return [
    serializeCsvRow(header),
    ...rows.map((row) => serializeCsvRow(row)),
  ].join("\n");
}
