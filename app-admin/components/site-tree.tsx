"use client";

import { useCallback, useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Users } from "lucide-react";
import { cn } from "@praedixa/ui";
import type { SiteHierarchy } from "@/app/(admin)/clients/[orgId]/client-context";

const STORAGE_KEY = "praedixa-expanded-sites";

function loadExpanded(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveExpanded(ids: Set<string>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage full — ignore */
  }
}

interface SiteTreeProps {
  hierarchy: SiteHierarchy[];
  selectedSiteId: string | null;
  onSelectSite: (siteId: string | null) => void;
}

export function SiteTree({
  hierarchy,
  selectedSiteId,
  onSelectSite,
}: SiteTreeProps) {
  const [expandedSites, setExpandedSites] = useState<Set<string>>(loadExpanded);

  const toggleExpand = useCallback((siteId: string) => {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      saveExpanded(next);
      return next;
    });
  }, []);

  return (
    <div className="space-y-1">
      <button
        onClick={() => onSelectSite(null)}
        className={cn(
          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
          selectedSiteId === null
            ? "bg-primary-50 font-medium text-primary-700"
            : "text-ink-secondary hover:bg-surface-sunken",
        )}
      >
        Tous les sites
      </button>

      {hierarchy.map((site) => {
        const isExpanded = expandedSites.has(site.id);
        const isSelected = selectedSiteId === site.id;

        return (
          <div key={site.id}>
            <div className="flex items-center">
              <button
                onClick={() => toggleExpand(site.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center text-ink-placeholder hover:text-ink-secondary"
                aria-label={isExpanded ? "Replier" : "Deplier"}
              >
                {site.departments.length > 0 &&
                  (isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ))}
              </button>
              <button
                onClick={() => onSelectSite(site.id)}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  isSelected
                    ? "bg-primary-50 font-medium text-primary-700"
                    : "text-ink-secondary hover:bg-surface-sunken",
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-placeholder" />
                <span className="truncate">{site.name}</span>
                {site.city && (
                  <span className="truncate text-xs text-ink-placeholder">
                    {site.city}
                  </span>
                )}
              </button>
            </div>

            {isExpanded &&
              site.departments.map((dept) => (
                <div
                  key={dept.id}
                  className="ml-9 flex items-center gap-2 px-2 py-1 text-xs text-ink-tertiary"
                >
                  <Users className="h-3 w-3 shrink-0" />
                  <span className="truncate">{dept.name}</span>
                  <span className="ml-auto shrink-0 text-ink-placeholder">
                    {dept.employeeCount}
                  </span>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
