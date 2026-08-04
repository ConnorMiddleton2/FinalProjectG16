import { cookies } from "next/headers";

export const TEAM_COOKIE = "harborline_team";

export function getTeamCredentials() {
  return {
    companyId: process.env.TEAM_COMPANY_ID ?? "HARBORLINE",
    password: process.env.TEAM_PASSWORD ?? "harborline2026",
  };
}

export async function hasTeamAccess() {
  const jar = await cookies();
  return jar.get(TEAM_COOKIE)?.value === "1";
}
