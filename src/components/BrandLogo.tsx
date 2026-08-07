import Image from "next/image";
import { COMPANY_LOGO_ALT, COMPANY_LOGO_SRC, COMPANY_SHORT } from "@/lib/brand";

type Props = {
  /** Visual size of the mark. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Dark headers: logo on a light plate so the navy mark stays readable. */
  onDark?: boolean;
  className?: string;
  priority?: boolean;
};

const SIZE: Record<NonNullable<Props["size"]>, { box: string; img: number }> = {
  sm: { box: "h-8 w-auto", img: 28 },
  md: { box: "h-10 w-auto", img: 36 },
  lg: { box: "h-14 w-auto", img: 52 },
  xl: { box: "h-20 w-auto sm:h-24", img: 88 },
};

export function BrandLogo({
  size = "md",
  onDark = false,
  className = "",
  priority = false,
}: Props) {
  const dim = SIZE[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg ${
        onDark ? "bg-white px-2 py-1 shadow-sm" : ""
      } ${className}`}
    >
      <Image
        src={COMPANY_LOGO_SRC}
        alt={COMPANY_LOGO_ALT}
        width={dim.img * 3}
        height={dim.img}
        className={`${dim.box} object-contain object-left`}
        priority={priority}
      />
      <span className="sr-only">{COMPANY_SHORT}</span>
    </span>
  );
}
