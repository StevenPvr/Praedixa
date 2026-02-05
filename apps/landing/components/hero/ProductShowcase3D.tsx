"use client";

import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type MotionValue,
  useMotionValue,
} from "framer-motion";
import { useRef, useState, useCallback } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useMouseTilt } from "../../hooks/useMouseTilt";
import { springConfig, easingCurves } from "../../lib/animations/config";
import { useMediaQuery } from "@praedixa/ui";

/**
 * Premium color palette with depth
 */
const colors = {
  bg: "rgb(8, 9, 10)",
  bgCard: "rgba(18, 18, 20, 0.98)",
  bgCardHover: "rgba(25, 25, 28, 0.98)",
  border: "rgba(255, 255, 255, 0.08)",
  borderHover: "rgba(255, 255, 255, 0.15)",
  borderSubtle: "rgba(255, 255, 255, 0.04)",
  text: "rgb(247, 248, 248)",
  textMuted: "rgb(140, 140, 145)",
  textSubtle: "rgb(90, 90, 95)",
  accent: "rgb(99, 102, 241)",
  accentGlow: "rgba(99, 102, 241, 0.4)",
  accentMuted: "rgba(99, 102, 241, 0.15)",
  amber: "rgb(251, 191, 36)",
  amberGlow: "rgba(251, 191, 36, 0.3)",
  green: "rgb(52, 211, 153)",
  greenGlow: "rgba(52, 211, 153, 0.3)",
};

/**
 * Hook to create smooth spring-based scroll values
 */
function useSmoothTransform(
  scrollProgress: MotionValue<number>,
  inputRange: [number, number],
  outputRange: [number, number],
) {
  const transform = useTransform(scrollProgress, inputRange, outputRange);
  return useSpring(transform, springConfig.ultraSmooth);
}

/**
 * Hook to combine two motion values
 */
function useCombinedMotionValue(
  scrollValue: MotionValue<number>,
  mouseValue: MotionValue<number>,
): MotionValue<number> {
  return useTransform([scrollValue, mouseValue], ([scroll, mouse]) => {
    return (scroll as number) + (mouse as number);
  });
}

/**
 * Interactive Card with hover effects and glow
 */
