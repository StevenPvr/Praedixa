"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDown, List, X } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getNavGroups } from "../../lib/nav-config";
import { CalendlyExpertLink } from "./CalendlyExpertLink";

interface MobileNavProps {
  locale: Locale;
  primaryCtaHref: string;
  primaryCtaLabel: string;
  secondaryCtaHref: string;
  secondaryCtaLabel: string;
  calendlyExpertLabel: string;
}

export function MobileNav({
  locale,
  primaryCtaHref,
  primaryCtaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
  calendlyExpertLabel,
}: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const navGroups = useMemo(() => getNavGroups(locale), [locale]);
  const otherLocale = locale === "fr" ? "en" : "fr";
  const localeLabel = otherLocale.toUpperCase();
  const localeSwitchLabel =
    locale === "fr" ? "Switch to English" : "Passer en français";

  useEffect(() => {
    setOpen(false);
    setExpandedKey(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      setExpandedKey(null);
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="hdr-hamburger relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink shadow-[0_10px_20px_-16px_rgba(2,6,23,0.8)] transition-all duration-300 hover:border-neutral-300 hover:bg-neutral-50 lg:hidden"
        aria-label={
          locale === "fr"
            ? open
              ? "Fermer le menu"
              : "Ouvrir le menu"
            : open
              ? "Close menu"
              : "Open menu"
        }
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
      >
        {open ? (
          <X size={22} weight="bold" />
        ) : (
          <List size={22} weight="bold" />
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-neutral-900 lg:hidden"
            style={{ paddingTop: "calc(var(--header-h) + 0.75rem)" }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
          >
            <motion.nav
              id="mobile-nav-panel"
              role="dialog"
              aria-modal="true"
              initial={{ y: -12, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="mx-4 max-h-[calc(100dvh-var(--header-h)-1.75rem)] overflow-y-auto rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-[0_26px_60px_-34px_rgba(2,6,23,0.95)]"
            >
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  {locale === "fr" ? "Navigation" : "Navigation"}
                </p>
                <Link
                  href={`/${otherLocale}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600 transition-colors duration-200 hover:bg-neutral-50 hover:text-ink"
                  aria-label={localeSwitchLabel}
                >
                  {localeLabel}
                </Link>
              </div>

              <div className="space-y-2">
                {navGroups.map((group) => {
                  const menuItems = group.items ?? [];
                  const hasChildren = menuItems.length > 0;
                  const isExpanded = expandedKey === group.key;
                  const menuMeta = group.menu;

                  if (!hasChildren) {
                    return (
                      <Link
                        key={group.key}
                        href={group.href ?? `/${locale}`}
                        className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-base font-medium text-ink no-underline transition-colors duration-200 hover:border-neutral-200 hover:bg-neutral-50"
                      >
                        {group.label}
                      </Link>
                    );
                  }

                  return (
                    <section
                      key={group.key}
                      className="rounded-xl border border-neutral-200 bg-white"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedKey((prev) =>
                            prev === group.key ? null : group.key,
                          )
                        }
                        className="flex w-full items-center justify-between px-3 py-3 text-left text-base font-medium text-ink"
                        aria-expanded={isExpanded}
                        aria-controls={`mobile-group-${group.key}`}
                      >
                        {group.label}
                        <CaretDown
                          size={16}
                          weight="bold"
                          className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isExpanded ? (
                          <motion.div
                            id={`mobile-group-${group.key}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-neutral-200"
                          >
                            <div className="space-y-3 p-3">
                              {menuMeta ? (
                                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                                    {menuMeta.kicker}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold tracking-[-0.01em] text-ink">
                                    {menuMeta.title}
                                  </p>
                                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                                    {menuMeta.description}
                                  </p>
                                </div>
                              ) : null}
                              <ul className="list-none space-y-1">
                                {menuItems.map((item) => (
                                  <li key={item.href} className="m-0">
                                    <Link
                                      href={item.href}
                                      className={`block rounded-lg border px-3 py-2 text-sm no-underline transition-colors duration-200 ${
                                        item.primary
                                          ? "border-proof-100 bg-proof-100 text-ink"
                                          : "border-transparent text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50"
                                      }`}
                                    >
                                      <span className="block font-medium">
                                        {item.label}
                                      </span>
                                      {item.description ? (
                                        <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">
                                          {item.description}
                                        </span>
                                      ) : null}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </section>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4">
                <Link
                  href={primaryCtaHref}
                  className="btn-primary-gradient flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 active:translate-y-[1px] active:scale-[0.98]"
                >
                  {primaryCtaLabel}
                </Link>
                <Link
                  href={secondaryCtaHref}
                  className="flex w-full items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-ink no-underline transition-colors duration-200 hover:bg-neutral-50"
                >
                  {secondaryCtaLabel}
                </Link>
                <CalendlyExpertLink
                  locale={locale}
                  label={calendlyExpertLabel}
                  className="flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-3 text-sm font-semibold text-ink no-underline transition-colors duration-200 hover:border-neutral-300 hover:bg-neutral-100"
                />
              </div>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
