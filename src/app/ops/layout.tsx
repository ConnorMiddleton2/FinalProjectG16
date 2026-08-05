import type { ReactNode } from "react";
import { OpsNavDrawer } from "@/components/OpsNavDrawer";

export default function OpsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <OpsNavDrawer />
    </>
  );
}
