import { buildBreadcrumbSchema } from "../../lib/seo/schema/breadcrumb";
import {
  buildCoreBreadcrumbSchemaId,
  buildCoreWebPageSchema,
  type CorePageBreadcrumbItem,
} from "../../lib/seo/schema/core-page";
import { serializeJsonForScriptTag } from "../../lib/security/json-script";

interface CorePageJsonLdProps {
  locale: string;
  name: string;
  description: string;
  path: string;
  breadcrumbs: readonly CorePageBreadcrumbItem[];
}

export function CorePageJsonLd({
  locale,
  name,
  description,
  path,
  breadcrumbs,
}: CorePageJsonLdProps) {
  const webPageSchema = buildCoreWebPageSchema({
    locale,
    name,
    description,
    path,
  });
  const breadcrumbSchema = buildBreadcrumbSchema(
    [...breadcrumbs],
    buildCoreBreadcrumbSchemaId(path),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonForScriptTag(webPageSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonForScriptTag(breadcrumbSchema),
        }}
      />
    </>
  );
}
