import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { type Locale, isValidLocale, locales } from "../i18n/config";
import {
  BLOG_POSTS_PER_PAGE,
  BLOG_ROUTE_SEGMENT,
  isProductionEnvironment,
  resolveBlogContentDirectory,
} from "./config";
import type {
  BlogFrontmatter,
  BlogListSearchParams,
  BlogPost,
  BlogSiblingPosts,
  PaginatedBlogPosts,
} from "./types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

let cachedPosts: BlogPost[] | null = null;

function shouldUseMemoryCache(): boolean {
  return isProductionEnvironment();
}

function resolveRawString(value: unknown, fieldName: string, sourcePath: string): string {
  if (typeof value !== "string") {
    throw new Error(`${sourcePath}: frontmatter field '${fieldName}' must be a string.`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${sourcePath}: frontmatter field '${fieldName}' cannot be empty.`);
  }

  return trimmed;
}

function resolveOptionalString(value: unknown, fieldName: string, sourcePath: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return resolveRawString(value, fieldName, sourcePath);
}

function resolveStringArray(
  value: unknown,
  fieldName: string,
  sourcePath: string,
  { required }: { required: boolean },
): string[] {
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`${sourcePath}: frontmatter field '${fieldName}' must be an array of strings.`);
    }
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${sourcePath}: frontmatter field '${fieldName}' must be an array of strings.`);
  }

  const values = value.map((entry) => resolveRawString(entry, fieldName, sourcePath));
  if (required && values.length === 0) {
    throw new Error(`${sourcePath}: frontmatter field '${fieldName}' must contain at least one value.`);
  }

  return values;
}

function resolveBoolean(value: unknown, fieldName: string, sourcePath: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${sourcePath}: frontmatter field '${fieldName}' must be a boolean.`);
  }

  return value;
}

function resolveOptionalPositiveNumber(
  value: unknown,
  fieldName: string,
  sourcePath: string,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${sourcePath}: frontmatter field '${fieldName}' must be a positive number.`);
  }

  return Math.max(1, Math.round(value));
}

function resolveOptionalBoolean(
  value: unknown,
  fieldName: string,
  sourcePath: string,
): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${sourcePath}: frontmatter field '${fieldName}' must be a boolean.`);
  }

  return value;
}

function resolveLocaleValue(value: unknown, sourcePath: string): Locale {
  if (value === undefined || value === null) {
    return "fr";
  }

  if (typeof value !== "string" || !isValidLocale(value)) {
    throw new Error(
      `${sourcePath}: frontmatter field 'lang' must be one of: ${locales.join(", ")}.`,
    );
  }

  return value;
}

function resolveDate(value: unknown, sourcePath: string): { date: Date; iso: string } {
  const raw = resolveRawString(value, "date", sourcePath);

  if (!DATE_PATTERN.test(raw)) {
    throw new Error(
      `${sourcePath}: frontmatter field 'date' must match YYYY-MM-DD format.`,
    );
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${sourcePath}: frontmatter field 'date' is not a valid calendar date.`);
  }

  return { date: parsed, iso: raw };
}

function parseFrontmatter(sourcePath: string, source: string): BlogPost {
  const parsed = matter(source);
  const frontmatter = parsed.data as BlogFrontmatter;

  const fileName = path.basename(sourcePath, path.extname(sourcePath));
  if (!SLUG_PATTERN.test(fileName)) {
    throw new Error(
      `${sourcePath}: file name must be kebab-case (lowercase letters, numbers, and dashes).`,
    );
  }

  const { date, iso } = resolveDate(frontmatter.date, sourcePath);
  const explicitReadingTime = resolveOptionalPositiveNumber(
    frontmatter.readingTime,
    "readingTime",
    sourcePath,
  );
  const rssVersion = resolveOptionalPositiveNumber(
    frontmatter.rssVersion,
    "rssVersion",
    sourcePath,
  );

  const computedReadingTime = Math.max(1, Math.round(readingTime(parsed.content).minutes));

  return {
    slug: fileName,
    locale: resolveLocaleValue(frontmatter.lang, sourcePath),
    title: resolveRawString(frontmatter.title, "title", sourcePath),
    description: resolveRawString(frontmatter.description, "description", sourcePath),
    date,
    dateIso: iso,
    rssVersion: rssVersion ?? 1,
    tags: resolveStringArray(frontmatter.tags, "tags", sourcePath, { required: true }),
    draft: resolveBoolean(frontmatter.draft, "draft", sourcePath),
    canonical: resolveOptionalString(frontmatter.canonical, "canonical", sourcePath),
    image: resolveOptionalString(frontmatter.image, "image", sourcePath),
    authors: resolveStringArray(frontmatter.authors, "authors", sourcePath, {
      required: false,
    }),
    readingTimeMinutes: explicitReadingTime ?? computedReadingTime,
    disableAutoLinks:
      resolveOptionalBoolean(frontmatter.disableAutoLinks, "disableAutoLinks", sourcePath) ??
      false,
    body: parsed.content,
    sourcePath,
  };
}

function readBlogPostsFromDisk(): BlogPost[] {
  const contentDirectory = resolveBlogContentDirectory();
  if (!fs.existsSync(contentDirectory)) {
    return [];
  }

  const files = fs
    .readdirSync(contentDirectory)
    .filter((entry) => entry.endsWith(".mdx"))
    .sort((left, right) => left.localeCompare(right));

  const posts = files.map((fileName) => {
    const sourcePath = path.join(contentDirectory, fileName);
    const source = fs.readFileSync(sourcePath, "utf8");
    return parseFrontmatter(sourcePath, source);
  });

  return posts.sort((left, right) => {
    const timestampDelta = right.date.getTime() - left.date.getTime();
    if (timestampDelta !== 0) {
      return timestampDelta;
    }

    return left.slug.localeCompare(right.slug);
  });
}

