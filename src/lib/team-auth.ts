import { cookies } from "next/headers";
import { DEMO_EMPLOYEE } from "@/lib/team-credentials";

export const TEAM_COOKIE = "harborline_team";
export { DEMO_EMPLOYEE };

export function getTeamCredentials() {
  return {
    companyId: process.env.TEAM_COMPANY_ID?.trim() || DEMO_EMPLOYEE.companyId,
    password: process.env.TEAM_PASSWORD?.trim() || DEMO_EMPLOYEE.password,
  };
}

export async function hasTeamAccess() {
  const jar = await cookies();
  return jar.get(TEAM_COOKIE)?.value === "1";
}
