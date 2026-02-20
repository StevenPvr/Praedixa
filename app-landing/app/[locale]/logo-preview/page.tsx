"use client";

import { useState } from "react";
import {
  PraedixaLogo,
  LogoVariant,
} from "../../../components/logo/PraedixaLogo";

const VARIANTS: { id: LogoVariant; name: string; description: string }[] = [
  {
    id: "industrial",
    name: "Industrial",
    description: "Cadre carré, style splash screen, point décoratif",
  },
  {
    id: "rounded",
    name: "Arrondi",
    description: "Cadre circulaire, P aux coins arrondis",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Juste le P, sans cadre, ligne accent subtile",
  },
  {
    id: "geometric",
    name: "Géométrique",
    description: "Cadre en losange, style distinctif",
  },
];

interface ColorOption {
  name: string;
  value: string;
}

const COLORS: [ColorOption, ...ColorOption[]] = [
  { name: "Ink", value: "#0f0f0f" },
  { name: "Blue", value: "#2563eb" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "White", value: "#ffffff" },
];

export default function LogoPreviewPage() {
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [size, setSize] = useState(120);
  const [strokeWidth, setStrokeWidth] = useState(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-page to-surface-sunken py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-charcoal mb-4">
            Logo Praedixa - Style linéaire
          </h1>
          <p className="text-ink-secondary text-lg">
            Lignes fines, style industriel comme la splash screen
          </p>
        </div>

        {/* Controls */}
        <div className="bg-card rounded-2xl shadow-sm border border-border-subtle p-6 mb-8">
          <div className="flex flex-wrap gap-6 items-center justify-center">
            {/* Color selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-charcoal">
                Couleur:
              </span>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full transition-all hover:scale-110 border-2 ${
                      selectedColor.name === c.name
                        ? "ring-2 ring-offset-2 ring-charcoal scale-110"
                        : "border-border-subtle"
                    } ${c.name === "White" ? "border-border" : ""}`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Size slider */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-charcoal">Taille:</span>
              <input
                type="range"
                min={32}
                max={200}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-24 accent-primary"
              />
              <span className="text-sm text-ink-secondary w-12">{size}px</span>
            </div>

            {/* Stroke width slider */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-charcoal">
                Épaisseur:
              </span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-24 accent-primary"
              />
              <span className="text-sm text-ink-secondary w-8">
                {strokeWidth}
              </span>
            </div>
          </div>
        </div>

        {/* Logo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {VARIANTS.map((variant) => (
            <div
              key={variant.id}
              className="bg-card rounded-2xl shadow-sm border border-border-subtle p-8 flex flex-col items-center transition-shadow hover:shadow-md"
            >
              <div
                className="flex items-center justify-center mb-6 rounded-xl"
                style={{
                  width: size + 40,
                  height: size + 40,
                  backgroundColor:
                    selectedColor.name === "White" ? "#1F2937" : "#F9FAFB",
                }}
              >
                <PraedixaLogo
                  variant={variant.id}
                  size={size}
                  color={selectedColor.value}
                  strokeWidth={strokeWidth}
                  animate
                />
              </div>
              <h2 className="text-xl font-semibold text-charcoal mb-2">
                {variant.name}
              </h2>
              <p className="text-ink-secondary text-center text-sm">
                {variant.description}
              </p>
            </div>
          ))}
        </div>

        {/* Usage Preview */}
        <div className="mt-12 bg-card rounded-2xl shadow-sm border border-border-subtle p-8">
          <h2 className="text-2xl font-serif font-semibold text-charcoal mb-6 text-center">
            Aperçu en contexte (navbar)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Light background */}
            <div className="bg-card border border-border-subtle rounded-xl p-6">
              <p className="text-xs text-ink-secondary mb-4 uppercase tracking-wide">
                Fond clair
              </p>
              {VARIANTS.map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center gap-3 mb-4 last:mb-0"
                >
                  <PraedixaLogo
                    variant={variant.id}
                    size={32}
                    color="#0f0f0f"
                    strokeWidth={1.5}
                  />
                  <span className="font-serif text-lg font-semibold text-charcoal">
                    Praedixa
                  </span>
                  <span className="text-xs text-ink-secondary ml-auto">
                    {variant.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Dark background */}
            <div className="bg-charcoal rounded-xl p-6">
              <p className="text-xs text-ink-placeholder mb-4 uppercase tracking-wide">
                Fond sombre
              </p>
              {VARIANTS.map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center gap-3 mb-4 last:mb-0"
                >
                  <PraedixaLogo
                    variant={variant.id}
                    size={32}
                    color="#ffffff"
                    strokeWidth={1.5}
                  />
                  <span className="font-serif text-lg font-semibold text-white">
                    Praedixa
                  </span>
                  <span className="text-xs text-ink-placeholder ml-auto">
                    {variant.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Small sizes test */}
        <div className="mt-8 bg-card rounded-2xl shadow-sm border border-border-subtle p-8">
          <h2 className="text-xl font-serif font-semibold text-charcoal mb-6 text-center">
            Test petites tailles (favicon)
          </h2>
          <div className="flex justify-center gap-8 flex-wrap">
            {[16, 24, 32, 48, 64].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <div className="bg-surface-sunken p-2 rounded">
                  <PraedixaLogo
                    variant="industrial"
                    size={s}
                    color="#0f0f0f"
                    strokeWidth={s < 32 ? 1 : 1.5}
                  />
                </div>
                <span className="text-xs text-ink-secondary">{s}px</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
