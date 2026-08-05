import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type OwnerAlertProps = {
  variant: "error" | "success" | "info";
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const styles = {
  error: {
    wrap: "border-red-200 bg-red-50 text-red-800",
    Icon: AlertCircle,
  },
  success: {
    wrap: "border-[color-mix(in_srgb,var(--harbor-mid)_35%,transparent)] bg-[color-mix(in_srgb,var(--harbor-mist)_75%,white)] text-[var(--harbor-ink)]",
    Icon: CheckCircle2,
  },
  info: {
    wrap: "border-[color-mix(in_srgb,var(--harbor-glow)_55%,transparent)] bg-[color-mix(in_srgb,var(--harbor-glow)_18%,white)] text-[var(--harbor-ink)]",
    Icon: Info,
  },
} as const;

export function OwnerAlert({
  variant,
  title,
  children,
  className = "",
}: OwnerAlertProps) {
  const { wrap, Icon } = styles[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-xl border px-3.5 py-3 text-sm ${wrap} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-90" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        {title ? <p className="font-semibold leading-tight">{title}</p> : null}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
