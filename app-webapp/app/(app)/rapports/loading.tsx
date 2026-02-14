import { SkeletonTable } from "@praedixa/ui";

export default function RapportsLoading() {
  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <div className="h-8 w-36 animate-shimmer-pearl rounded-md" />
        <div className="h-4 w-72 animate-shimmer rounded-md" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-shimmer rounded-full" />
        ))}
      </div>
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}
