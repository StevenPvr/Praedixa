import Link from "next/link";
import type { ReactElement } from "react";
import type { Locale } from "../../lib/i18n/config";
import { buildBlogPostPath } from "../../lib/blog/posts";
import type { BlogPost, BlogSiblingPosts } from "../../lib/blog/types";
import { formatBlogDate, formatReadingTime, formatTagLabel } from "../../lib/blog/format";
import { serializeJsonForScriptTag } from "../../lib/security/json-script";
import { PRAEDIXA_BASE_URL, PRAEDIXA_BRAND_NAME, PRAEDIXA_LOGO_URL } from "../../lib/seo/entity";
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

export function BlogPostPage({
  locale,
  post,
  canonicalUrl,
  siblingPosts,
  Content,
}: BlogPostPageProps) {
  const blogIndexPath = `/${locale}/blog`;
  const imageUrl =
    typeof post.image === "string" && post.image.startsWith("http")
      ? post.image
      : post.image
        ? `${PRAEDIXA_BASE_URL}${post.image.startsWith("/") ? post.image : `/${post.image}`}`
        : `${PRAEDIXA_BASE_URL}/og-image.png`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
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
    headline: post.title,
    description: post.description,
    datePublished: `${post.dateIso}T00:00:00.000Z`,
    dateModified: `${post.dateIso}T00:00:00.000Z`,
    mainEntityOfPage: canonicalUrl,
    inLanguage: locale,
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

        <nav className="text-xs text-neutral-500" aria-label="Breadcrumb">
          <Link href={`/${locale}`} className="text-neutral-500 no-underline hover:text-ink">
            Praedixa
          </Link>
          {" / "}
          <Link href={blogIndexPath} className="text-neutral-500 no-underline hover:text-ink">
            {locale === "fr" ? "Blog" : "Blog"}
          </Link>
          {" / "}
          <span className="text-neutral-700">{post.title}</span>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{post.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-600">{post.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
            <time dateTime={post.dateIso}>{formatBlogDate(locale, post.date)}</time>
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

        <nav className="mt-12 grid gap-4 border-t border-border-subtle pt-8 sm:grid-cols-2">
          {siblingPosts.previous ? (
            <Link
              href={buildBlogPostPath(locale, siblingPosts.previous.slug)}
              className="rounded-xl border border-border-subtle bg-white p-4 text-sm no-underline hover:bg-neutral-50"
            >
              <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">
                {locale === "fr" ? "Article précédent" : "Previous article"}
              </p>
              <p className="mt-2 font-medium text-ink">{siblingPosts.previous.title}</p>
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
              <p className="mt-2 font-medium text-ink">{siblingPosts.next.title}</p>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </article>
    </SectionShell>
  );
}
