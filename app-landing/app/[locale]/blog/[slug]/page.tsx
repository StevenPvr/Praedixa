import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostPage } from "../../../../components/blog/BlogPostPage";
import { isProductionEnvironment } from "../../../../lib/blog/config";
import { getCompiledBlogMdx } from "../../../../lib/blog/mdx";
import type { BlogPost } from "../../../../lib/blog/types";
import {
  buildBlogPostPath,
  getBlogPostAlternateLocales,
  getBlogPostBySlug,
  getBlogSiblingPosts,
  getPublishedBlogPosts,
} from "../../../../lib/blog/posts";
import { type Locale, isValidLocale } from "../../../../lib/i18n/config";
import { PRAEDIXA_SOCIAL_IMAGE_URL } from "../../../../lib/seo/entity";
import { absoluteUrl } from "../../../../lib/seo/metadata";

interface BlogPostParams {
  locale: string;
  slug: string;
}

interface BlogPostRouteProps {
  params: Promise<BlogPostParams>;
}

function toAbsoluteCanonicalUrl(canonical: string): string {
  if (canonical.startsWith("http://") || canonical.startsWith("https://")) {
    return canonical;
  }

  return absoluteUrl(canonical);
}

function resolveAlternateLanguageUrls(
  locale: Locale,
  post: BlogPost,
  includeDrafts: boolean,
): Record<string, string> {
  const alternates = getBlogPostAlternateLocales(post, { includeDrafts });
  const languageUrls: Record<string, string> = {};

  if (alternates["fr"]) {
    languageUrls["fr-FR"] = absoluteUrl(
      buildBlogPostPath("fr", alternates["fr"].slug),
    );
    languageUrls["x-default"] = absoluteUrl(
      buildBlogPostPath("fr", alternates["fr"].slug),
    );
  }

  if (alternates["en"]) {
    languageUrls["en"] = absoluteUrl(
      buildBlogPostPath("en", alternates["en"].slug),
    );
  }

  if (!languageUrls["x-default"]) {
    languageUrls["x-default"] = absoluteUrl(
      buildBlogPostPath(locale, post.slug),
    );
  }

  return languageUrls;
}

function resolveMetadataAuthors(post: BlogPost) {
  if (post.authors.length > 0) {
    return post.authors.map((name) => ({ name }));
  }

  return [{ name: "Praedixa" }];
}

export function generateStaticParams() {
  return getPublishedBlogPosts().map((post) => ({
    locale: post.locale,
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostRouteProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) {
    return {};
  }

  const includeDrafts = !isProductionEnvironment();
  const post = getBlogPostBySlug(locale, slug, { includeDrafts });
  if (!post) {
    return {};
  }

  const fallbackCanonicalUrl = absoluteUrl(
    buildBlogPostPath(locale, post.slug),
  );
  const canonicalUrl = post.canonical
    ? toAbsoluteCanonicalUrl(post.canonical)
    : fallbackCanonicalUrl;
  const languageAlternates = resolveAlternateLanguageUrls(
    locale,
    post,
    includeDrafts,
  );
  const isDraft = post.draft;
  const robots = isDraft
    ? {
        index: false,
        follow: false,
      }
    : {
        index: true,
        follow: true,
      };

  return {
    title: post.title,
    description: post.description,
    authors: resolveMetadataAuthors(post),
    keywords: post.tags,
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    robots,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: canonicalUrl,
      siteName: "Praedixa",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: locale === "fr" ? "en_US" : "fr_FR",
      publishedTime: `${post.dateIso}T00:00:00.000Z`,
      modifiedTime: `${post.dateIso}T00:00:00.000Z`,
      authors: post.authors.length > 0 ? post.authors : ["Praedixa"],
      images: [
        {
          url: post.image ?? PRAEDIXA_SOCIAL_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.image ?? PRAEDIXA_SOCIAL_IMAGE_URL],
    },
  };
}

export default async function BlogPostRoute({ params }: BlogPostRouteProps) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const includeDrafts = !isProductionEnvironment();
  const post = getBlogPostBySlug(locale, slug, { includeDrafts });
  if (!post) {
    notFound();
  }

  if (post.draft && isProductionEnvironment()) {
    notFound();
  }

  const { Content } = await getCompiledBlogMdx(post);
  const siblingPosts = getBlogSiblingPosts(post, { includeDrafts });
  const canonicalUrl = post.canonical
    ? toAbsoluteCanonicalUrl(post.canonical)
    : absoluteUrl(buildBlogPostPath(locale, post.slug));

  return (
    <BlogPostPage
      locale={locale}
      post={post}
      canonicalUrl={canonicalUrl}
      siblingPosts={siblingPosts}
      Content={Content}
    />
  );
}
