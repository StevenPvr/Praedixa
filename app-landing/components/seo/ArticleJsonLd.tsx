import type { SerpSchemaType } from "../../lib/content/serp-resources-fr";
import {
  PRAEDIXA_BASE_URL,
  PRAEDIXA_BRAND_NAME,
  PRAEDIXA_LOGO_URL,
} from "../../lib/seo/entity";

interface ArticleJsonLdProps {
  id?: string;
  schemaType: SerpSchemaType;
  headline: string;
  description: string;
  path: string;
  locale: "fr-FR" | "en-US";
  query: string;
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function ArticleJsonLd({
  id = "praedixa-article-json-ld",
  schemaType,
  headline,
  description,
  path,
  locale,
  query,
}: ArticleJsonLdProps) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${PRAEDIXA_BASE_URL}${normalizedPath}`;

  const shared = {
    "@context": "https://schema.org",
    inLanguage: locale,
    url,
    name: headline,
    description,
    about: query,
    publisher: {
      "@type": "Organization",
      name: PRAEDIXA_BRAND_NAME,
      logo: {
        "@type": "ImageObject",
        url: PRAEDIXA_LOGO_URL,
      },
    },
  };

  const schema =
    schemaType === "WebPage"
      ? {
          ...shared,
          "@type": "WebPage",
        }
      : {
          ...shared,
          "@type": "Article",
          headline,
          mainEntityOfPage: url,
        };

  return (
    <script id={id} type="application/ld+json">
      {safeJsonLd(schema)}
    </script>
  );
}
