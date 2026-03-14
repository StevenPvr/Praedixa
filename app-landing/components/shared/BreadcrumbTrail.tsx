import Link from "next/link";

export interface BreadcrumbTrailItem {
  label: string;
  href?: string;
}

interface BreadcrumbTrailProps {
  items: readonly BreadcrumbTrailItem[];
}

export function BreadcrumbTrail({ items }: BreadcrumbTrailProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}:${item.href ?? "current"}`} className="m-0">
              <span className="flex items-center gap-2">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="font-medium text-neutral-600 no-underline transition-colors duration-200 hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast ? "font-medium text-ink" : "text-neutral-600"
                    }
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
                {!isLast ? <span aria-hidden="true">/</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
