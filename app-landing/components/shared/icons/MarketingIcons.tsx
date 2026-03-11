import type { ComponentType, ReactNode, SVGProps } from "react";

export interface MarketingIconProps extends Omit<
  SVGProps<SVGSVGElement>,
  "strokeWidth"
> {
  size?: number;
  strokeWidth?: number;
  title?: string;
}

export type MarketingIconComponent = ComponentType<MarketingIconProps>;

interface IconBaseProps extends MarketingIconProps {
  children: ReactNode;
}

function IconBase({
  children,
  className,
  size = 20,
  strokeWidth = 1.8,
  title,
  viewBox = "0 0 24 24",
  ...props
}: IconBaseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function DecisionGraphIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4.5" width="16" height="15" rx="4" />
      <circle cx="8.5" cy="9" r="1.4" />
      <circle cx="15.5" cy="9" r="1.4" />
      <circle cx="12" cy="15" r="1.4" />
      <path d="M9.9 9h4.2" />
      <path d="M9.5 10.2l1.9 3.1" />
      <path d="M14.5 10.2l-1.9 3.1" />
    </IconBase>
  );
}

export function SignalWindowIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="3.5" />
      <path d="M7 14l2.4-3 2.3 2.1 3.1-4.1 2.2 2.2" />
      <path d="M7 8.5h10" />
    </IconBase>
  );
}

export function StorefrontLineIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 9.5h15" />
      <path d="M5.5 9.5v7a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-7" />
      <path d="M4.5 9.5l1.4-4h12.2l1.4 4" />
      <path d="M9 9.5v9" />
      <path d="M12.5 13.5h4" />
    </IconBase>
  );
}

export function CampusLineIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8.5 12 4.5l8 4" />
      <path d="M6.5 10.5v6" />
      <path d="M10 10.5v6" />
      <path d="M14 10.5v6" />
      <path d="M17.5 10.5v6" />
      <path d="M5 16.5h14" />
      <path d="M4 19.5h16" />
    </IconBase>
  );
}

export function FlowNetworkIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <rect x="5.5" y="6" width="5.5" height="5.5" rx="1.6" />
      <circle cx="17.2" cy="7.8" r="2.6" />
      <rect x="13" y="13" width="5.5" height="5.5" rx="1.6" />
      <path d="M11 8.8h3.7" />
      <path d="M10.4 10.4l4.4 4.4" />
    </IconBase>
  );
}

export function CarServiceIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.2 10.6a2 2 0 0 1 1.9-1.4h5.8a2 2 0 0 1 1.9 1.4l1.2 3.6" />
      <path d="M5 14.2h14l-.4 2.7a1.8 1.8 0 0 1-1.8 1.6H7.2a1.8 1.8 0 0 1-1.8-1.6L5 14.2Z" />
      <circle cx="8.2" cy="15.7" r="1.1" />
      <circle cx="15.8" cy="15.7" r="1.1" />
      <path d="M9.8 12.4h4.4" />
      <path d="M6.2 13.2 7.8 9" />
      <path d="M17.8 13.2 16.2 9" />
    </IconBase>
  );
}

export function CheckBadgeIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="m8.8 12.1 2.2 2.3 4.4-4.8" />
    </IconBase>
  );
}

export function CloseBadgeIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="m9.3 9.3 5.4 5.4" />
      <path d="m14.7 9.3-5.4 5.4" />
    </IconBase>
  );
}

export function MinusBadgeIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M8.5 12h7" />
    </IconBase>
  );
}

export function TrendGraphIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 18h14" />
      <path d="m6.5 14.8 3.1-3.1 2.8 2.8 4.9-5.3" />
      <path d="M14.8 9.2H18v3.2" />
    </IconBase>
  );
}

export function AlertDiamondIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.5 18.5 11 12 17.5 5.5 11 12 4.5Z" />
      <path d="M12 8.3v4" />
      <path d="M12 14.6h.01" />
    </IconBase>
  );
}

export function DatabaseStackIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="7" rx="6.5" ry="2.5" />
      <path d="M5.5 7v4.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V7" />
      <path d="M5.5 11.5V16c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-4.5" />
    </IconBase>
  );
}

export function PlugLinkIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.4 6.5v3" />
      <path d="M11 6.5v3" />
      <path d="M6.8 9.5h5.8v.8a2.9 2.9 0 0 1-2.9 2.9H9.7a2.9 2.9 0 0 1-2.9-2.9v-.8Z" />
      <path d="M15.6 14.5v-3" />
      <path d="M18.2 14.5v-3" />
      <path d="M14 10.8h5.8v.8a2.9 2.9 0 0 1-2.9 2.9h0a2.9 2.9 0 0 1-2.9-2.9v-.8Z" />
      <path d="M11.8 13.1h2.6" />
    </IconBase>
  );
}

export function ShieldFrameIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.5 18 7v4.7c0 3.4-2.2 6.1-6 7.8-3.8-1.7-6-4.4-6-7.8V7l6-2.5Z" />
      <path d="m9.2 11.7 1.8 1.9 3.8-4" />
    </IconBase>
  );
}

export function TargetRingIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.3" />
      <circle cx="12" cy="12" r="0.9" />
    </IconBase>
  );
}

export function TeamGridIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="9" r="2.1" />
      <circle cx="16" cy="9" r="2.1" />
      <path d="M5.5 17.5c.5-2.3 2.1-3.5 4.6-3.5S14.2 15.2 14.7 17.5" />
      <path d="M12.7 17.5c.4-1.9 1.8-2.9 4-2.9" />
    </IconBase>
  );
}

export function ClockPulseIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8.4v3.8l2.7 1.7" />
      <path d="M18.4 7.8 20 6.2" />
    </IconBase>
  );
}
