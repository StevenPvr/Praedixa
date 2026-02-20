"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  RefreshCw,
  WifiOff,
  Inbox,
  ShieldX,
} from "lucide-react";
import { cn } from "@praedixa/ui";
import { fadeScale } from "@/lib/animations/config";

/* ── Variant types ── */

type ErrorVariant = "network" | "api" | "empty" | "permission";

interface ErrorFallbackBaseProps {
  message?: string;
  onRetry?: () => void;
}

interface NetworkErrorProps extends ErrorFallbackBaseProps {
  variant: "network";
}

interface ApiErrorProps extends ErrorFallbackBaseProps {
  variant: "api";
  detail?: string;
}

interface EmptyDataProps extends ErrorFallbackBaseProps {
  variant: "empty";
  ctaLabel?: string;
  onAction?: () => void;
}

interface PermissionErrorProps extends ErrorFallbackBaseProps {
  variant: "permission";
  ctaLabel?: string;
  onAction?: () => void;
}

interface DefaultErrorProps extends ErrorFallbackBaseProps {
  variant?: undefined;
}

export type ErrorFallbackProps =
  | NetworkErrorProps
  | ApiErrorProps
  | EmptyDataProps
  | PermissionErrorProps
  | DefaultErrorProps;

/* ── Variant configs ── */

const variantConfig: Record<
  ErrorVariant,
  {
    icon: typeof AlertTriangle;
    iconBg: string;
    iconColor: string;
    defaultTitle: string;
    defaultMessage: string;
  }
> = {
  network: {
    icon: WifiOff,
    iconBg: "bg-warning-light",
    iconColor: "text-warning",
    defaultTitle: "Connexion perdue",
    defaultMessage:
      "Impossible de contacter le serveur. Verifiez votre connexion internet et reessayez.",
  },
  api: {
    icon: AlertTriangle,
    iconBg: "bg-danger-light",
    iconColor: "text-danger",
    defaultTitle: "Erreur de chargement",
    defaultMessage: "Une erreur est survenue lors du chargement des donnees.",
  },
  empty: {
    icon: Inbox,
    iconBg: "bg-surface-interactive",
    iconColor: "text-ink-tertiary",
    defaultTitle: "Aucune donnee",
    defaultMessage: "Aucune donnee a afficher pour le moment.",
  },
  permission: {
    icon: ShieldX,
    iconBg: "bg-warning-light",
    iconColor: "text-warning",
    defaultTitle: "Acces restreint",
    defaultMessage:
      "Vous n'avez pas les permissions necessaires pour acceder a cette ressource.",
  },
};

/* ── Component ── */

export function ErrorFallback(props: ErrorFallbackProps) {
  const variant = props.variant ?? "api";
  const config = variantConfig[variant];
  const Icon = config.icon;
  const message = props.message ?? config.defaultMessage;

  const isCritical = variant === "api" || variant === "network";

  return (
    <motion.div
      variants={fadeScale}
      initial="hidden"
      animate="visible"
      role="alert"
      aria-labelledby="error-fallback-title"
      aria-describedby="error-fallback-desc"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border px-8 py-16",
        "surface-card shadow-raised",
        isCritical && "glow-danger border-danger-light",
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl",
          config.iconBg,
        )}
      >
        <Icon className={cn("h-7 w-7", config.iconColor)} aria-hidden="true" />
      </div>
      <h2 id="error-fallback-title" className="mt-5 text-heading-sm text-ink">
        {config.defaultTitle}
      </h2>
      <p
        id="error-fallback-desc"
        className="mt-1.5 max-w-sm text-center text-body-sm text-ink-secondary"
      >
        {message}
      </p>

      {variant === "api" && "detail" in props && props.detail && (
        <p className="mt-3 max-w-md rounded-lg bg-surface-sunken px-4 py-2.5 font-mono text-caption text-ink-tertiary">
          {props.detail}
        </p>
      )}

      {props.onRetry && (
        <button
          type="button"
          onClick={props.onRetry}
          aria-label="Reessayer le chargement"
          className={cn(
            "mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg",
            "bg-primary px-6 py-2.5",
            "text-body-sm font-semibold text-white shadow-raised",
            "transition-all duration-fast",
            "hover:bg-primary-600 hover:shadow-floating",
            "active:scale-[0.97]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          )}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reessayer
        </button>
      )}

      {(variant === "empty" || variant === "permission") &&
        "onAction" in props &&
        props.onAction && (
          <button
            onClick={props.onAction}
            className={cn(
              "mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg",
              "bg-primary px-6 py-2.5",
              "text-body-sm font-semibold text-white shadow-raised",
              "transition-all duration-fast",
              "hover:bg-primary-600 hover:shadow-floating",
              "active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            )}
          >
            {"ctaLabel" in props && props.ctaLabel
              ? props.ctaLabel
              : variant === "permission"
                ? "Demander l'acces"
                : "Commencer"}
          </button>
        )}

      {variant === "api" && (
        <a
          href="mailto:support@praedixa.com"
          className="mt-4 text-caption text-ink-tertiary underline underline-offset-2 transition-colors duration-fast hover:text-ink"
        >
          Contacter le support
        </a>
      )}
    </motion.div>
  );
}
