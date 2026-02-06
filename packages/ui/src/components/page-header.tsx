// Page header with title, breadcrumbs, and action buttons
import * as React from "react";
import { cn } from "../utils/cn";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title (rendered as h1) */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Breadcrumb items (last item is current page) */
  breadcrumbs?: Breadcrumb[];
  /** Action buttons slot (right-aligned) */
  actions?: React.ReactNode;
}

/* ────────────────────────────────────────────── */
/*  Breadcrumbs                                   */
/* ────────────────────────────────────────────── */

function BreadcrumbNav({ items }: { items: Breadcrumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-2">
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={crumb.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <svg
                  className="h-3.5 w-3.5 text-gray-300"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {crumb.href && !isLast ? (
                <a
                  href={crumb.href}
                  className="text-gray-500 transition-colors hover:text-charcoal"
                >
                  {crumb.label}
                </a>
              ) : (
                <span
                  className={cn(
                    isLast ? "font-medium text-charcoal" : "text-gray-500",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, subtitle, breadcrumbs, actions, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("mb-8", className)} {...props}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <BreadcrumbNav items={breadcrumbs} />
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-3">{actions}</div>
          )}
        </div>
      </div>
    );
  },
);

PageHeader.displayName = "PageHeader";

export { PageHeader };
