import type { ReactNode } from "react";

export type PortalStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

type Props = {
  children: ReactNode;
  tone?: PortalStatusTone;
  className?: string;
};

const TONE_CLASS: Record<PortalStatusTone, string> = {
  neutral: "portal-status-neutral",
  success: "portal-status-success",
  warning: "portal-status-warning",
  danger: "portal-status-danger",
  info: "portal-status-info",
};

/** Consistent status pill for balances, requests, and messages. */
export function PortalStatusBadge({
  children,
  tone = "neutral",
  className = "",
}: Props) {
  return (
    <span className={`portal-status ${TONE_CLASS[tone]} ${className}`.trim()}>
      {children}
    </span>
  );
}
