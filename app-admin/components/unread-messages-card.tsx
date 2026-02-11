import { CheckCircle } from "lucide-react";
import { Card } from "@praedixa/ui";
import type { UnreadCount } from "@/lib/inbox-helpers";

export function UnreadMessagesCard({ unread }: { unread: UnreadCount }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-neutral-900">
          Messages non lus
        </h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-700">
          {unread.total}
        </span>
      </div>
      {unread.byOrg.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <CheckCircle className="h-4 w-4 text-success-500" />
          Aucun message en attente
        </div>
      ) : (
        <div className="space-y-2">
          {unread.byOrg.map((org) => (
            <a
              key={org.orgId}
              href={`/clients/${org.orgId}/messages`}
              className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-neutral-50"
            >
              <span className="text-sm text-charcoal">{org.orgName}</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                {org.count}
              </span>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
