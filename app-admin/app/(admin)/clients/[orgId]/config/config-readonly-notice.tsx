interface ConfigReadonlyNoticeProps {
  message: string;
  permission: string;
}

export function ConfigReadonlyNotice(
  props: Readonly<ConfigReadonlyNoticeProps>,
) {
  const { message, permission } = props;
  return (
    <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
      {message} <span className="font-medium text-ink">{permission}</span>
    </div>
  );
}