function InteractiveCard({
  children,
  className = "",
  glowColor = colors.accent,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  delay?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY],
  );

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.6,
        ease: easingCurves.smoothOut,
      }}
      style={{
        background: isHovered
          ? colors.bgCardHover
          : "rgba(255, 255, 255, 0.03)",
        border: `1px solid ${isHovered ? colors.borderHover : colors.borderSubtle}`,
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
      whileHover={{
        y: -2,
        transition: { duration: 0.2 },
      }}
    >
      {/* Spotlight effect following mouse */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 0.6 : 0,
          background: `radial-gradient(300px circle at ${mouseX.get()}px ${mouseY.get()}px, ${glowColor}15, transparent 60%)`,
        }}
      />

      {/* Border glow on hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          opacity: isHovered ? 1 : 0,
          boxShadow: `inset 0 0 20px ${glowColor}10`,
          transition: "opacity 0.3s ease",
        }}
      />

      {children}
    </motion.div>
  );
}

/**
 * Premium 3D Product showcase
 */
export default function ProductShowcase3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  // Disable expensive effects on mobile/tablet for better performance
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const {
    ref: mouseTiltRef,
    rotateX: mouseRotateX,
    rotateY: mouseRotateY,
  } = useMouseTilt({
    maxRotation: 8,
    springConfig: { stiffness: 80, damping: 30, mass: 1 },
    // Disable mouse tilt on mobile (no mouse) and when reduced motion is preferred
    disabled: prefersReducedMotion || !isDesktop,
  });

  // Deep 3D perspective - like looking down at a desk
  const scrollRotateX = useSmoothTransform(scrollYProgress, [0, 0.5], [45, 0]);
  const scrollRotateY = useSmoothTransform(scrollYProgress, [0, 0.5], [12, 0]);
  const y = useSmoothTransform(scrollYProgress, [0, 1], [0, -120]);
  const scale = useSmoothTransform(scrollYProgress, [0, 0.5], [0.85, 1]);

  if (prefersReducedMotion) {
    return <StaticShowcase />;
  }

  return (
    <div
      ref={(el) => {
        (
          containerRef as React.MutableRefObject<HTMLDivElement | null>
        ).current = el;
        mouseTiltRef(el);
      }}
      className="relative w-full cursor-default"
      style={{
        // Reduced perspective = more dramatic 3D depth
        perspective: "1200px",
        perspectiveOrigin: "center 30%",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main dashboard frame */}
      <motion.div
        className="relative mx-auto"
        style={{
          y,
          rotateX: useCombinedMotionValue(scrollRotateX, mouseRotateX),
          rotateY: useCombinedMotionValue(scrollRotateY, mouseRotateY),
          scale,
          transformStyle: "preserve-3d",
          transformOrigin: "center top",
          width: "100%",
          maxWidth: "1100px",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 1.2,
          delay: 0.3,
          ease: easingCurves.smoothOut,
        }}
      >
        <DashboardFrame />
      </motion.div>

      {/* Secondary panel */}
      <SecondaryPanel
        scrollYProgress={scrollYProgress}
        mouseRotateX={mouseRotateX}
        mouseRotateY={mouseRotateY}
      />
    </div>
  );
}

/**
 * Main dashboard frame with premium styling
 */
function DashboardFrame() {
  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: colors.bgCard,
        border: `1px solid ${colors.border}`,
        // Enhanced shadows for deep 3D effect
        boxShadow: `
          0 0 0 1px ${colors.borderSubtle},
          0 25px 50px -20px rgba(0, 0, 0, 0.25),
          0 10px 20px -10px rgba(0, 0, 0, 0.15)
        `,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Subtle top highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 50%, transparent)",
        }}
      />

      {/* Window chrome */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(0, 0, 0, 0.4)",
          borderBottom: `1px solid ${colors.borderSubtle}`,
        }}
      >
        <div className="flex gap-2">
          <motion.div
            className="w-3 h-3 rounded-full cursor-pointer"
            style={{ background: "rgb(255,95,86)" }}
            whileHover={{ scale: 1.2, boxShadow: "0 0 10px rgb(255,95,86)" }}
          />
          <motion.div
            className="w-3 h-3 rounded-full cursor-pointer"
            style={{ background: "rgb(255,189,46)" }}
            whileHover={{ scale: 1.2, boxShadow: "0 0 10px rgb(255,189,46)" }}
          />
          <motion.div
            className="w-3 h-3 rounded-full cursor-pointer"
            style={{ background: "rgb(39,201,63)" }}
            whileHover={{ scale: 1.2, boxShadow: "0 0 10px rgb(39,201,63)" }}
          />
        </div>
        <div className="flex-1 flex justify-center">
          <motion.div
            className="px-4 py-1 rounded-md text-xs font-mono cursor-pointer"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: colors.textSubtle,
            }}
            whileHover={{
              background: "rgba(255, 255, 255, 0.1)",
              color: colors.textMuted,
            }}
          >
            praedixa.app/dashboard
          </motion.div>
        </div>
        <div className="w-16" />
      </div>

      {/* Dashboard content */}
      <div className="flex" style={{ minHeight: "480px" }}>
        <Sidebar />
        <div className="flex-1 p-5">
          <MainContent />
        </div>
      </div>

      {/* Bottom reflection */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.3), transparent)",
        }}
      />
    </motion.div>
  );
}

/**
 * Sidebar with hover effects
 */
