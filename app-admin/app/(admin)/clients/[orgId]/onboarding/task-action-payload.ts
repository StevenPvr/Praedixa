export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readString(
  payload: Record<string, unknown>,
  key: string,
): string {
  return typeof payload[key] === "string" ? payload[key] : "";
}

export function readBoolean(
  payload: Record<string, unknown>,
  key: string,
): boolean {
  return payload[key] === true;
}

export function readStringList(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .join("\n");
}

export function readNumber(
  payload: Record<string, unknown>,
  key: string,
): string {
  return typeof payload[key] === "number" ? String(payload[key]) : "";
}

export function toListValue(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
