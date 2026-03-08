export function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type")?.toLowerCase().trim() ?? "";

  return (
    contentType === "application/json" ||
    contentType.startsWith("application/json;")
  );
}
