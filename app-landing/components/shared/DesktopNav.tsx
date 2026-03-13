"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CaretDown } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getNavGroups } from "../../lib/nav-config";

interface DesktopNavProps {
  locale: Locale;
}

export function DesktopNav({ locale }: DesktopNavProps) {
  const pathname = usePathname();
  const navGroups = useMemo(() => getNavGroups(locale), [locale]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenKey(null);
    }, 90);
  };

  useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(event.target as Node)) {
        setOpenKey(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenKey(null);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onKeyDown);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const labelMainNav =
    locale === "fr" ? "Navigation principale" : "Main navigation";

  return (
    <nav
      ref={rootRef}
      className="hidden flex-1 justify-center lg:flex"
      aria-label={labelMainNav}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!event.currentTarget.contains(nextTarget)) {
          setOpenKey(null);
        }
      }}
    >
      <ul className="flex items-center gap-0.5 rounded-full border border-neutral-200 bg-white p-1 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.72)]">
        {navGroups.map((group) => {
          const menuItems = group.items ?? [];
          const hasMenu = menuItems.length > 0;
          const isOpen = openKey === group.key;
          const menuMeta = group.menu;
          const panelCols =
            menuMeta?.columns === 2
              ? "sm:grid-cols-2 sm:auto-rows-fr"
              : "grid-cols-1";
          const panelWidth =
            menuMeta?.panelWidth === "lg" ? "w-[44rem]" : "w-[36rem]";
          const panelPosition =
            group.key === "product"
              ? "left-0 translate-x-0"
              : group.key === "company"
                ? "right-0 translate-x-0"
                : "left-1/2 -translate-x-1/2";

          return (
            <li
              key={group.key}
              className="relative"
              onMouseEnter={() => {
                if (hasMenu) {
                  clearCloseTimer();
                  setOpenKey(group.key);
                }
              }}
              onMouseLeave={() => {
                if (hasMenu) {
                  scheduleClose();
                }
              }}
            >
              {hasMenu ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:bg-neutral-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-navy-300 focus-visible:outline-none"
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  aria-controls={`desktop-menu-${group.key}`}
                  onFocus={() => {
                    clearCloseTimer();
                    setOpenKey(group.key);
                  }}
                  onClick={() => {
                    clearCloseTimer();
                    setOpenKey(isOpen ? null : group.key);
                  }}
                >
                  {group.label}
                  <CaretDown
                    size={11}
                    weight="bold"
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
              ) : (
                <Link
                  href={group.href ?? `/${locale}`}
                  className="inline-flex rounded-full px-3 py-1.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 no-underline transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:bg-neutral-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-navy-300 focus-visible:outline-none"
                >
                  {group.label}
                </Link>
              )}

              {hasMenu && isOpen ? (
                <div
                  id={`desktop-menu-${group.key}`}
                  className={`absolute top-[calc(100%+0.6rem)] z-40 ${panelPosition} ${panelWidth} max-w-[calc(100vw-2rem)] rounded-[1.6rem] border border-neutral-200 bg-white p-3.5 shadow-[0_34px_70px_-44px_rgba(2,6,23,0.76)]`}
                  onMouseEnter={clearCloseTimer}
                  onMouseLeave={scheduleClose}
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(13rem,14.5rem)_1fr]">
                    {menuMeta ? (
                      <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                          {menuMeta.kicker}
                        </p>
                        <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                          {menuMeta.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
                          {menuMeta.description}
                        </p>
                        {menuMeta.ctaLabel && menuMeta.ctaHref ? (
                          <Link
                            href={menuMeta.ctaHref}
                            className="mt-4 inline-flex w-fit items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink no-underline transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:border-neutral-400 hover:bg-neutral-100 active:translate-y-[1px] active:scale-[0.98]"
                          >
                            {menuMeta.ctaLabel}
                            <ArrowUpRight size={12} weight="bold" />
                          </Link>
                        ) : null}
                      </div>
                    ) : null}

                    <ul className={`grid content-start gap-1.5 ${panelCols}`}>
                      {menuItems.map((item) => (
                        <li key={item.href} className="m-0 h-full">
                          <Link
                            href={item.href}
                            className={`group flex h-full flex-col justify-between rounded-xl border px-3 py-3 no-underline transition-all duration-200 [transition-timing-function:var(--ease-snappy)] ${
                              item.primary
                                ? "border-navy-200 bg-navy-50 text-ink hover:border-navy-300 hover:bg-navy-100"
                                : "border-transparent text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50"
                            }`}
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className="block text-sm font-semibold tracking-[-0.01em]">
                                {item.label}
                              </span>
                              <ArrowUpRight
                                size={13}
                                weight="bold"
                                className={`mt-0.5 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
                                  item.primary
                                    ? "text-navy-700"
                                    : "text-neutral-400"
                                }`}
                              />
                            </span>
                            {item.description ? (
                              <span className="mt-1 block text-xs leading-relaxed text-neutral-500">
                                {item.description}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
