import Link from "next/link";
import type { Locale } from "../../lib/i18n/config";
import { buildBlogPostPath } from "../../lib/blog/posts";
import type { BlogPost } from "../../lib/blog/types";
import {
  formatBlogDate,
  formatReadingTime,
  formatTagLabel,
} from "../../lib/blog/format";

interface BlogPostCardProps {
  locale: Locale;
  post: BlogPost;
}

export function BlogPostCard({ locale, post }: BlogPostCardProps) {
  const href = buildBlogPostPath(locale, post.slug);

  return (
    <article className="rounded-2xl border border-border-subtle bg-white/80 p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <time dateTime={post.dateIso}>{formatBlogDate(locale, post.date)}</time>
        <span aria-hidden="true">•</span>
        <span>{formatReadingTime(locale, post.readingTimeMinutes)}</span>
      </div>

      <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
        <Link href={href} className="text-ink no-underline hover:text-ink-800">
          {post.title}
        </Link>
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        {post.description}
      </p>

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
    </article>
  );
}
