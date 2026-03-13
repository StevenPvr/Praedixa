import fs from "node:fs";
import { URL } from "node:url";
import type { Locale } from "../i18n/config";
import { locales } from "../i18n/config";
import { PRAEDIXA_BASE_URL } from "../seo/entity";
import {
  isProductionEnvironment,
  resolveInternalLinksConfigPath,
} from "./config";
import type {
  HastElement,
  HastNode,
  HastRoot,
  HastText,
} from "./internal-links-hast";
import type { InternalLinkRule } from "./types";

const SKIPPED_TAGS = new Set([
  "a",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "script",
  "style",
  "nav",
  "footer",
]);

interface CompiledRule {
  url: string;
  maxPerDoc: number;
  patterns: RegExp[];
}
interface LinkMatch {
  ruleUrl: string;
  start: number;
  end: number;
  text: string;
}
interface InternalLinksPluginOptions {
  rules: InternalLinkRule[];
  disabled?: boolean;
  generatedUrls?: Set<string>;
  excludeUrls?: string[];
}
let cachedRules: InternalLinkRule[] | null = null;

function shouldUseCache(): boolean {
  return isProductionEnvironment();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createPatternRegex(pattern: string): RegExp {
  const trimmed = pattern.trim();
  const escapedPattern = escapeRegex(trimmed);
  const firstCharacter = trimmed[0] ?? "";
  const lastCharacter = trimmed[trimmed.length - 1] ?? "";
  const startsWithWordCharacter = /[\p{L}\p{N}]/u.test(firstCharacter);
  const endsWithWordCharacter = /[\p{L}\p{N}]/u.test(lastCharacter);
  const leftBoundary = startsWithWordCharacter ? "(?<![\\p{L}\\p{N}])" : "";
  const rightBoundary = endsWithWordCharacter ? "(?![\\p{L}\\p{N}])" : "";
  return new RegExp(`${leftBoundary}(${escapedPattern})${rightBoundary}`, "iu");
}

function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function normalizeRuleUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    throw new Error("Internal link rule URL cannot be empty.");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parsed = new URL(trimmed);
    const baseHost = new URL(PRAEDIXA_BASE_URL).host;
    if (parsed.host === baseHost) {
      return `${normalizePathname(parsed.pathname)}${parsed.search}${parsed.hash}`;
    }

    return trimmed;
  }

  if (!trimmed.startsWith("/")) {
    throw new Error(
      `Internal link rule URL must be absolute or start with '/': ${trimmed}`,
    );
  }

  const parsed = new URL(trimmed, PRAEDIXA_BASE_URL);
  return `${normalizePathname(parsed.pathname)}${parsed.search}${parsed.hash}`;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRule(input: unknown, index: number): InternalLinkRule {
  if (!isObjectRecord(input)) {
    throw new Error(`Invalid internal link rule at index ${index}.`);
  }

  const idRaw = input.id;
  const patternsRaw = input.patterns;
  const urlRaw = input.url;
  const maxPerDocRaw = input.maxPerDoc;
  if (typeof idRaw !== "string" || idRaw.trim().length === 0) {
    throw new Error(
      `Internal link rule at index ${index} must define a non-empty string 'id'.`,
    );
  }

  if (!Array.isArray(patternsRaw) || patternsRaw.length === 0) {
    throw new Error(
      `Internal link rule '${idRaw}' must define a non-empty 'patterns' array.`,
    );
  }

  const patterns = patternsRaw.map((pattern, patternIndex) => {
    if (typeof pattern !== "string" || pattern.trim().length === 0) {
      throw new Error(
        `Internal link rule '${idRaw}' has an invalid pattern at index ${patternIndex}.`,
      );
    }
    return pattern.trim();
  });

  if (typeof urlRaw !== "string") {
    throw new Error(
      `Internal link rule '${idRaw}' must define a string 'url'.`,
    );
  }

  const maxPerDoc =
    maxPerDocRaw === undefined
      ? 1
      : Number.isInteger(maxPerDocRaw) && Number(maxPerDocRaw) > 0
        ? Number(maxPerDocRaw)
        : (() => {
            throw new Error(
              `Internal link rule '${idRaw}' must define a positive integer 'maxPerDoc'.`,
            );
          })();

  return {
    id: idRaw.trim(),
    patterns,
    url: normalizeRuleUrl(urlRaw),
    maxPerDoc,
  };
}

