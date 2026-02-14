"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import { EASING, DURATION, STAGGER } from "@/lib/animations/config";

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

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: STAGGER.fast, delayChildren: 0.02 },
  },
};

const staggerChild = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.premium },
  },
};

function BreadcrumbNav({ items }: { items: Breadcrumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4">
      <ol className="flex items-center gap-2 text-body-sm text-ink-secondary">
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${crumb.label}-${index}`}
              className="flex items-center gap-2"
            >
              {index > 0 && (
                <span className="text-ink-placeholder" aria-hidden="true">
                  /
                </span>
              )}
              {crumb.href && !isLast ? (
                <a
                  href={crumb.href}
                  className="transition-colors duration-fast hover:text-primary"
                >
                  {crumb.label}
                </a>
              ) : (
                <span
                  className={cn(
                    isLast ? "font-medium text-ink" : "text-ink-secondary",
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
    },
    ref,
  ) => {
    return (
      <motion.div
        ref={ref}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={cn(
          "mb-8",
          borderBottom && "border-b border-border pb-6",
          className,
        )}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <BreadcrumbNav items={breadcrumbs} />
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            {eyebrow && (
              <motion.p
                variants={staggerChild}
                className="text-overline text-primary"
              >
                {eyebrow}
              </motion.p>
            )}
            <motion.h1
              variants={staggerChild}
              className={cn(
                "font-heading tracking-tight text-ink",
                size === "large" ? "text-display" : "text-display-sm",
              )}
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p
                variants={staggerChild}
                className="max-w-2xl text-body text-ink-secondary text-balance"
              >
                {subtitle}
              </motion.p>
            )}
          </div>

          {actions && (
            <motion.div
              variants={staggerChild}
              className="flex shrink-0 items-center gap-3 pt-1"
            >
              {actions}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  },
);

PageHeader.displayName = "PageHeader";

export { PageHeader };
