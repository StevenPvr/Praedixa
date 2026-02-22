export {
  locales,
  defaultLocale,
  isValidLocale,
  localizedSlugs,
} from "./config";
export type { Locale } from "./config";
export type { Dictionary } from "./types";
export { getDictionary } from "./get-dictionary";
export { detectRequestLocale } from "./request-locale";
