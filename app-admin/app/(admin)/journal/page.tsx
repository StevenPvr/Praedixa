"use client";

import {
  JournalAuditSection,
  JournalRgpdSection,
  JournalTabs,
} from "./journal-sections";
import { useJournalPageModel } from "./journal-page-model";

export default function JournalPage() {
  const model = useJournalPageModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">Journal</h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          Audit et conformite RGPD
        </p>
      </div>

      <JournalTabs
        section={model.section}
        total={model.total}
        onChange={model.setSection}
      />

      {model.section === "audit" ? (
        <JournalAuditSection
          canReadAudit={model.canReadAudit}
          actionFilter={model.actionFilter}
          onActionFilterChange={model.setActionFilter}
          error={model.error}
          refetch={model.refetch}
          columns={model.columns}
          data={model.data}
          getRowKey={model.getRowKey}
          selectedKeys={model.selectedKeys}
          setSelectedKeys={model.setSelectedKeys}
          selectedOnPageCount={model.selectedOnPageCount}
          page={model.page}
          setPage={model.setPage}
          total={model.total}
        />
      ) : (
        <JournalRgpdSection canManageRgpd={model.canManageRgpd} />
      )}
    </div>
  );
}
