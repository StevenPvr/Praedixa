import type { Locale } from "../i18n/config";
import { enContentA } from "./knowledge-pages-en-a";
import { frContentA } from "./knowledge-pages-fr-a";
import type {
  KnowledgePageContent,
  KnowledgePageKey,
} from "./knowledge-pages-shared";

export type {
  KnowledgeLink,
  KnowledgePageContent,
  KnowledgePageKey,
  KnowledgeSection,
} from "./knowledge-pages-shared";
export { getKnowledgePath } from "./knowledge-pages-shared";

const frContent: Record<KnowledgePageKey, KnowledgePageContent> = {
  ...frContentA,
};

const enContent: Record<KnowledgePageKey, KnowledgePageContent> = {
  ...enContentA,
};

export function getKnowledgePage(locale: Locale, key: KnowledgePageKey): KnowledgePageContent {
  return locale === "fr" ? frContent[key] : enContent[key];
}
