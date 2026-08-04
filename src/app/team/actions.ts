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
  const password = String(formData.get("password") ?? "").trim();
  const expected = getTeamCredentials();

  const idOk = companyId.toUpperCase() === expected.companyId.toUpperCase();
  const passOk = password === expected.password;

  if (!companyId || !password) {
    return { error: "Enter both company ID and password." };
  }

  if (!idOk || !passOk) {
    return {
      error: "Invalid company ID or password. Use G16 / team123 for the demo employee.",
    };
  }

  const jar = await cookies();
  jar.set({
    name: TEAM_COOKIE,
    value: "1",
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