function readRulesFromDisk(): InternalLinkRule[] {
  const rulesPath = resolveInternalLinksConfigPath();
  if (!fs.existsSync(rulesPath)) {
    return [];
  }

  const rawContent = fs.readFileSync(rulesPath, "utf8");
  const parsedJson: unknown = JSON.parse(rawContent);

  if (!Array.isArray(parsedJson)) {
    throw new Error("Internal links configuration must be a JSON array.");
  }

  return parsedJson.map((entry, index) => parseRule(entry, index));
}

function getAllInternalLinkRules(): InternalLinkRule[] {
  if (shouldUseCache() && cachedRules) {
    return cachedRules;
  }

  const rules = readRulesFromDisk();

  if (shouldUseCache()) {
    cachedRules = rules;
  }

  return rules;
}

function resolveLocalePrefix(url: string): Locale | null {
  const pathToInspect =
    url.startsWith("http://") || url.startsWith("https://")
      ? new URL(url).pathname
      : url;

  for (const locale of locales) {
    if (
      pathToInspect === `/${locale}` ||
      pathToInspect.startsWith(`/${locale}/`)
    ) {
      return locale;
    }
  }

  return null;
}

export function getInternalLinkRules(options?: {
  locale?: Locale;
}): InternalLinkRule[] {
  const rules = getAllInternalLinkRules();

  if (!options?.locale) {
    return rules;
  }

  return rules.filter((rule) => {
    const localePrefix = resolveLocalePrefix(rule.url);
    if (!localePrefix) {
      return true;
    }

    return localePrefix === options.locale;
  });
}

function isTextNode(node: HastNode): node is HastText {
  return node.type === "text" && typeof (node as HastText).value === "string";
}

function isElementNode(node: HastNode): node is HastElement {
  return (
    node.type === "element" &&
    typeof (node as HastElement).tagName === "string" &&
    Array.isArray((node as HastElement).children)
  );
}

function isRootNode(node: HastNode): node is HastRoot {
  return node.type === "root" && Array.isArray((node as HastRoot).children);
}

function toHastRoot(tree: unknown): HastRoot | null {
  if (
    !isObjectRecord(tree) ||
    !Array.isArray(tree.children) ||
    tree.type !== "root"
  ) {
    return null;
  }

  return {
    type: "root",
    children: tree.children as HastNode[],
  };
}

function normalizeTrackedUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const parsed = new URL(url);
    const host = new URL(PRAEDIXA_BASE_URL).host;
    if (parsed.host === host) {
      return `${normalizePathname(parsed.pathname)}${parsed.search}${parsed.hash}`;
    }

    return url;
  }

  if (!url.startsWith("/")) {
    return url;
  }

  const parsed = new URL(url, PRAEDIXA_BASE_URL);
  return `${normalizePathname(parsed.pathname)}${parsed.search}${parsed.hash}`;
}

function getElementHref(node: HastElement): string | null {
  const hrefValue = node.properties?.href;
  if (typeof hrefValue !== "string") {
    return null;
  }

  const trimmed = hrefValue.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return normalizeTrackedUrl(trimmed);
}

function incrementUsageCount(
  usageByUrl: Map<string, number>,
  url: string,
): void {
  const current = usageByUrl.get(url) ?? 0;
  usageByUrl.set(url, current + 1);
}

function collectExistingLinks(
  node: HastNode,
  usageByUrl: Map<string, number>,
): void {
  if (isElementNode(node) && node.tagName.toLowerCase() === "a") {
    const href = getElementHref(node);
    if (href) {
      incrementUsageCount(usageByUrl, href);
    }
  }

  if (isElementNode(node) || isRootNode(node)) {
    for (const child of node.children) {
      collectExistingLinks(child, usageByUrl);
    }
  }
}

function compileRules(
  rules: InternalLinkRule[],
  excludedUrls: Set<string>,
): CompiledRule[] {
  return rules
    .map((rule) => ({
      url: normalizeTrackedUrl(rule.url),
      maxPerDoc: Math.max(1, rule.maxPerDoc ?? 1),
      patterns: rule.patterns.map(createPatternRegex),
    }))
    .filter((rule) => !excludedUrls.has(rule.url));
}

