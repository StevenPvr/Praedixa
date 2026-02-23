import type { Metadata } from "next";
import type { Locale } from "../i18n/config";

export interface SeoPageContract {
  locale: Locale;
  canonicalPath: string;
  alternates: NonNullable<Metadata["alternates"]>;
  robots: NonNullable<Metadata["robots"]>;
  structuredDataTypes: readonly string[];
}
