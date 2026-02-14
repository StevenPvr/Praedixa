import { SkeletonCard } from "@praedixa/ui";

export default function MessagesLoading() {
  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-shimmer-pearl rounded-md" />
        <div className="h-4 w-64 animate-shimmer rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-2 lg:col-span-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-16" />
          ))}
        </div>
        <div className="lg:col-span-8">
          <SkeletonCard className="h-[500px]" />
        </div>
      </div>
    </div>
  );
}
