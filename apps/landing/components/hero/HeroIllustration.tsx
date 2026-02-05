/**
 * Static SVG illustration for the Hero section.
 * Minimalist dashboard card: KPI, mini line chart, alert cards.
 * No perspective tilt, no pipeline teaser — clean and premium.
 *
 * Design system colors only:
 *  - Charcoal #0f0f0f  - Amber #f59e0b  - Amber dark #d97706
 *  - Cream #fafaf8     - Light gray #d4d4d4  - Mid gray #737373
 */
export function HeroIllustration() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <svg
        viewBox="0 0 640 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full drop-shadow-2xl"
        role="img"
        aria-label="Illustration : tableau de bord montrant le coût évitable, la courbe capacité vs demande, et les alertes sites"
      >
        {/* Background card */}
        <rect x="0" y="0" width="640" height="300" rx="20" fill="#0f0f0f" />

        {/* Window chrome dots */}
        <circle cx="20" cy="16" r="4" fill="#737373" opacity="0.4" />
        <circle cx="33" cy="16" r="4" fill="#737373" opacity="0.4" />
        <circle cx="46" cy="16" r="4" fill="#737373" opacity="0.4" />

        {/* Title bar */}
        <text
          x="320"
          y="18"
          textAnchor="middle"
          fill="#737373"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          praedixa.app / diagnostic
        </text>

        {/* Divider */}
        <line x1="0" y1="32" x2="640" y2="32" stroke="#737373" opacity="0.15" />

        {/* ═══════════════════════════════════════════ */}
        {/* LEFT: KPI principal                        */}
        {/* ═══════════════════════════════════════════ */}
        <rect x="20" y="46" width="170" height="100" rx="12" fill="#1a1a1a" />

        {/* Label */}
        <text
          x="36"
          y="68"
          fill="#737373"
          fontSize="9"
          fontFamily="system-ui, sans-serif"
        >
          Coût évitable estimé
        </text>

        {/* Big number */}
        <text
          x="36"
          y="104"
          fill="#f59e0b"
          fontSize="28"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          47k&thinsp;€
        </text>
        <text
          x="132"
          y="104"
          fill="#737373"
          fontSize="11"
          fontFamily="system-ui, sans-serif"
        >
          /mois
        </text>

        {/* Trend indicator */}
        <rect
          x="36"
          y="118"
          width="52"
          height="18"
          rx="9"
          fill="#d97706"
          opacity="0.15"
        />
        <text
          x="62"
          y="131"
          textAnchor="middle"
          fill="#f59e0b"
          fontSize="9"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          -12% vs M-1
        </text>

        {/* ═══════════════════════════════════════════ */}
        {/* CENTER: Mini line chart                     */}
        {/* ═══════════════════════════════════════════ */}
        <rect x="204" y="46" width="240" height="100" rx="12" fill="#1a1a1a" />

        {/* Chart title */}
        <text
          x="220"
          y="66"
          fill="#737373"
          fontSize="9"
          fontFamily="system-ui, sans-serif"
        >
          Capacité vs Demande — 12 semaines
        </text>

        {/* Grid lines */}
        <line
          x1="220"
          y1="80"
          x2="428"
          y2="80"
          stroke="#737373"
          opacity="0.06"
        />
        <line
          x1="220"
          y1="100"
          x2="428"
          y2="100"
          stroke="#737373"
          opacity="0.06"
        />
        <line
          x1="220"
          y1="120"
          x2="428"
          y2="120"
          stroke="#737373"
          opacity="0.06"
        />

        {/* Capacity line (gray, stable) */}
        <polyline
          points="220,108 237,106 254,110 271,107 288,109 305,106 322,108 339,110 356,107 373,109 390,106 407,108 424,110"
          stroke="#d4d4d4"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Demand line (amber, fluctuating) */}
        <polyline
          points="220,112 237,108 254,100 271,92 288,86 305,90 322,96 339,88 356,82 373,90 390,94 407,88 424,84"
          stroke="#f59e0b"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Gap fill — area between lines where demand > capacity */}
        <path
          d="M254,100 L271,92 L288,86 L305,90 L322,96 L322,108 L305,106 L288,109 L271,107 L254,110 Z"
          fill="#d97706"
          opacity="0.12"
        />
        <path
          d="M339,88 L356,82 L373,90 L390,94 L407,88 L424,84 L424,110 L407,108 L390,106 L373,109 L356,107 L339,110 Z"
          fill="#d97706"
          opacity="0.12"
        />

        {/* Legend dots */}
        <circle cx="220" cy="138" r="3" fill="#d4d4d4" opacity="0.5" />
        <text
          x="228"
          y="141"
          fill="#737373"
          fontSize="8"
          fontFamily="system-ui, sans-serif"
        >
          Capacité
        </text>
        <circle cx="280" cy="138" r="3" fill="#f59e0b" />
        <text
          x="288"
          y="141"
          fill="#737373"
          fontSize="8"
          fontFamily="system-ui, sans-serif"
        >
          Demande
        </text>
        <rect
          x="340"
          y="135"
          width="6"
          height="6"
          rx="1"
          fill="#d97706"
          opacity="0.25"
        />
        <text
          x="350"
          y="141"
          fill="#737373"
          fontSize="8"
          fontFamily="system-ui, sans-serif"
        >
          Écart
        </text>

        {/* ═══════════════════════════════════════════ */}
        {/* RIGHT: 3 mini alert cards                  */}
        {/* ═══════════════════════════════════════════ */}

        {/* Card 1 — Sites en alerte */}
        <rect x="458" y="46" width="164" height="28" rx="8" fill="#1a1a1a" />
        <circle cx="474" cy="60" r="4" fill="#d97706" />
        <text
          x="484"
          y="64"
          fill="#d4d4d4"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
        >
          3 sites en alerte
        </text>

        {/* Card 2 — Options chiffrées */}
        <rect x="458" y="82" width="164" height="28" rx="8" fill="#1a1a1a" />
        <circle cx="474" cy="96" r="4" fill="#f59e0b" />
        <text
          x="484"
          y="100"
          fill="#d4d4d4"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
        >
          2 options chiffrées
        </text>

        {/* Card 3 — ROI */}
        <rect x="458" y="118" width="164" height="28" rx="8" fill="#1a1a1a" />
        <circle cx="474" cy="132" r="4" fill="#22c55e" />
        <text
          x="484"
          y="136"
          fill="#d4d4d4"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
        >
          ROI projeté +12%
        </text>

        {/* ═══════════════════════════════════════════ */}
        {/* BOTTOM ROW: 3 metric cards                 */}
        {/* ═══════════════════════════════════════════ */}

        {/* Metric 1 */}
        <rect x="20" y="160" width="192" height="68" rx="12" fill="#1a1a1a" />
        <text
          x="36"
          y="182"
          fill="#737373"
          fontSize="9"
          fontFamily="system-ui, sans-serif"
        >
          Taux de couverture
        </text>
        <text
          x="36"
          y="212"
          fill="#d4d4d4"
          fontSize="22"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          78%
        </text>
        <text
          x="82"
          y="212"
          fill="#737373"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
        >
          moy. 7 sites
        </text>

        {/* Mini bar sparkline */}
        <rect
          x="160"
          y="186"
          width="4"
          height="10"
          rx="1"
          fill="#d4d4d4"
          opacity="0.2"
        />
        <rect
          x="167"
          y="182"
          width="4"
          height="14"
          rx="1"
          fill="#d4d4d4"
          opacity="0.25"
        />
        <rect
          x="174"
          y="188"
          width="4"
          height="8"
          rx="1"
          fill="#d97706"
          opacity="0.5"
        />
        <rect
          x="181"
          y="184"
          width="4"
          height="12"
          rx="1"
          fill="#d4d4d4"
          opacity="0.25"
        />
        <rect
          x="188"
          y="190"
          width="4"
          height="6"
          rx="1"
          fill="#d97706"
          opacity="0.6"
        />
        <rect
          x="195"
          y="186"
          width="4"
          height="10"
          rx="1"
          fill="#d4d4d4"
          opacity="0.2"
        />

        {/* Metric 2 */}
        <rect x="224" y="160" width="192" height="68" rx="12" fill="#1a1a1a" />
        <text
          x="240"
          y="182"
          fill="#737373"
          fontSize="9"
          fontFamily="system-ui, sans-serif"
        >
          Prochaine alerte
        </text>
        <text
          x="240"
          y="212"
          fill="#f59e0b"
          fontSize="22"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          S+3
        </text>
        <text
          x="278"
          y="212"
          fill="#737373"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
        >
          Lille · -3 ETP
        </text>

        {/* Warning icon */}
        <polygon
          points="395,195 402,183 409,195"
          fill="none"
          stroke="#d97706"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <line
          x1="402"
          y1="188"
          x2="402"
          y2="191"
          stroke="#d97706"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="402" cy="193" r="0.8" fill="#d97706" />

        {/* Metric 3 */}
        <rect x="428" y="160" width="192" height="68" rx="12" fill="#1a1a1a" />
        <text
          x="444"
          y="182"
          fill="#737373"
          fontSize="9"
          fontFamily="system-ui, sans-serif"
        >
          Économies potentielles
        </text>
        <text
          x="444"
          y="212"
          fill="#22c55e"
          fontSize="22"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          564k&thinsp;€
        </text>
        <text
          x="520"
          y="212"
          fill="#737373"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
        >
          /an
        </text>

        {/* Upward trend arrow */}
        <polyline
          points="590,210 596,196 602,202"
          stroke="#22c55e"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ═══════════════════════════════════════════ */}
        {/* Bottom bar — status line                    */}
        {/* ═══════════════════════════════════════════ */}
        <rect x="0" y="244" width="640" height="56" rx="0" fill="#0f0f0f" />
        <rect
          x="0"
          y="244"
          width="640"
          height="1"
          fill="#737373"
          opacity="0.1"
        />

        {/* Status pills */}
        <rect
          x="20"
          y="258"
          width="100"
          height="22"
          rx="11"
          fill="#d97706"
          opacity="0.12"
        />
        <circle cx="34" cy="269" r="3" fill="#d97706" />
        <text
          x="42"
          y="273"
          fill="#f59e0b"
          fontSize="9"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          3 alertes actives
        </text>

        <rect
          x="132"
          y="258"
          width="120"
          height="22"
          rx="11"
          fill="#22c55e"
          opacity="0.1"
        />
        <circle cx="146" cy="269" r="3" fill="#22c55e" />
        <text
          x="154"
          y="273"
          fill="#22c55e"
          fontSize="9"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          Données à jour · 2h
        </text>

        <rect
          x="264"
          y="258"
          width="140"
          height="22"
          rx="11"
          fill="#ffffff"
          opacity="0.05"
        />
        <circle cx="278" cy="269" r="3" fill="#737373" />
        <text
          x="286"
          y="273"
          fill="#737373"
          fontSize="9"
          fontFamily="system-ui, sans-serif"
        >
          Dernière prédiction : lun.
        </text>

        {/* Bottom rounded corners — clip the bottom of the card */}
        <rect x="0" y="280" width="640" height="20" rx="0" fill="#0f0f0f" />
        <rect
          x="0"
          y="280"
          width="640"
          height="20"
          rx="20"
          ry="20"
          fill="#0f0f0f"
        />
      </svg>
    </div>
  );
}
