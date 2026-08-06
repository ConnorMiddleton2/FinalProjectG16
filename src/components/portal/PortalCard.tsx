import type { ElementType, HTMLAttributes, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  interactive?: boolean;
  padded?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

/** Shared tenant-portal card surface for consistent spacing and elevation. */
export function PortalCard({
  children,
  className = "",
  as: Comp = "div",
  interactive = false,
  padded = true,
  ...rest
}: Props) {
  return (
    <Comp
      {...rest}
      className={`portal-card ${interactive ? "portal-card-interactive" : ""} ${
        padded ? "p-4 sm:p-5" : ""
      } ${className}`.trim()}
    >
      {children}
    </Comp>
  );
}
