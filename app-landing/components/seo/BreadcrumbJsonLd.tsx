import {
  buildBreadcrumbSchema,
  type BreadcrumbItem,
} from "../../lib/seo/schema/breadcrumb";

interface BreadcrumbJsonLdProps {
  id?: string;
  items: BreadcrumbItem[];
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function BreadcrumbJsonLd({
  id = "praedixa-breadcrumb-json-ld",
  items,
}: BreadcrumbJsonLdProps) {
  const schema = buildBreadcrumbSchema(items);

  return (
    <script id={id} type="application/ld+json">
      {safeJsonLd(schema)}
    </script>
  );
}
