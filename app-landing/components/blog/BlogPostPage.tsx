import Link from "next/link";
import type { ReactElement } from "react";
import type { Locale } from "../../lib/i18n/config";
import { buildBlogPostPath } from "../../lib/blog/posts";
import type { BlogPost, BlogSiblingPosts } from "../../lib/blog/types";
import {
  formatBlogDate,
  formatReadingTime,
  formatTagLabel,
} from "../../lib/blog/format";
import { serializeJsonForScriptTag } from "../../lib/security/json-script";
import {
  PRAEDIXA_BASE_URL,
  PRAEDIXA_BRAND_NAME,
  PRAEDIXA_LOGO_URL,
} from "../../lib/seo/entity";
import { BreadcrumbTrail } from "../shared/BreadcrumbTrail";
import { GeoSummaryPanel } from "../shared/GeoSummaryPanel";
import { SectionShell } from "../shared/SectionShell";

interface BlogPostPageProps {
  locale: Locale;
  post: BlogPost;
  canonicalUrl: string;
  siblingPosts: BlogSiblingPosts;
  Content: (props: { components?: Record<string, unknown> }) => ReactElement;
}

function resolveAuthor(post: BlogPost): string {
  if (post.authors.length > 0) {
    return post.authors.join(", ");
  }

  return PRAEDIXA_BRAND_NAME;
}

function stripMarkdown(raw: string): string {
  return raw
    .replace(/^#+\s+/gm, "")
    .replace(/^[*-]\s+/gm, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`*_>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPostTakeaways(post: BlogPost): string[] {
  if (post.keyPoints.length > 0) {
    return post.keyPoints.slice(0, 3);
  }

  const seen = new Set<string>();

  return post.body
    .split(/\n{2,}/)
    .map((chunk) => stripMarkdown(chunk))
    .filter((chunk) => chunk.length >= 40 && chunk !== post.description)
    .filter((chunk) => {
      const normalized = chunk.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .slice(0, 3);
}

export function BlogPostPage({
  locale,
  post,
  canonicalUrl,
  siblingPosts,
  Content,
}: BlogPostPageProps) {
  const blogIndexPath = `/${locale}/blog`;
  const summary = post.answerSummary ?? post.description;
  const imageUrl =
    typeof post.image === "string" && post.image.startsWith("http")
      ? post.image
      : post.image
        ? `${PRAEDIXA_BASE_URL}${post.image.startsWith("/") ? post.image : `/${post.image}`}`
        : `${PRAEDIXA_BASE_URL}/og-image.png`;
  const breadcrumbSchemaId = `${canonicalUrl}#breadcrumb`;
  const postingSchemaId = `${canonicalUrl}#blogposting`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": breadcrumbSchemaId,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Praedixa",
        item: `${PRAEDIXA_BASE_URL}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${PRAEDIXA_BASE_URL}${blogIndexPath}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  };

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": postingSchemaId,
    headline: post.title,
    description: post.description,
    datePublished: `${post.dateIso}T00:00:00.000Z`,
    dateModified: `${post.dateIso}T00:00:00.000Z`,
    mainEntityOfPage: canonicalUrl,
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${PRAEDIXA_BASE_URL}#website`,
    },
    about: {
      "@type": "Organization",
      "@id": `${PRAEDIXA_BASE_URL}#organization`,
    },
    breadcrumb: {
      "@id": breadcrumbSchemaId,
    },
    author: {
      "@type": "Person",
      name: resolveAuthor(post),
    },
    publisher: {
      "@type": "Organization",
      name: PRAEDIXA_BRAND_NAME,
      logo: {
        "@type": "ImageObject",
        url: PRAEDIXA_LOGO_URL,
      },
    },
    image: [imageUrl],
    keywords: post.tags,
    citation: post.sources.map((source) => source.url),
  };

  return (
    <SectionShell className="py-16 md:py-24">
      <article className="mx-auto max-w-3xl">
        <script
          id={`praedixa-blog-breadcrumb-${post.slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonForScriptTag(breadcrumbJsonLd),
          }}
        />
        <script
          id={`praedixa-blogposting-${post.slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonForScriptTag(blogPostingJsonLd),
          }}
        />

        <BreadcrumbTrail
          items={[
            {
              label: locale === "fr" ? "Accueil" : "Home",
              href: `/${locale}`,
            },
            {
              label: locale === "fr" ? "Blog" : "Blog",
              href: blogIndexPath,
            },
            {
              label: post.title,
            },
          ]}
        />

        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          <GeoSummaryPanel
            locale={locale}
            summary={summary}
            takeaways={buildPostTakeaways(post)}
          />

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
            <time dateTime={post.dateIso}>
              {formatBlogDate(locale, post.date)}
            </time>
            <span aria-hidden="true">•</span>
            <span>{formatReadingTime(locale, post.readingTimeMinutes)}</span>
            <span aria-hidden="true">•</span>
            <span>{resolveAuthor(post)}</span>
          </div>

          <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
            {post.tags.map((tag) => (
              <li key={tag} className="m-0">
                <Link
                  href={`/${locale}/blog?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 no-underline hover:bg-amber-100"
                >
                  {formatTagLabel(tag)}
                </Link>
              </li>
            ))}
          </ul>
        </header>

        <div className="blog-prose mt-10">
          <Content />
        </div>

        {post.sources.length > 0 ? (
          <section className="mt-12 rounded-2xl border border-border-subtle bg-neutral-50/70 p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {locale === "fr" ? "Sources citees" : "Cited sources"}
            </h2>
            <ul className="mt-4 list-none space-y-2 p-0">
              {post.sources.map((source) => (
                <li key={`${source.label}:${source.url}`} className="m-0">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-proof-500 no-underline hover:text-proof-500/80"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav className="mt-12 grid gap-4 border-t border-border-subtle pt-8 sm:grid-cols-2">
          {siblingPosts.previous ? (
            <Link
              href={buildBlogPostPath(locale, siblingPosts.previous.slug)}
              className="rounded-xl border border-border-subtle bg-white p-4 text-sm no-underline hover:bg-neutral-50"
            >
              <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">
                {locale === "fr" ? "Article précédent" : "Previous article"}
              </p>
              <p className="mt-2 font-medium text-ink">
                {siblingPosts.previous.title}
              </p>
            </Link>
          ) : (
            <div />
          )}

          {siblingPosts.next ? (
            <Link
              href={buildBlogPostPath(locale, siblingPosts.next.slug)}
              className="rounded-xl border border-border-subtle bg-white p-4 text-sm no-underline hover:bg-neutral-50"
            >
              <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">
                {locale === "fr" ? "Article suivant" : "Next article"}
              </p>
              <p className="mt-2 font-medium text-ink">
                {siblingPosts.next.title}
              </p>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </article>
    </SectionShell>
  );
}
