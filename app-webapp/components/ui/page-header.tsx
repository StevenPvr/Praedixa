import * as React from "react";
import { cn } from "@praedixa/ui";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  size?: "default" | "large";
  borderBottom?: boolean;
  eyebrow?: string;
}

function BreadcrumbNav({ items }: { items: Breadcrumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4">
      <ol className="flex items-center gap-2 text-sm text-ink-tertiary">
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${crumb.label}-${index}`}
              className="flex items-center gap-2"
            >
              {index > 0 && <span className="text-gray-300">/</span>}
              {crumb.href && !isLast ? (
                <a
                  href={crumb.href}
                  className="transition-colors hover:text-primary"
                >
                  {crumb.label}
                </a>
              ) : (
                <span
                  className={cn(
                    isLast ? "font-medium text-ink" : "text-ink-tertiary",
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

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    {
      className,
      title,
      subtitle,
      breadcrumbs,
      actions,
      size = "default",
      borderBottom,
      eyebrow,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mb-8 animate-fade-in",
          borderBottom && "border-b border-black/[0.06] pb-6",
          className,
        )}
        {...props}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <BreadcrumbNav items={breadcrumbs} />
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
                {eyebrow}
              </p>
            )}
            <h1
              className={cn(
                "font-heading tracking-tight text-ink",
                size === "large"
                  ? "text-4xl font-semibold"
                  : "text-[2rem] font-semibold",
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-3xl text-base text-ink-secondary text-balance">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 items-center gap-3 pt-1">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  },
);

PageHeader.displayName = "PageHeader";

export { PageHeader };
