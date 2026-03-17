import { cn } from "../../../lib/utils";

interface TimelineStepProps {
  marker: string;
  title: string;
  description: string;
  isLast?: boolean;
  className?: string;
}

function TimelineMarker({ marker }: { marker: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-proof-500 text-sm font-bold text-white">
      {marker}
    </div>
  );
}

function TimelineCopy({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-sm font-semibold tracking-tight text-ink-950">
        {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-700">{description}</p>
    </div>
  );
}

export function TimelineStep({
  marker,
  title,
  description,
  isLast = false,
  className,
}: TimelineStepProps) {
  return (
    <div className={cn("group flex flex-col items-center", className)}>
      <div className="hidden items-start md:flex">
        <div className="flex flex-col items-center">
          <TimelineMarker marker={marker} />
        </div>

        {!isLast && (
          <div className="mt-5 h-px w-16 shrink-0 bg-v2-border-200 lg:w-24" />
        )}
      </div>

      <TimelineCopy
        title={title}
        description={description}
        className="mt-3 hidden max-w-[18rem] text-center md:block"
      />

      <div className="flex gap-4 md:hidden">
        <div className="flex flex-col items-center">
          <TimelineMarker marker={marker} />
          {!isLast && <div className="mt-2 w-px grow bg-v2-border-200" />}
        </div>

        <TimelineCopy
          title={title}
          description={description}
          className={cn("pb-8", isLast && "pb-0")}
        />
      </div>
    </div>
  );
}