function Sidebar() {
  const menuItems = [
    { icon: "◻", label: "Dashboard", active: true },
    { icon: "⊞", label: "Équipes", active: false },
    { icon: "◈", label: "Prédictions", active: false },
    { icon: "▤", label: "Rapports", active: false },
    { icon: "⚙", label: "Paramètres", active: false },
  ];

  return (
    <div
      className="w-52 p-4 flex flex-col"
      style={{
        background: "rgba(0, 0, 0, 0.25)",
        borderRight: `1px solid ${colors.borderSubtle}`,
      }}
    >
      {/* Logo */}
      <motion.div
        className="flex items-center gap-3 mb-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.6, ease: easingCurves.smoothOut }}
      >
        <motion.div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
          style={{
            background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
            boxShadow: `0 4px 15px ${colors.accentGlow}`,
          }}
          whileHover={{
            scale: 1.1,
            boxShadow: `0 6px 25px ${colors.accentGlow}`,
          }}
        >
          P
        </motion.div>
        <span style={{ color: colors.text, fontWeight: 600, fontSize: "14px" }}>
          Praedixa
        </span>
      </motion.div>

      {/* Menu */}
      <nav className="space-y-0.5">
        {menuItems.map((item, i) => (
          <motion.div
            key={item.label}
            className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
            style={{
              background: item.active ? colors.accentMuted : "transparent",
              color: item.active ? colors.text : colors.textMuted,
              fontSize: "13px",
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.7 + i * 0.06,
              duration: 0.5,
              ease: easingCurves.smoothOut,
            }}
            whileHover={{
              background: item.active
                ? colors.accentMuted
                : "rgba(255, 255, 255, 0.05)",
              x: 4,
            }}
          >
            <span className="text-xs opacity-60">{item.icon}</span>
            <span>{item.label}</span>
            {item.active && (
              <motion.div
                className="ml-auto w-1.5 h-1.5 rounded-full"
                style={{ background: colors.accent }}
                animate={{
                  boxShadow: [
                    `0 0 5px ${colors.accentGlow}`,
                    `0 0 15px ${colors.accentGlow}`,
                    `0 0 5px ${colors.accentGlow}`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        ))}
      </nav>

      {/* User */}
      <div
        className="mt-auto pt-3"
        style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
      >
        <motion.div
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          whileHover={{ background: "rgba(255, 255, 255, 0.05)" }}
        >
          <div
            className="w-6 h-6 rounded-full"
            style={{
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))",
            }}
          />
          <div>
            <div className="text-xs" style={{ color: colors.text }}>
              Admin
            </div>
            <div className="text-[10px]" style={{ color: colors.textSubtle }}>
              admin@company.fr
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Main content with interactive KPIs
 */
function MainContent() {
  const kpis = [
    {
      label: "Écart prévu",
      value: "-4.2",
      change: "ETP",
      positive: false,
      color: colors.amber,
    },
    {
      label: "Absences",
      value: "12",
      change: "prévues",
      positive: false,
      color: colors.accent,
    },
    {
      label: "Turnover",
      value: "3",
      change: "départs",
      positive: false,
      color: colors.accent,
    },
    {
      label: "Coût évité",
      value: "8.2K€",
      change: "ce mois",
      positive: true,
      color: colors.green,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5, ease: easingCurves.smoothOut }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
            Écart capacité / demande
          </h2>
          <p className="text-xs mt-0.5" style={{ color: colors.textSubtle }}>
            Absences + turnover + charge agrégés
          </p>
        </div>
        <motion.div
          className="px-3 py-1.5 rounded-md text-xs cursor-pointer"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: `1px solid ${colors.border}`,
            color: colors.textMuted,
          }}
          whileHover={{
            background: "rgba(255, 255, 255, 0.1)",
            borderColor: colors.borderHover,
          }}
        >
          7 derniers jours ▾
        </motion.div>
      </motion.div>

      {/* KPI Cards - Interactive */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <InteractiveCard
            key={kpi.label}
            className="p-3 rounded-lg"
            glowColor={kpi.color}
            delay={0.9 + i * 0.08}
          >
            <div
              className="text-[10px] mb-1.5"
              style={{ color: colors.textSubtle }}
            >
              {kpi.label}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-xl font-semibold"
                style={{ color: colors.text }}
              >
                {kpi.value}
              </span>
              <motion.span
                className="text-[10px] font-medium"
                style={{
                  color: kpi.positive ? colors.green : "rgb(248, 113, 113)",
                }}
                animate={{
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {kpi.change}
              </motion.span>
            </div>
            {/* Mini sparkline */}
            <div className="flex items-end gap-px mt-2 h-4">
              {[40, 60, 45, 70, 55, 80, 65].map((h, idx) => (
                <motion.div
                  key={idx}
                  className="flex-1 rounded-sm"
                  style={{ background: `${kpi.color}40` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{
                    delay: 1.2 + i * 0.08 + idx * 0.03,
                    duration: 0.4,
                  }}
                />
              ))}
            </div>
          </InteractiveCard>
        ))}
      </div>

      {/* Chart area - Interactive */}
      <InteractiveCard
        className="rounded-lg p-4"
        glowColor={colors.accent}
        delay={1.2}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium" style={{ color: colors.text }}>
            Écart capacité prévu
          </span>
          <div
            className="flex gap-3 text-[10px]"
            style={{ color: colors.textSubtle }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: colors.accent }}
              />
              Prévu
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "rgba(255, 255, 255, 0.3)" }}
              />
              Réel
            </span>
          </div>
        </div>

        {/* Chart bars with hover effects */}
        <div className="h-28 flex items-end gap-1.5">
          {[
            { predicted: 65, actual: 60 },
            { predicted: 72, actual: 68 },
            { predicted: 58, actual: 62 },
            { predicted: 85, actual: 80 },
            { predicted: 70, actual: 72 },
            { predicted: 78, actual: 75 },
            { predicted: 90, actual: 85 },
            { predicted: 68, actual: null },
          ].map((bar, i) => (
            <ChartBar key={i} bar={bar} index={i} />
          ))}
        </div>

        {/* X-axis labels */}
        <div
          className="flex justify-between mt-2 text-[10px]"
          style={{ color: colors.textSubtle }}
        >
          {["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].map((week) => (
            <span key={week}>{week}</span>
          ))}
        </div>
      </InteractiveCard>

      {/* Alert row - Interactive */}
      <motion.div
        className="flex items-center gap-2 p-3 rounded-lg cursor-pointer"
        style={{
          background: "rgba(251, 191, 36, 0.08)",
          border: "1px solid rgba(251, 191, 36, 0.2)",
        }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.8, duration: 0.7, ease: easingCurves.smoothOut }}
        whileHover={{
          background: "rgba(251, 191, 36, 0.12)",
          borderColor: "rgba(251, 191, 36, 0.3)",
          x: 4,
        }}
      >
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: colors.amber }}
          animate={{
            boxShadow: [
              `0 0 5px ${colors.amberGlow}`,
              `0 0 15px ${colors.amberGlow}`,
              `0 0 5px ${colors.amberGlow}`,
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-xs" style={{ color: colors.amber }}>
          Écart capacité critique détecté pour S3
        </span>
        <motion.span
          className="ml-auto text-[10px] px-2 py-0.5 rounded"
          style={{
            background: "rgba(251, 191, 36, 0.15)",
            color: colors.amber,
          }}
          whileHover={{ background: "rgba(251, 191, 36, 0.25)" }}
        >
          Voir →
        </motion.span>
      </motion.div>
    </div>
  );
}

/**
 * Interactive chart bar
 */
function ChartBar({
  bar,
  index,
}: {
  bar: { predicted: number; actual: number | null };
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex-1 flex items-end gap-0.5 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      <motion.div
        className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[9px] whitespace-nowrap z-10"
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          color: colors.text,
        }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 5 }}
      >
        {bar.predicted}% prédit
        {bar.actual && ` / ${bar.actual}% réel`}
      </motion.div>

      <motion.div
        className="flex-1 rounded-t cursor-pointer"
        style={{
          background: isHovered
            ? colors.accent
            : `${colors.accent}${isHovered ? "" : "cc"}`,
          boxShadow: isHovered ? `0 0 20px ${colors.accentGlow}` : "none",
        }}
        initial={{ height: 0 }}
        animate={{ height: `${bar.predicted}%` }}
        transition={{
          delay: 1.3 + index * 0.06,
          duration: 0.7,
          ease: easingCurves.smoothOut,
        }}
        whileHover={{ scaleX: 1.1 }}
      />
      {bar.actual !== null && (
        <motion.div
          className="flex-1 rounded-t"
          style={{ background: "rgba(255, 255, 255, 0.2)" }}
          initial={{ height: 0 }}
          animate={{ height: `${bar.actual}%` }}
          transition={{
            delay: 1.4 + index * 0.06,
            duration: 0.7,
            ease: easingCurves.smoothOut,
          }}
        />
      )}
    </div>
  );
}

