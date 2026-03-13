import Link from "next/link";
import { AlertTriangle, ArrowLeft, Inbox } from "lucide-react";

interface ReadOnlyDetailHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  description: string;
}

type ReadOnlyStateTone = "empty" | "warning";

interface ReadOnlyStateCardProps {
  title: string;
  message: string;
  tone?: ReadOnlyStateTone;
  details?: string[];
}

const toneStyles: Record<
  ReadOnlyStateTone,
  {
    container: string;
    icon: typeof Inbox;
    iconBg: string;
    iconColor: string;
  }
> = {
  empty: {
    container: "border-border bg-surface-sunken",
    icon: Inbox,
    iconBg: "bg-card",
    iconColor: "text-ink-placeholder",
  },
  warning: {
    container: "border-warning-200 bg-warning-50",
    icon: AlertTriangle,
    iconBg: "bg-white/80",
    iconColor: "text-warning-700",
  },
};

export function ReadOnlyDetailHeader({
  backHref,
  backLabel,
  title,
  description,
}: ReadOnlyDetailHeaderProps) {
  return (
    <div className="space-y-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-ink-tertiary hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div>
        <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink-tertiary">{description}</p>
      </div>
    </div>
  );
}

export function ReadOnlyStateCard({
  title,
  message,
  tone = "empty",
  details = [],
}: ReadOnlyStateCardProps) {
  const style = toneStyles[tone];
  const Icon = style.icon;

  return (
    <div className={`rounded-2xl border p-4 ${style.container}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.iconBg}`}
        >
          <Icon className={`h-4 w-4 ${style.iconColor}`} aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-sm text-ink-tertiary">{message}</p>
          {details.length > 0 ? (
            <ul className="space-y-1 text-sm text-ink-tertiary">
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
