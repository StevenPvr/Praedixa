import { cn } from "../../lib/utils";

interface SectionShellV2Props {
  children: React.ReactNode;
  id?: string;
  variant?: "light" | "dark";
  flush?: boolean;
  className?: string;
  as?: "section" | "div";
}

export function SectionShellV2({
  children,
  id,
  variant = "light",
  flush = false,
  className,
  as: Tag = "section",
}: SectionShellV2Props) {
  return (
    <Tag
      id={id}
      className={cn(
        "overflow-x-clip scroll-mt-[calc(var(--header-h)+1rem)]",
        !flush && "py-28 md:py-36",
        variant === "dark" && "section-dark",
        className,
      )}
    >
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </Tag>
  );
}