/**
 * Secondary panel with parallax
 */
function SecondaryPanel({
  scrollYProgress,
  mouseRotateX,
  mouseRotateY,
}: {
  scrollYProgress: MotionValue<number>;
  mouseRotateX: MotionValue<number>;
  mouseRotateY: MotionValue<number>;
}) {
  // Secondary panel has slightly less rotation for parallax depth effect
  const scrollRotateX = useSmoothTransform(scrollYProgress, [0, 0.5], [38, 0]);
  const scrollRotateY = useSmoothTransform(scrollYProgress, [0, 0.5], [8, 0]);
  const y = useSmoothTransform(scrollYProgress, [0, 1], [80, -60]);

  const combinedRotateX = useCombinedMotionValue(
    scrollRotateX,
    useTransform(mouseRotateX, (v) => v * 0.5),
  );
  const combinedRotateY = useCombinedMotionValue(
    scrollRotateY,
    useTransform(mouseRotateY, (v) => v * 1.5),
  );

  return (
    <motion.div
      className="absolute"
      style={{
        top: "40px",
        right: "20px",
        rotateX: combinedRotateX,
        rotateY: combinedRotateY,
        y,
        transformStyle: "preserve-3d",
        transformOrigin: "center top",
        // More translateZ for stronger depth separation
        translateZ: "200px",
        width: "340px",
        zIndex: 10,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 1.0,
        delay: 0.8,
        ease: easingCurves.smoothOut,
      }}
    >
      <AlertCard />
    </motion.div>
  );
}

