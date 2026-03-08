import type { Locale } from "../i18n/config";

export interface BlogFrontmatter {
  title: string;
  description: string;
  date: string;
  tags: string[];
  draft: boolean;
  rssVersion?: number;
  translationKey?: string;
  canonical?: string;
  image?: string;
  authors?: string[];
  readingTime?: number;
  lang?: Locale;
  disableAutoLinks?: boolean;
}

export interface BlogPost {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  date: Date;
  dateIso: string;
  rssVersion: number;
  translationKey?: string;
  tags: string[];
  draft: boolean;
  canonical?: string;
  image?: string;
  authors: string[];
  readingTimeMinutes: number;
  disableAutoLinks: boolean;
  body: string;
  sourcePath: string;
}

export interface BlogListSearchParams {
  page: number;
  tag?: string;
}

export interface PaginatedBlogPosts {
  posts: BlogPost[];
  totalPosts: number;
  totalPages: number;
  currentPage: number;
  selectedTag?: string;
  availableTags: string[];
}

export interface BlogSiblingPosts {
  previous: BlogPost | null;
  next: BlogPost | null;
}

export interface InternalLinkRule {
  id: string;
  patterns: string[];
  url: string;
  maxPerDoc?: number;
}
