const DANGEROUS_CSV_PREFIXES = new Set(["=", "+", "-", "@"]);

function startsWithControlCharacter(value: string): boolean {
  if (value.length === 0) {
    return false;
  }
  const codePoint = value.charCodeAt(0);
  return (codePoint >= 0x00 && codePoint <= 0x1f) || codePoint === 0x7f;
}

export function neutralizeCsvCell(value: unknown): string {
  const normalized = value == null ? "" : String(value);
  if (
    normalized.length > 0 &&
    (DANGEROUS_CSV_PREFIXES.has(normalized[0]) ||
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
