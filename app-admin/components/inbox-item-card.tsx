import { ChevronRight } from "lucide-react";
import { PRIORITY_CONFIG, type InboxItem } from "@/lib/inbox-helpers";

export function InboxItemCard({ item }: { item: InboxItem }) {
  const config = PRIORITY_CONFIG[item.priority];

  return (
    <a
      href={item.href}
      className={`flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 hover:shadow-card hover:-translate-y-0.5 ${config.bg} ${config.border}`}
    >
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-charcoal">
            {item.title}
          </span>
          <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink-tertiary">
            {item.source}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-ink-tertiary">
          {item.description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-placeholder" />
    </a>
  );
}
