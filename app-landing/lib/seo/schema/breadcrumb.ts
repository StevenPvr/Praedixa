import { PRAEDIXA_BASE_URL } from "../entity";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface BreadcrumbListSchema {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  "@id"?: string;
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PRAEDIXA_BASE_URL}${normalized}`;
}

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
  schemaId?: string,
): BreadcrumbListSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    ...(schemaId ? { "@id": schemaId } : {}),
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
