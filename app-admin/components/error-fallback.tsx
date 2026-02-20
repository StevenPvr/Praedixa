"use client";

import { AlertTriangle, RefreshCw, WifiOff, Inbox } from "lucide-react";

type ErrorVariant = "network" | "api" | "empty";

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

interface DefaultErrorProps extends ErrorFallbackBaseProps {
  variant?: undefined;
}

export type ErrorFallbackProps =
  | NetworkErrorProps
  | ApiErrorProps
  | EmptyDataProps
  | DefaultErrorProps;

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
    iconBg: "bg-warning-50",
    iconColor: "text-warning-600",
    defaultTitle: "Connexion perdue",
    defaultMessage:
      "Impossible de contacter le serveur. Verifiez votre connexion internet et reessayez.",
  },
  api: {
    icon: AlertTriangle,
    iconBg: "bg-danger-50",
    iconColor: "text-danger-500",
    defaultTitle: "Erreur de chargement",
    defaultMessage: "Une erreur est survenue lors du chargement des donnees.",
  },
  empty: {
    icon: Inbox,
    iconBg: "bg-surface-sunken",
    iconColor: "text-ink-placeholder",
    defaultTitle: "Aucune donnee",
    defaultMessage: "Aucune donnee a afficher pour le moment.",
  },
};

export function ErrorFallback(props: ErrorFallbackProps) {
  const variant = props.variant ?? "api";
  const config = variantConfig[variant];
  const Icon = config.icon;

  const message = props.message ?? config.defaultMessage;

  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-border bg-card px-6 py-12">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${config.iconBg}`}
      >
        <Icon className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-medium text-charcoal">
        {config.defaultTitle}
      </p>
      <p className="mt-1 max-w-sm text-center text-sm text-ink-tertiary">
        {message}
      </p>

      {variant === "api" && "detail" in props && props.detail && (
        <p className="mt-2 max-w-md rounded-md bg-surface-sunken px-3 py-2 font-mono text-xs text-ink-placeholder">
          {props.detail}
        </p>
      )}

      {props.onRetry && (
        <button
          onClick={props.onRetry}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-surface-sunken"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reessayer
        </button>
      )}

      {variant === "empty" && "onAction" in props && props.onAction && (
        <button
          onClick={props.onAction}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
        >
          {"ctaLabel" in props && props.ctaLabel ? props.ctaLabel : "Commencer"}
        </button>
      )}
    </div>
  );
}
