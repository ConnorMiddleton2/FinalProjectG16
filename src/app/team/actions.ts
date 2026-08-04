"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTeamCredentials, TEAM_COOKIE } from "@/lib/team-auth";

export type TeamLoginState = {
  error?: string;
};

export async function teamLogin(
  _prev: TeamLoginState,
  formData: FormData
): Promise<TeamLoginState> {
  const companyId = String(formData.get("companyId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const expected = getTeamCredentials();

  if (
    companyId.toUpperCase() !== expected.companyId.toUpperCase() ||
    password !== expected.password
  ) {
    return { error: "Invalid company ID or password." };
  }

  const jar = await cookies();
  jar.set(TEAM_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect("/ops");
}

export async function teamLogout() {
  const jar = await cookies();
  jar.delete(TEAM_COOKIE);
  redirect("/");
}
