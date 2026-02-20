import { SkeletonCard } from "@praedixa/ui";

export default function LoadingOnboarding() {
  return (
    <div className="space-y-4">
      <SkeletonCard className="h-24" />
      <SkeletonCard className="h-80" />
    </div>
  );
}
