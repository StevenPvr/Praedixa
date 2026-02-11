"use client";

import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@praedixa/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  completed: boolean;
}

interface OnboardingChecklistProps {
  className?: string;
  items: ChecklistItem[];
}

export function OnboardingChecklist({
  className,
  items,
}: OnboardingChecklistProps) {
  const completedCount = items.filter((i) => i.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <Card
      className={cn("overflow-hidden", className)}
      variant="elevated"
      noPadding
    >
      <div className="bg-primary/5 p-6 border-b border-primary/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-lg font-bold text-ink">
            Bienvenue sur Praedixa
          </h3>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {progress}% complété
          </span>
        </div>
        <p className="text-sm text-ink-secondary mb-4 max-w-lg">
          Suivez ces étapes pour configurer votre environnement et obtenir vos
          premières prévisions.
        </p>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/50">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group flex items-center justify-between p-4 transition-colors hover:bg-gray-50",
              item.completed ? "opacity-75" : "opacity-100",
            )}
          >
            <div className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  item.completed
                    ? "text-ink-secondary line-through"
                    : "text-ink",
                )}
              >
                {item.label}
              </span>
            </div>
            {!item.completed && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1 text-primary hover:text-primary-dark"
              >
                <Link href={item.href}>
                  Commencer <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
