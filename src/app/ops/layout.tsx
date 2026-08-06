import type { ReactNode } from "react";
import { OpsNavDrawer } from "@/components/OpsNavDrawer";
import {
  allowedModulesForNav,
  getTeamSession,
} from "@/lib/team-auth";

export default async function OpsLayout({ children }: { children: ReactNode }) {
  const session = await getTeamSession();
  const allowedModules = allowedModulesForNav(session);

  return (
    <>
      {children}
      <OpsNavDrawer allowedModules={allowedModules} />
    </>
  );
}