/**
 * Alert card with premium effects
 */
function AlertCard() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: colors.bgCard,
        border: `1px solid ${isHovered ? colors.borderHover : colors.border}`,
        boxShadow: `
          0 0 0 1px ${colors.borderSubtle},
          0 20px 40px -15px rgba(0, 0, 0, 0.2),
          0 8px 16px -8px rgba(0, 0, 0, 0.1)
        `,
        backdropFilter: "blur(24px)",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
    >
      {/* Top highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3) 50%, transparent)",
        }}
      />

      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(0, 0, 0, 0.35)",
          borderBottom: `1px solid ${colors.borderSubtle}`,
        }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ background: colors.amber }}
            animate={{
              boxShadow: [
                `0 0 5px ${colors.amberGlow}`,
                `0 0 15px ${colors.amberGlow}`,
                `0 0 5px ${colors.amberGlow}`,
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-xs font-medium" style={{ color: colors.text }}>
            Alerte écart capacité
          </span>
        </div>
        <span className="text-[10px]" style={{ color: colors.textSubtle }}>
          Il y a 2h
        </span>
      </div>

      {/* Card content */}
      <div className="p-4 space-y-4">
        {/* Team info */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 1.0,
            duration: 0.5,
            ease: easingCurves.smoothOut,
          }}
        >
          <motion.div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-medium text-sm"
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              color: colors.amber,
            }}
            whileHover={{
              background: "rgba(251, 191, 36, 0.25)",
              scale: 1.05,
            }}
          >
            ⚠
          </motion.div>
          <div>
            <div className="text-sm font-medium" style={{ color: colors.text }}>
              Équipe Production
            </div>
            <div className="text-[11px]" style={{ color: colors.textSubtle }}>
              24 collaborateurs • Site Lyon
            </div>
          </div>
        </motion.div>

        {/* Risk score with animation */}
        <InteractiveCard
          className="p-3 rounded-lg"
          glowColor={colors.amber}
          delay={1.1}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px]" style={{ color: colors.textSubtle }}>
              Sévérité écart
            </span>
            <motion.span
              className="text-xs font-semibold"
              style={{ color: colors.amber }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Élevé
            </motion.span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255, 255, 255, 0.1)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${colors.amber}, #f97316)`,
                boxShadow: `0 0 20px ${colors.amberGlow}`,
              }}
              initial={{ width: 0 }}
              animate={{ width: "82%" }}
              transition={{
                delay: 1.3,
                duration: 1,
                ease: easingCurves.smoothOut,
              }}
            />
          </div>
        </InteractiveCard>

        {/* Risk factors */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <div
            className="text-[10px] font-medium"
            style={{ color: colors.textMuted }}
          >
            Prévisions semaine S3
          </div>
          {[
            {
              label: "Absences prévues",
              value: "6",
              color: colors.amber,
            },
            {
              label: "Départs (turnover)",
              value: "2",
              color: colors.amber,
            },
            {
              label: "Écart capacité",
              value: "-4.2 ETP",
              color: "rgb(248, 113, 113)",
            },
          ].map((factor, i) => (
            <motion.div
              key={factor.label}
              className="flex items-center justify-between py-1.5 px-2 rounded cursor-pointer"
              style={{ background: "rgba(255, 255, 255, 0.03)" }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 1.4 + i * 0.08,
                duration: 0.4,
                ease: easingCurves.smoothOut,
              }}
              whileHover={{
                background: "rgba(255, 255, 255, 0.06)",
                x: 4,
              }}
            >
              <span className="text-[11px]" style={{ color: colors.textMuted }}>
                {factor.label}
              </span>
              <span
                className="text-[11px] font-medium"
                style={{ color: factor.color }}
              >
                {factor.value}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex gap-2 pt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 1.6,
            duration: 0.5,
            ease: easingCurves.smoothOut,
          }}
        >
          <motion.button
            className="flex-1 py-2 px-3 rounded-lg text-[11px] font-medium"
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              color: colors.amber,
              border: "1px solid rgba(251, 191, 36, 0.2)",
            }}
            whileHover={{
              background: "rgba(251, 191, 36, 0.25)",
              boxShadow: `0 0 20px ${colors.amberGlow}`,
            }}
            whileTap={{ scale: 0.98 }}
          >
            Voir l&apos;équipe
          </motion.button>
          <motion.button
            className="flex-1 py-2 px-3 rounded-lg text-[11px] font-medium"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: colors.textMuted,
              border: `1px solid ${colors.borderSubtle}`,
            }}
            whileHover={{
              background: "rgba(255, 255, 255, 0.1)",
              color: colors.text,
            }}
            whileTap={{ scale: 0.98 }}
          >
            Anticiper →
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Static version for reduced motion
 */
function StaticShowcase() {
  return (
    <div
      className="relative w-full"
      style={{
        perspective: "1200px",
        perspectiveOrigin: "center 30%",
      }}
    >
      <div
        className="relative mx-auto rounded-2xl overflow-hidden"
        style={{
          maxWidth: "1100px",
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 80px 160px -40px rgba(0, 0, 0, 0.8)",
          transform: "rotateX(45deg) scale(0.85)",
          transformOrigin: "center top",
        }}
      >
        <div
          className="px-4 py-3"
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            borderBottom: `1px solid ${colors.borderSubtle}`,
          }}
        >
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[rgb(255,95,86)]" />
            <div className="w-3 h-3 rounded-full bg-[rgb(255,189,46)]" />
            <div className="w-3 h-3 rounded-full bg-[rgb(39,201,63)]" />
          </div>
        </div>
        <div
          className="p-8 text-center"
          style={{ color: colors.textMuted, minHeight: "350px" }}
        >
          Dashboard Preview
        </div>
      </div>
    </div>
  );
}