function getAllPostsFromStore(): BlogPost[] {
  if (shouldUseMemoryCache() && cachedPosts) {
    return cachedPosts;
  }

  const posts = readBlogPostsFromDisk();

  if (shouldUseMemoryCache()) {
    cachedPosts = posts;
  }

  return posts;
}

export function getAllBlogPosts(): BlogPost[] {
  return getAllPostsFromStore();
}

function shouldIncludeDrafts(includeDrafts?: boolean): boolean {
  if (typeof includeDrafts === "boolean") {
    return includeDrafts;
  }

  return !isProductionEnvironment();
}

function filterVisibility(posts: BlogPost[], includeDrafts?: boolean): BlogPost[] {
  const includesDrafts = shouldIncludeDrafts(includeDrafts);
  if (includesDrafts) {
    return posts;
  }

  return posts.filter((post) => !post.draft);
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function filterByTag(posts: BlogPost[], selectedTag?: string): BlogPost[] {
  if (!selectedTag) {
    return posts;
  }

  const normalizedTag = normalizeTag(selectedTag);
  return posts.filter((post) => post.tags.some((tag) => normalizeTag(tag) === normalizedTag));
}

function parsePositiveInteger(value: string | undefined): number {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function resolveFirstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parseBlogListSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): BlogListSearchParams {
  const rawTag = resolveFirstValue(searchParams.tag);
  const rawPage = resolveFirstValue(searchParams.page);

  const normalizedTag = rawTag?.trim().toLowerCase();

  return {
    page: parsePositiveInteger(rawPage),
    tag: normalizedTag && normalizedTag.length > 0 ? normalizedTag : undefined,
  };
}

export function buildBlogPostPath(locale: Locale, slug: string): string {
  return `/${locale}/${BLOG_ROUTE_SEGMENT}/${slug}`;
}

export function buildBlogIndexPath(locale: Locale, search: BlogListSearchParams): string {
  const basePath = `/${locale}/${BLOG_ROUTE_SEGMENT}`;
  const query = new URLSearchParams();

  if (search.tag) {
    query.set("tag", search.tag);
  }

  if (search.page > 1) {
    query.set("page", String(search.page));
  }

  const serialized = query.toString();
  if (serialized.length === 0) {
    return basePath;
  }

  return `${basePath}?${serialized}`;
}

export function getBlogPostsByLocale(
  locale: Locale,
  options?: { includeDrafts?: boolean },
): BlogPost[] {
  const localePosts = getAllBlogPosts().filter((post) => post.locale === locale);
  return filterVisibility(localePosts, options?.includeDrafts);
}

export function getPublishedBlogPosts(): BlogPost[] {
  return getAllBlogPosts().filter((post) => !post.draft);
}

export function getBlogPostBySlug(
  locale: Locale,
  slug: string,
  options?: { includeDrafts?: boolean },
): BlogPost | null {
  const post = getAllBlogPosts().find(
    (candidate) => candidate.slug === slug && candidate.locale === locale,
  );

  if (!post) {
    return null;
  }

  const visiblePosts = filterVisibility([post], options?.includeDrafts);
  return visiblePosts[0] ?? null;
}

export function getPaginatedBlogPosts(
  locale: Locale,
  search: BlogListSearchParams,
  options?: { includeDrafts?: boolean; pageSize?: number },
): PaginatedBlogPosts {
  const visiblePosts = getBlogPostsByLocale(locale, { includeDrafts: options?.includeDrafts });
  const availableTags = Array.from(
    new Set(visiblePosts.flatMap((post) => post.tags.map((tag) => normalizeTag(tag)))),
  ).sort((left, right) => left.localeCompare(right));

  const taggedPosts = filterByTag(visiblePosts, search.tag);
  const pageSize = options?.pageSize ?? BLOG_POSTS_PER_PAGE;
  const totalPosts = taggedPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / pageSize));
  const currentPage = Math.min(search.page, totalPages);

  const startIndex = (currentPage - 1) * pageSize;
  const posts = taggedPosts.slice(startIndex, startIndex + pageSize);

  return {
    posts,
    totalPosts,
    totalPages,
    currentPage,
    selectedTag: search.tag,
    availableTags,
  };
}

export function getBlogSiblingPosts(
  currentPost: BlogPost,
  options?: { includeDrafts?: boolean },
): BlogSiblingPosts {
  const posts = getBlogPostsByLocale(currentPost.locale, {
    includeDrafts: options?.includeDrafts,
  });
  const index = posts.findIndex((post) => post.slug === currentPost.slug);

  if (index < 0) {
    return { previous: null, next: null };
  }

  return {
    previous: posts[index - 1] ?? null,
    next: posts[index + 1] ?? null,
  };
}

export function getBlogPostAlternateLocales(
  slug: string,
  options?: { includeDrafts?: boolean },
): Partial<Record<Locale, BlogPost>> {
  const alternates: Partial<Record<Locale, BlogPost>> = {};

  for (const locale of locales) {
    const candidate = getBlogPostBySlug(locale, slug, {
      includeDrafts: options?.includeDrafts,
    });
    if (candidate) {
      alternates[locale] = candidate;
    }
  }

  return alternates;
}