function findEarliestMatch(
  text: string,
  rules: CompiledRule[],
  usageByUrl: Map<string, number>,
): LinkMatch | null {
  let bestMatch: LinkMatch | null = null;

  for (const rule of rules) {
    const usageCount = usageByUrl.get(rule.url) ?? 0;
    if (usageCount >= rule.maxPerDoc) {
      continue;
    }

    for (const pattern of rule.patterns) {
      const match = pattern.exec(text);
      if (!match || typeof match.index !== "number") {
        continue;
      }

      const matchedText = match[1] ?? match[0];
      const start = match.index;
      const end = start + matchedText.length;

      if (!bestMatch || start < bestMatch.start) {
        bestMatch = {
          ruleUrl: rule.url,
          start,
          end,
          text: matchedText,
        };
      }
    }
  }

  return bestMatch;
}

function createTextNode(value: string): HastText {
  return {
    type: "text",
    value,
  };
}

function createAutoLinkNode(label: string, href: string): HastElement {
  return {
    type: "element",
    tagName: "a",
    properties: {
      href,
      dataAutoLinked: "true",
    },
    children: [createTextNode(label)],
  };
}

function injectLinksInTextNode(
  value: string,
  rules: CompiledRule[],
  usageByUrl: Map<string, number>,
  generatedUrls: Set<string>,
): HastNode[] | null {
  let remaining = value;
  const transformedNodes: HastNode[] = [];
  let hasChanges = false;

  while (remaining.length > 0) {
    const match = findEarliestMatch(remaining, rules, usageByUrl);
    if (!match) {
      transformedNodes.push(createTextNode(remaining));
      break;
    }

    hasChanges = true;

    if (match.start > 0) {
      transformedNodes.push(createTextNode(remaining.slice(0, match.start)));
    }

    transformedNodes.push(createAutoLinkNode(match.text, match.ruleUrl));
    incrementUsageCount(usageByUrl, match.ruleUrl);
    generatedUrls.add(match.ruleUrl);

    remaining = remaining.slice(match.end);
  }

  if (!hasChanges) {
    return null;
  }

  return transformedNodes.filter(
    (node) =>
      !isTextNode(node) ||
      node.value.trim().length > 0 ||
      node.value.length > 0,
  );
}

function shouldSkipInjection(ancestorTags: string[]): boolean {
  return ancestorTags.some((tagName) => SKIPPED_TAGS.has(tagName));
}

function walkTree(
  children: HastNode[],
  ancestorTags: string[],
  rules: CompiledRule[],
  usageByUrl: Map<string, number>,
  generatedUrls: Set<string>,
): void {
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) {
      continue;
    }

    if (isTextNode(child) && !shouldSkipInjection(ancestorTags)) {
      const transformed = injectLinksInTextNode(
        child.value,
        rules,
        usageByUrl,
        generatedUrls,
      );

      if (transformed) {
        children.splice(index, 1, ...transformed);
        index += transformed.length - 1;
      }
      continue;
    }

    if (isElementNode(child)) {
      ancestorTags.push(child.tagName.toLowerCase());
      walkTree(child.children, ancestorTags, rules, usageByUrl, generatedUrls);
      ancestorTags.pop();
      continue;
    }

    if (isRootNode(child)) {
      walkTree(child.children, ancestorTags, rules, usageByUrl, generatedUrls);
    }
  }
}

export function createRehypeInternalLinksPlugin(
  options: InternalLinksPluginOptions,
) {
  const generatedUrls = options.generatedUrls ?? new Set<string>();
  const excludedUrls = new Set(
    (options.excludeUrls ?? []).map(normalizeTrackedUrl),
  );
  const compiledRules = compileRules(options.rules, excludedUrls);

  return function rehypeInternalLinksPlugin() {
    return (tree: unknown) => {
      if (options.disabled || compiledRules.length === 0) {
        return;
      }

      const root = toHastRoot(tree);
      if (!root) {
        return;
      }

      const usageByUrl = new Map<string, number>();
      collectExistingLinks(root, usageByUrl);
      walkTree(root.children, [], compiledRules, usageByUrl, generatedUrls);
    };
  };
}
