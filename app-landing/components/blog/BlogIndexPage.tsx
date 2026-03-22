import Link from "next/link";
import type { Locale } from "../../lib/i18n/config";
import { buildBlogIndexPath } from "../../lib/blog/posts";
import type {
  BlogListSearchParams,
  PaginatedBlogPosts,
} from "../../lib/blog/types";
import { formatTagLabel } from "../../lib/blog/format";
import { CorePageJsonLd } from "../seo/CorePageJsonLd";
import { BreadcrumbTrail } from "../shared/BreadcrumbTrail";
import { GeoSummaryPanel } from "../shared/GeoSummaryPanel";
import { SectionShell } from "../shared/SectionShell";
import { BlogPostCard } from "./BlogPostCard";

interface BlogIndexPageProps {
  locale: Locale;
  search: BlogListSearchParams;
  result: PaginatedBlogPosts;
}

function buildSearch(page: number, tag?: string): BlogListSearchParams {
  return {
    page,
    ...(tag !== undefined ? { tag } : {}),
  };
}

function buildPaginationHref(
  locale: Locale,
  search: BlogListSearchParams,
  page: number,
): string {
  return buildBlogIndexPath(locale, buildSearch(page, search.tag));
}

function buildBlogSummary(locale: Locale, selectedTag?: string): string {
  if (locale === "fr") {
    if (selectedTag) {
      return `Articles Praedixa pour le tag ${formatTagLabel(selectedTag)}: décision opérationnelle multi-sites, arbitrages Ops/Finance et preuve d'impact économique.`;
    }

    return "Le blog Praedixa explique comment anticiper les risques opérationnels, comparer les options et relire l'impact réel des décisions multi-sites.";
  }

  if (selectedTag) {
    return `Praedixa articles tagged ${formatTagLabel(selectedTag)}: multi-site operational decisions, Ops/Finance trade-offs, and impact proof.`;
  }

  return "The Praedixa blog explains how to anticipate operational risks, compare options, and review the real impact of multi-site decisions.";
}

export function BlogIndexPage({ locale, search, result }: BlogIndexPageProps) {
  const title = locale === "fr" ? "Blog Praedixa" : "Praedixa Blog";
  const subtitle =
    locale === "fr"
      ? "Analyses opérationnelles, arbitrages Ops/Finance et preuve d'impact économique."
      : "Operational analysis, Ops/Finance decision-making, and impact proof.";

  const selectedTag = result.selectedTag;
  const currentPath = buildBlogIndexPath(
    locale,
    buildSearch(search.page, search.tag),
  );
  const summary = buildBlogSummary(locale, selectedTag);
  const breadcrumbItems = [
    { label: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
    { label: title },
  ] as const;

  return (
    <SectionShell className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <CorePageJsonLd
          locale={locale}
          name={
            selectedTag ? `${title} | ${formatTagLabel(selectedTag)}` : title
          }
          description={summary}
          path={currentPath}
          breadcrumbs={[
            {
              name: locale === "fr" ? "Accueil" : "Home",
              path: `/${locale}`,
            },
            {
              name: title,
              path: currentPath,
            },
          ]}
        />
        <BreadcrumbTrail items={breadcrumbItems} />
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <GeoSummaryPanel
          locale={locale}
          summary={summary}
          takeaways={[
            subtitle,
            locale === "fr"
              ? "Chaque article relie signal, option comparée et impact relu."
              : "Each article connects signal, compared option, and reviewed impact.",
            selectedTag
              ? locale === "fr"
                ? `Filtre actif: ${formatTagLabel(selectedTag)}.`
                : `Active filter: ${formatTagLabel(selectedTag)}.`
              : locale === "fr"
                ? "Hub canonique pour découvrir le corpus éditorial public."
                : "Canonical hub to discover the public editorial corpus.",
          ]}
        />

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href={`/${locale}/blog`}
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold no-underline transition-colors ${
              !selectedTag
                ? "border-proof-500 bg-proof-500 text-white"
                : "border-border-subtle bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {locale === "fr" ? "Tous" : "All"}
          </Link>

          {result.availableTags.map((tag) => {
            const href = buildBlogIndexPath(locale, { page: 1, tag });
            const isActive = selectedTag === tag;

            return (
              <Link
                key={tag}
                href={href}
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold no-underline transition-colors ${
                  isActive
                    ? "border-proof-500 bg-proof-500 text-white"
                    : "border-border-subtle bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {formatTagLabel(tag)}
              </Link>
            );
          })}
        </div>

        {result.posts.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border-subtle bg-white/80 p-6 text-sm text-neutral-600">
            {locale === "fr"
              ? "Aucun article ne correspond aux filtres sélectionnés."
              : "No article matches the selected filters."}
          </div>
        ) : (
          <div className="mt-10 space-y-5">
            {result.posts.map((post) => (
              <BlogPostCard
                key={`${post.locale}:${post.slug}`}
                locale={locale}
                post={post}
              />
            ))}
          </div>
        )}

        {result.totalPages > 1 ? (
          <nav
            className="mt-10 flex items-center justify-between"
            aria-label="Blog pagination"
          >
            {result.currentPage > 1 ? (
              <Link
                href={buildPaginationHref(
                  locale,
                  search,
                  result.currentPage - 1,
                )}
                className="inline-flex rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-neutral-700 no-underline hover:bg-neutral-50"
              >
                {locale === "fr" ? "Page précédente" : "Previous page"}
              </Link>
            ) : (
              <span className="inline-flex rounded-lg border border-border-subtle bg-neutral-100 px-4 py-2 text-sm text-neutral-400">
                {locale === "fr" ? "Page précédente" : "Previous page"}
              </span>
            )}

            <p className="text-sm text-neutral-500">
              {locale === "fr"
                ? `Page ${result.currentPage} sur ${result.totalPages}`
                : `Page ${result.currentPage} of ${result.totalPages}`}
            </p>

            {result.currentPage < result.totalPages ? (
              <Link
                href={buildPaginationHref(
                  locale,
                  search,
                  result.currentPage + 1,
                )}
                className="inline-flex rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-neutral-700 no-underline hover:bg-neutral-50"
              >
                {locale === "fr" ? "Page suivante" : "Next page"}
              </Link>
            ) : (
              <span className="inline-flex rounded-lg border border-border-subtle bg-neutral-100 px-4 py-2 text-sm text-neutral-400">
                {locale === "fr" ? "Page suivante" : "Next page"}
              </span>
            )}
          </nav>
        ) : null}
      </div>
    </SectionShell>
  );
}
