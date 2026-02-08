"use client";

import { Skeleton } from "@praedixa/ui";

interface SkeletonStepperProps {
  steps?: number;
}

export function SkeletonStepper({ steps = 5 }: SkeletonStepperProps) {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      role="status"
      aria-label="Chargement de l'assistant d'onboarding"
    >
      {/* Stepper indicator: circles with connecting lines */}
      <div className="flex items-center justify-center gap-0">
        {Array.from({ length: steps }).map((_, i) => (
          <div key={`step-${i}`} className="flex items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            {i < steps - 1 && <Skeleton className="h-0.5 w-12 sm:w-20" />}
          </div>
        ))}
      </div>

      {/* Step title */}
      <div className="text-center">
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="mx-auto mt-2 h-4 w-64" />
      </div>

      {/* Form area */}
      <div className="mx-auto max-w-lg space-y-4 rounded-card border border-gray-200 bg-card p-6 shadow-card">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`field-${i}`} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        {/* Submit button */}
        <div className="flex justify-end pt-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
