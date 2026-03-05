"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import {
  Factory,
  ShareNetwork,
  Storefront,
  Truck,
  Warehouse,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { cn } from "../../lib/utils";

interface HeroProofPanelProps {
  locale: Locale;
  className?: string;
}

type IcpKey =
  | "logistics"
  | "transport"
  | "retail"
  | "networks"
  | "automotive";

type IconComponent = typeof Warehouse;

type PatternKind = "grid" | "route" | "bars" | "nodes" | "assembly";

const visualsByKey: Record<
  IcpKey,
  { tint: string; icon: IconComponent; pattern: PatternKind }
> = {
  logistics: { tint: "rgba(180,83,9,0.18)", icon: Warehouse, pattern: "grid" },
  transport: { tint: "rgba(15,23,42,0.16)", icon: Truck, pattern: "route" },
  retail: { tint: "rgba(180,83,9,0.14)", icon: Storefront, pattern: "bars" },
  networks: { tint: "rgba(15,23,42,0.14)", icon: ShareNetwork, pattern: "nodes" },
  automotive: { tint: "rgba(15,23,42,0.18)", icon: Factory, pattern: "assembly" },
};

const imageByKey: Partial<Record<IcpKey, { src: string; srcSet: string }>> = {
  logistics: {
    src: "/hero-section/logistics-1024.webp",
    srcSet:
      "/hero-section/logistics-512.webp 512w, /hero-section/logistics-1024.webp 1024w",
  },
  transport: {
    src: "/hero-section/transport-1024.webp",
    srcSet:
      "/hero-section/transport-512.webp 512w, /hero-section/transport-1024.webp 1024w",
  },
  retail: {
    src: "/hero-section/retail-1024.webp",
    srcSet:
      "/hero-section/retail-512.webp 512w, /hero-section/retail-1024.webp 1024w",
  },
  networks: {
    src: "/hero-section/networks-1024.webp",
    srcSet:
      "/hero-section/networks-512.webp 512w, /hero-section/networks-1024.webp 1024w",
  },
  automotive: {
    src: "/hero-section/automotive-1024.webp",
    srcSet:
      "/hero-section/automotive-512.webp 512w, /hero-section/automotive-1024.webp 1024w",
  },
};

function IcpPattern({ kind }: { kind: PatternKind }) {
  const stroke = "rgba(15,23,42,0.18)";
  const strokeStrong = "rgba(15,23,42,0.28)";

  if (kind === "route") {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <path
          d="M12 92C34 92 36 66 58 66c22 0 24 28 46 28"
          stroke={strokeStrong}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M16 92h0M30 92h0M44 82h0M58 66h0M72 76h0M86 92h0M100 92h0"
          stroke={stroke}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="0 16"
        />
      </svg>
    );
  }

  if (kind === "bars") {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <path
          d="M20 92V64M40 92V52M60 92V40M80 92V58M100 92V70"
          stroke={strokeStrong}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M18 94H104"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "nodes") {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <path
          d="M24 78l26-20 22 10 24-26"
          stroke={strokeStrong}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 78h0M50 58h0M72 68h0M96 42h0"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="0 30"
        />
      </svg>
    );
  }

  if (kind === "assembly") {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <path
          d="M16 44h88M16 66h88"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M22 54h16M46 54h16M70 54h16M94 54h10"
          stroke={strokeStrong}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M20 84h80"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
      <path
        d="M18 24h84M18 48h84M18 72h84M18 96h84"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M24 18v84M48 18v84M72 18v84M96 18v84"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

function IcpVisual({
  icon: Icon,
  pattern,
  image,
  priority,
}: {
  icon: IconComponent;
  pattern: PatternKind;
  image?: { src: string; srcSet: string };
  priority: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-3xl border border-neutral-300/95 bg-[linear-gradient(162deg,rgba(15,23,42,0.2),rgba(255,255,255,0.95)_42%,rgba(248,247,244,0.94))] shadow-[0_34px_64px_-38px_rgba(2,6,23,0.82),0_18px_26px_-20px_rgba(15,23,42,0.4)] sm:aspect-[4/3] sm:w-[11.75rem]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,var(--icp-tint),transparent_60%)]" />
      <div className="absolute inset-[0.35rem] rounded-[1.25rem] border border-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" />
      {image ? (
        <>
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes="(min-width: 1280px) 188px, (min-width: 1024px) 178px, (min-width: 640px) 188px, 92vw"
            width={1024}
            height={1024}
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className="absolute inset-[0.35rem] h-[calc(100%-0.7rem)] w-[calc(100%-0.7rem)] rounded-[1.15rem] object-cover transition-transform duration-300 [transition-timing-function:var(--ease-snappy)] group-hover:scale-[1.045]"
          />
          <div className="absolute inset-[0.35rem] rounded-[1.15rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(248,247,244,0.35)_42%,rgba(15,23,42,0.24))]" />
          <div className="absolute inset-[0.35rem] rounded-[1.15rem] shadow-[inset_0_-30px_40px_-30px_rgba(2,6,23,0.48)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 opacity-90 [mask-image:radial-gradient(70%_70%_at_50%_50%,black,transparent)]">
            <IcpPattern kind={pattern} />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.42))]" />
          <div className="absolute inset-0 grid place-items-center">
            <Icon
              size={36}
              weight="bold"
              className="text-navy-800 transition-transform duration-200 [transition-timing-function:var(--ease-snappy)] group-hover:-translate-y-0.5 group-hover:scale-[1.02]"
            />
          </div>
        </>
      )}
      <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
    </div>
  );
}

