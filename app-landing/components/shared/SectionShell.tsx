import { cn } from "../../lib/utils";

interface SectionShellProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  as?: "section" | "div";
}

export function SectionShell({
  children,
  id,
  className,
  as: Tag = "section",
}: SectionShellProps) {
  return (
    <Tag id={id} className={cn("py-20 md:py-28", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </Tag>
  );
}
