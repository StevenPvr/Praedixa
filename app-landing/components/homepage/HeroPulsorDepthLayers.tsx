"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Praedixa hero background — animated network with smooth mouse      */
/*  interaction. Particles attract/repel around cursor with lerped     */
/*  position, highlighted connections, and glow effect.                */
/* ------------------------------------------------------------------ */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  pulse: number;
  pulseSpeed: number;
  isHub: boolean;
}

const COLORS = {
  amber: "216,161,91",
  copper: "171,114,63",
} as const;

const PALETTE = [COLORS.amber, COLORS.amber, COLORS.amber, COLORS.copper];

const CONNECTION_DIST = 240;

// Mouse interaction zones
const MOUSE_ATTRACT_RADIUS = 320; // outer zone: gentle attraction
const MOUSE_REPEL_RADIUS = 90; // inner zone: push away (halo effect)
const MOUSE_LERP = 0.08; // smoothing factor (lower = smoother)

function createParticles(w: number, h: number): Particle[] {
  const count = Math.max(40, Math.min(80, Math.floor((w * h) / 18000)));
  const out: Particle[] = [];

  for (let i = 0; i < count; i++) {
    out.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 2.5 + 2,
      color:
        PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? COLORS.amber,
      alpha: Math.random() * 0.35 + 0.45,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.012 + 0.006,
      isHub: false,
    });
  }

  // 5-6 hub nodes
  const hubCount = 5 + Math.floor(Math.random() * 2);
  for (let i = 0; i < hubCount; i++) {
    out.push({
      x: w * (0.12 + Math.random() * 0.76),
      y: h * (0.1 + Math.random() * 0.75),
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      radius: Math.random() * 3 + 5,
      color: i < 4 ? COLORS.amber : COLORS.copper,
      alpha: 0.75,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.018,
      isHub: true,
    });
  }

  return out;
}

export function HeroPulsorDepthLayers() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawMouseRef = useRef({ x: -1000, y: -1000, active: false });
  const smoothMouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const reduced = useReducedMotion();

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    particlesRef.current = createParticles(rect.width, rect.height);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    setupCanvas();
    if (reduced) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      timeRef.current += 1;

      const particles = particlesRef.current;
      const raw = rawMouseRef.current;
      const smooth = smoothMouseRef.current;

      // ── Lerp mouse position for ultra-smooth tracking ──
      if (raw.active) {
        smooth.x += (raw.x - smooth.x) * MOUSE_LERP;
        smooth.y += (raw.y - smooth.y) * MOUSE_LERP;
      } else {
        // Slowly drift off-screen when mouse leaves
        smooth.x += (-1000 - smooth.x) * 0.02;
        smooth.y += (-1000 - smooth.y) * 0.02;
      }

      const mx = smooth.x;
      const my = smooth.y;
      const mouseOnScreen = mx > -500 && my > -500;

      // ── Update particle positions ──
      for (const p of particles) {
        if (mouseOnScreen) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 0 && dist < MOUSE_ATTRACT_RADIUS) {
            if (dist < MOUSE_REPEL_RADIUS) {
              // Inner zone: repel (creates the halo ring)
              const strength =
                ((MOUSE_REPEL_RADIUS - dist) / MOUSE_REPEL_RADIUS) * 0.06;
              p.vx += (dx / dist) * strength;
              p.vy += (dy / dist) * strength;
            } else {
              // Outer zone: gentle attraction
              const strength =
                ((dist - MOUSE_REPEL_RADIUS) /
                  (MOUSE_ATTRACT_RADIUS - MOUSE_REPEL_RADIUS)) *
                0.008;
              p.vx -= (dx / dist) * strength;
              p.vy -= (dy / dist) * strength;
            }
          }
        }

        p.x += p.vx;
        p.y += p.vy;
        // Damping — slightly higher for smoother settling
        p.vx *= 0.994;
        p.vy *= 0.994;
        p.pulse += p.pulseSpeed;

        // Wrap
        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;
        if (p.y < -30) p.y = h + 30;
        if (p.y > h + 30) p.y = -30;
      }

      // ── Cursor glow ──
      if (mouseOnScreen) {
        const glowGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 180);
        glowGrad.addColorStop(0, "rgba(216,161,91,0.08)");
        glowGrad.addColorStop(0.5, "rgba(216,161,91,0.03)");
        glowGrad.addColorStop(1, "rgba(216,161,91,0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(mx - 180, my - 180, 360, 360);
      }

      // ── Draw connections ──
      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        if (!pi) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j];
          if (!pj) continue;
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const ratio = 1 - dist / CONNECTION_DIST;
            let base = pi.isHub || pj.isHub ? 0.4 : 0.28;
            let lineW = 1.2;

            // Boost connections near cursor
            if (mouseOnScreen) {
              const midX = (pi.x + pj.x) / 2;
              const midY = (pi.y + pj.y) / 2;
              const dMouse = Math.sqrt((midX - mx) ** 2 + (midY - my) ** 2);
              if (dMouse < MOUSE_ATTRACT_RADIUS) {
                const proximity = 1 - dMouse / MOUSE_ATTRACT_RADIUS;
                base += proximity * 0.25;
                lineW += proximity * 0.8;
              }
            }

            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.strokeStyle = `rgba(${COLORS.amber},${ratio * base})`;
            ctx.lineWidth = lineW;
            ctx.stroke();
          }
        }
      }

      // ── Draw particles + hub radar rings ──
      for (const p of particles) {
        const sinP = Math.sin(p.pulse);
        let drawAlpha = p.alpha * (0.75 + 0.25 * sinP);
        let drawR = p.radius * (0.94 + 0.06 * sinP);

        // Boost particles near cursor
        if (mouseOnScreen) {
          const dMouse = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
          if (dMouse < MOUSE_ATTRACT_RADIUS) {
            const proximity = 1 - dMouse / MOUSE_ATTRACT_RADIUS;
            drawAlpha = Math.min(1, drawAlpha + proximity * 0.35);
            drawR *= 1 + proximity * 0.4;
          }
        }

        if (p.isHub) {
          // Radar pulse rings
          const t = timeRef.current;
          for (let ring = 0; ring < 2; ring++) {
            const phase = (t * 0.008 + ring * 0.5 + p.pulse) % 1;
            const ringR = drawR + phase * 45;
            const ringAlpha = (1 - phase) * 0.22;
            ctx.beginPath();
            ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${p.color},${ringAlpha})`;
            ctx.lineWidth = 1.5 * (1 - phase);
            ctx.stroke();
          }

          // Hub glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, drawR * 2.5, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            drawR * 2.5,
          );
          grad.addColorStop(0, `rgba(${p.color},${drawAlpha * 0.25})`);
          grad.addColorStop(1, `rgba(${p.color},0)`);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.lineWidth = 1.2;
        }

        // Main dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${drawAlpha})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    // ── Mouse tracking on window (content z-10 sits above canvas) ──
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

      rawMouseRef.current = { x, y, active: inside };
    };

    const onResize = () => setupCanvas();

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced, setupCanvas]);

  return (
    <div ref={containerRef} className="absolute inset-0" aria-hidden="true">
      {/* Orbs removed — clean network only */}

      {/* ── Canvas particle network ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: reduced ? 0 : 1 }}
      />

      {/* ── Grid overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(216,161,91,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(216,161,91,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 85% 75% at 50% 40%, rgba(0,0,0,0.18) 0%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 40%, rgba(0,0,0,0.18) 0%, transparent 100%)",
        }}
      />

      {/* ── Noise grain ── */}
      <div
        className="absolute -inset-4 opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "256px 256px",
        }}
      />
    </div>
  );
}
