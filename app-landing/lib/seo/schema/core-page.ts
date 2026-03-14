import { PRAEDIXA_BASE_URL } from "../entity";

export interface CorePageBreadcrumbItem {
  name: string;
  path: string;
}

export interface CorePageSchemaInput {
  locale: string;
  name: string;
  description: string;
  path: string;
}

function toAbsoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PRAEDIXA_BASE_URL}${normalized}`;
}

export function buildCoreWebPageSchemaId(path: string): string {
  return `${toAbsoluteUrl(path)}#webpage`;
}

export function buildCoreBreadcrumbSchemaId(path: string): string {
  return `${toAbsoluteUrl(path)}#breadcrumb`;
}

export function buildCoreWebPageSchema({
  locale,
  name,
  description,
  path,
}: CorePageSchemaInput) {
  const absoluteUrl = toAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": buildCoreWebPageSchemaId(path),
    name,
    description,
    url: absoluteUrl,
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${PRAEDIXA_BASE_URL}#website`,
    },
    about: {
      "@type": "Organization",
      "@id": `${PRAEDIXA_BASE_URL}#organization`,
    },
    breadcrumb: {
      "@id": buildCoreBreadcrumbSchemaId(path),
    },
  };
}
