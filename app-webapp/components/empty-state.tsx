import Link from "next/link";

interface EmptyStateProps {
  /** Icon element displayed in the circle */
  icon: React.ReactNode;
  /** Main heading */
  title: string;
  /** Descriptive text below the heading */
  description: string;
  /** Label for the optional CTA button */
  ctaLabel?: string;
  /** Link destination — renders a Link instead of a button */
  ctaHref?: string;
  /** Click handler — renders a button (ignored if ctaHref is set) */
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-6 py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
        {description}
      </p>

      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-amber-300 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {ctaLabel}
        </Link>
      )}

      {!ctaHref && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-amber-300 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {ctaLabel ?? "Commencer"}
        </button>
      )}
    </div>
  );
}
