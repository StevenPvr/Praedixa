interface ConfigReadonlyNoticeProps {
  message: string;
  permission: string;
}

export function ConfigReadonlyNotice({
  message,
  permission,
}: ConfigReadonlyNoticeProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
      {message} <span className="font-medium text-ink">{permission}</span>
    </div>
  );
}
