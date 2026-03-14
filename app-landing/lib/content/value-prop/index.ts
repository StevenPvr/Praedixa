import type { Locale } from "../../i18n/locale";
import { coreValuePropEn } from "./en";
import { coreValuePropFr } from "./fr";
import type { ValuePropByLocale, ValuePropContent } from "./shared";

const valuePropByLocale: ValuePropByLocale = {
  fr: coreValuePropFr,
  en: coreValuePropEn,
};

export function getValuePropContent(locale: Locale): ValuePropContent {
  return valuePropByLocale[locale];
}

export type { ProofComparisonRow, ValuePropContent } from "./shared";