interface IcpCard {
  key: IcpKey;
  sector: string;
  title: string;
  benefit: string;
  situations: string[];
  decisions: string[];
  proof: string;
  href: string;
}

function normalizeIndex(value: number, length: number) {
  if (length <= 0) return 0;
  return ((value % length) + length) % length;
}

export function HeroProofPanel({ locale, className }: HeroProofPanelProps) {
  const isFr = locale === "fr";
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);

  const cards = useMemo<IcpCard[]>(
    () =>
      isFr
        ? [
            {
              key: "logistics",
              sector: "Logistique",
              title: "Praedixa pour la logistique",
              benefit: "Décider plus tôt avant rupture de service.",
              situations: [
                "Pics inbound/outbound",
                "Aléas de capacité et absentéisme",
                "Priorisation inter-sites",
              ],
              decisions: [
                "Renfort ciblé",
                "Renfort temporaire",
                "Réaffectation inter-sites",
              ],
              proof:
                "Preuve mensuelle baseline/recommandé/réel par site et semaine.",
              href: getLocalizedPath(locale, "bofuLogistics"),
            },
            {
              key: "transport",
              sector: "Transport",
              title: "Praedixa pour le transport",
              benefit: "Sécuriser la continuité de service sans dérive de coût.",
              situations: [
                "Pics localisés",
                "Choix OT / intérim / réaffectation",
                "Cohérence réseau multi-sites",
              ],
              decisions: [
                "Ajustement tournée",
                "Renfort temporaire",
                "Réallocation locale",
              ],
              proof:
                "Arbitrages horodatés avec impact coût, service et risque documenté.",
              href: getLocalizedPath(locale, "bofuTransport"),
            },
            {
              key: "retail",
              sector: "Retail",
              title: "Praedixa pour le retail",
              benefit: "Aligner service, coût et risque à l'échelle réseau.",
              situations: [
                "Saisonnalité et pics magasin",
                "Écarts capacité/charge",
                "Redéploiement entre sites",
              ],
              decisions: [
                "OT magasin",
                "Appui inter-magasins",
                "Ajustement amplitude service",
              ],
              proof:
                "Lecture mensuelle Ops/Finance consolidée, puis drilldown par magasin.",
              href: getLocalizedPath(locale, "bofuRetail"),
            },
            {
              key: "networks",
              sector: "Réseaux multi-sites",
              title: "Praedixa pour les réseaux multi-franchisés",
              benefit: "Uniformiser les arbitrages coût/service/risque dans le réseau.",
              situations: [
                "Pratiques hétérogènes entre sites",
                "Pics localisés",
                "Rituel mensuel Ops/Finance",
              ],
              decisions: [
                "Cadre de renfort harmonisé",
                "Renfort ponctuel standardisé",
                "Réaffectation entre unités",
              ],
              proof:
                "Decision Log unique pour comparer les sites sur une même méthode.",
              href: getLocalizedPath(locale, "bofuQsr"),
            },
            {
              key: "automotive",
              sector: "Automobile",
              title: "Praedixa pour l'automobile",
              benefit: "Anticiper les tensions opérationnelles en industrie multi-sites.",
              situations: [
                "Variabilité charge par équipe/site",
                "Arbitrage renfort inter-sites",
                "Coût vs continuité service",
              ],
              decisions: [
                "Renfort atelier ciblé",
                "Renfort temporaire",
                "Bascule inter-sites",
              ],
              proof:
                "Journal d'arbitrage lisible pour le pilotage production et finance.",
              href: getLocalizedPath(locale, "icpAutomotive"),
            },
          ]
        : [
            {
              key: "logistics",
              sector: "Logistics",
              title: "Praedixa for logistics",
              benefit: "Decide earlier before service disruption.",
              situations: [
                "Inbound/outbound peaks",
                "Capacity disruption and absenteeism",
                "Cross-site prioritization",
              ],
              decisions: [
                "Targeted overtime",
                "Short-term temporary reinforcement",
                "Cross-site reassignment",
              ],
              proof:
                "Monthly baseline/recommended/actual proof by site and week.",
              href: getLocalizedPath(locale, "bofuLogistics"),
            },
            {
              key: "transport",
              sector: "Transport",
              title: "Praedixa for transport",
              benefit: "Protect service continuity without cost drift.",
              situations: [
                "Localized demand peaks",
                "Overtime/interim/reassignment choices",
                "Consistent network decisions",
              ],
              decisions: [
                "Route-level adjustment",
                "Temporary reinforcement",
                "Local redeployment",
              ],
              proof:
                "Timestamped decisions with cost, service, and risk traceability.",
              href: getLocalizedPath(locale, "bofuTransport"),
            },
            {
              key: "retail",
              sector: "Retail",
              title: "Praedixa for retail",
              benefit: "Align service, cost, and risk at network scale.",
              situations: [
                "Seasonality and in-store peaks",
                "Capacity vs workload gaps",
                "Cross-site redeployment",
              ],
              decisions: [
                "Store-level overtime",
                "Cross-store reinforcement",
                "Service window adjustment",
              ],
              proof:
                "Monthly Ops/Finance view first, then store-level drilldown.",
              href: getLocalizedPath(locale, "bofuRetail"),
            },
            {
              key: "networks",
              sector: "Multi-site networks",
              title: "Praedixa for multi-franchise networks",
              benefit: "Standardize cost/service/risk trade-offs across the network.",
              situations: [
                "Heterogeneous site practices",
                "Localized peaks",
                "Monthly Ops/Finance governance",
              ],
              decisions: [
                "Harmonized overtime rules",
                "Standardized temporary reinforcement",
                "Cross-unit reassignment",
              ],
              proof:
                "One Decision Log framework to compare every site consistently.",
              href: getLocalizedPath(locale, "bofuQsr"),
            },
            {
              key: "automotive",
              sector: "Automotive",
              title: "Praedixa for automotive",
              benefit: "Anticipate operational tension in multi-site operations.",
              situations: [
                "Workload variability by team/site",
                "Cross-site reinforcement arbitration",
                "Cost vs continuity",
              ],
              decisions: [
                "Targeted workshop overtime",
                "Temporary reinforcement",
                "Cross-site shift",
              ],
              proof:
                "Decision trace built for production and finance governance.",
              href: getLocalizedPath(locale, "icpAutomotive"),
            },
          ],
    [isFr, locale],
  );

  const total = cards.length;
  const safeIndex = normalizeIndex(activeIndex, total);
  const activeCard = cards[safeIndex];
  const hasMultiple = total > 1;

  const switchTo = (nextIndex: number) => {
    if (!hasMultiple) return;
    const normalized = normalizeIndex(nextIndex, total);
    if (normalized === safeIndex) return;
    setDirection(normalized > safeIndex ? 1 : -1);
    setActiveIndex(normalized);
  };

  const switchNext = () => {
    if (!hasMultiple) return;
    setDirection(1);
    setActiveIndex((prev) => normalizeIndex(prev + 1, total));
  };

  const switchPrev = () => {
    if (!hasMultiple) return;
    setDirection(-1);
    setActiveIndex((prev) => normalizeIndex(prev - 1, total));
  };

  if (!activeCard) return null;
  const activeVisual = visualsByKey[activeCard.key];
  const ActiveIcon = activeVisual.icon;
  const activeImage = imageByKey[activeCard.key];
  const cardStyle = { ["--icp-tint"]: activeVisual.tint } as CSSProperties;
  const activeTabId = `hero-icp-tab-${activeCard.key}`;
  const activePanelId = `hero-icp-panel-${activeCard.key}`;

  const copy = isFr
    ? {
        panelTitle: "Sélecteur ICP",
        selectorLabel: "Sélecteur ICP",
        carouselLabel: "Carte ICP",
        cardTag: "Solution ICP",
        situationsTitle: "Situations traitées",
        decisionsTitle: "Décisions couvertes",
        openLabel: "Ouvrir la solution",
        clickableLabel: "Carte 100% cliquable",
      }
    : {
        panelTitle: "ICP selector",
        selectorLabel: "ICP selector",
        carouselLabel: "ICP card",
        cardTag: "ICP solution",
        situationsTitle: "Handled situations",
        decisionsTitle: "Covered decisions",
        openLabel: "Open solution",
        clickableLabel: "100% clickable card",
      };

  const motionTransition = reducedMotion
    ? ({ duration: 0 } as const)
    : ({ type: "spring", stiffness: 220, damping: 26, mass: 0.9 } as const);

  return (
    <aside className={cn("relative w-full max-w-[29rem] lg:max-w-none", className)}>
      <div className="relative overflow-hidden rounded-[2rem] border border-neutral-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,247,244,0.94))] shadow-[0_28px_60px_-44px_rgba(2,6,23,0.58)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_85%_15%,black,transparent)]">
          <div className="absolute -top-16 right-[-8rem] h-[16rem] w-[16rem] rounded-full bg-[radial-gradient(circle_at_center,var(--navy-100),transparent_65%)] blur-2xl" />
        </div>

        <div className="relative p-5 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            {isFr ? "Praedixa pour votre contexte" : "Praedixa for your context"}
          </p>
          <h3 className="mt-1 text-[1.35rem] font-semibold leading-[1.05] tracking-tight text-ink">
            {copy.panelTitle}
          </h3>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-neutral-200/90 bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {safeIndex + 1}/{total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={switchPrev}
                disabled={!hasMultiple}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-ink transition-all duration-200",
                  hasMultiple
                    ? "border-neutral-300/90 hover:bg-neutral-50 active:scale-[0.98]"
                    : "cursor-not-allowed border-neutral-200/70 opacity-45",
                )}
                aria-label={isFr ? "ICP précédente" : "Previous ICP"}
              >
                <ArrowLeft size={14} weight="bold" />
              </button>
              <button
                type="button"
                onClick={switchNext}
                disabled={!hasMultiple}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-ink transition-all duration-200",
                  hasMultiple
                    ? "border-neutral-300/90 hover:bg-neutral-50 active:scale-[0.98]"
                    : "cursor-not-allowed border-neutral-200/70 opacity-45",
                )}
                aria-label={isFr ? "ICP suivante" : "Next ICP"}
              >
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>
          </div>

          <div
            className="mt-2.5 flex shrink-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={copy.selectorLabel}
            role="tablist"
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                switchNext();
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                switchPrev();
              }
            }}
          >
            {cards.map((card, index) => {
              const isActive = index === safeIndex;
              const Icon = visualsByKey[card.key].icon;
              const tabId = `hero-icp-tab-${card.key}`;
              const panelId = `hero-icp-panel-${card.key}`;
              return (
                <button
                  key={card.key}
                  type="button"
                  id={tabId}
                  onClick={() => switchTo(index)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:outline-none",
                    isActive
                      ? "border-neutral-300 bg-neutral-900 text-white shadow-[0_16px_30px_-24px_rgba(2,6,23,0.9)]"
                      : "border-neutral-200/90 bg-white/80 text-neutral-700 hover:bg-white hover:text-ink",
                  )}
                  role="tab"
                  aria-controls={panelId}
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                >
                  <Icon
                    size={14}
                    weight="bold"
                    className={cn(
                      "shrink-0",
                      isActive ? "text-amber-200" : "text-neutral-500",
                    )}
                    aria-hidden="true"
                  />
                  {card.sector}
                </button>
              );
            })}
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label={copy.carouselLabel}
            className="mt-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
            onPointerDown={(event) => {
              if (!hasMultiple) return;
              if (event.pointerType === "mouse") return;
              suppressNextClick.current = false;
              swipeStart.current = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!hasMultiple) return;
              if (event.pointerType === "mouse") return;
              const start = swipeStart.current;
              if (!start) return;

              const deltaX = event.clientX - start.x;
              const deltaY = event.clientY - start.y;
              if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
                suppressNextClick.current = true;
              }
            }}
            onPointerUp={(event) => {
              if (!hasMultiple) return;
              if (event.pointerType === "mouse") return;
              const start = swipeStart.current;
              swipeStart.current = null;
              if (!start) return;

              const deltaX = event.clientX - start.x;
              if (Math.abs(deltaX) < 52) return;
              suppressNextClick.current = true;
              if (deltaX < 0) {
                switchNext();
              } else {
                switchPrev();
              }
            }}
            onPointerCancel={() => {
              swipeStart.current = null;
              suppressNextClick.current = false;
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                switchNext();
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                switchPrev();
              }
            }}
          >
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={activeCard.key}
                custom={direction}
                id={activePanelId}
                role="tabpanel"
                aria-labelledby={activeTabId}
                initial={
                  reducedMotion
                    ? { opacity: 1 }
                    : { opacity: 0, x: direction > 0 ? 18 : -18 }
                }
                animate={{ opacity: 1, x: 0 }}
                exit={
                  reducedMotion
                    ? { opacity: 1 }
                    : { opacity: 0, x: direction > 0 ? -18 : 18 }
                }
                transition={motionTransition}
              >
                <Link
                  href={activeCard.href}
                  style={cardStyle}
                  className="group relative block overflow-hidden rounded-3xl border border-neutral-200/90 bg-[linear-gradient(145deg,rgba(15,23,42,0.12),rgba(255,255,255,0.96)_42%,var(--icp-tint)_100%)] p-3.5 no-underline shadow-[0_28px_56px_-42px_rgba(2,6,23,0.62)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_34px_64px_-48px_rgba(2,6,23,0.68)] active:translate-y-0 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:outline-none"
                  onClick={(event) => {
                    if (suppressNextClick.current) {
                      event.preventDefault();
                      event.stopPropagation();
                      suppressNextClick.current = false;
                    }
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(70%_70%_at_80%_18%,black,transparent)]"
                  >
                    <div className="absolute -top-20 right-[-6rem] h-[16rem] w-[16rem] rounded-full bg-[radial-gradient(circle_at_center,var(--navy-100),transparent_65%)] blur-2xl" />
                  </div>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-16 -right-16 opacity-[0.06]"
                  >
                    <ActiveIcon size={260} weight="duotone" className="text-navy-900" />
                  </div>

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-neutral-200/90 bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
                          {copy.cardTag}
                        </span>
                        <span className="rounded-full border border-neutral-200/90 bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
                          {activeCard.sector}
                        </span>
                        <span className="rounded-full border border-neutral-200/90 bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
                          J+3 / J+7 / J+14
                        </span>
                      </div>

                      <ArrowUpRight
                        size={16}
                        weight="bold"
                        className="shrink-0 text-neutral-500 transition-transform duration-200 [transition-timing-function:var(--ease-snappy)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-navy-700"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_11.75rem] sm:items-start">
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold leading-tight tracking-tight text-ink">
                          {activeCard.title}
                        </h4>
                        <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">
                          {activeCard.benefit}
                        </p>
                      </div>

                      <IcpVisual
                        icon={ActiveIcon}
                        pattern={activeVisual.pattern}
                        image={activeImage}
                        priority={safeIndex === 0}
                      />
                    </div>

                    <div className="mt-2 rounded-2xl border border-neutral-200/90 bg-white/72 p-2.5">
                      <div className="grid gap-2.5 md:grid-cols-2 md:gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            {copy.situationsTitle}
                          </p>
                          <ul className="mt-1.5 list-none space-y-1 p-0">
                            {activeCard.situations.slice(0, 2).map((situation) => (
                              <li
                                key={situation}
                                className="m-0 flex items-start gap-1.5 text-[13px] leading-snug text-neutral-700"
                              >
                                <span
                                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500"
                                  aria-hidden="true"
                                />
                                <span className="min-w-0">{situation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            {copy.decisionsTitle}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {activeCard.decisions.slice(0, 2).map((decision) => (
                              <span
                                key={decision}
                                className="rounded-full border border-neutral-200/90 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-700"
                              >
                                {decision}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 border-t border-neutral-200/80 pt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          {isFr ? "Preuve & gouvernance" : "Proof & governance"}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-neutral-600">
                          {activeCard.proof}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200/90 bg-white/80 px-3 py-2">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-neutral-300/90 bg-white px-3 py-1 text-[11px] font-semibold text-ink shadow-[0_18px_30px_-26px_rgba(2,6,23,0.55)] transition-all duration-200 group-hover:border-neutral-400">
                        {copy.openLabel}
                        <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-500 sm:ml-auto">
                        {copy.clickableLabel}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </aside>
  );
}
