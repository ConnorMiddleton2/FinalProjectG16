"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  findEmployeeByEmail,
  getTeamCredentials,
  TEAM_COOKIE,
  TEAM_COOKIE_ADMIN,
  verifyEmployeePassword,
} from "@/lib/team-auth";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

export type TeamLoginState = {
  error?: string;
};

export async function teamLogin(
  _prev: TeamLoginState,
  formData: FormData
): Promise<TeamLoginState> {
  const loginId = String(
    formData.get("email") ?? formData.get("companyId") ?? ""
  ).trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!loginId || !password) {
    return { error: "Enter both email (or company ID) and password." };
  }

  const expected = getTeamCredentials();
  const isAdmin =
    loginId.toUpperCase() === expected.companyId.toUpperCase() &&
    password === expected.password;

  if (isAdmin) {
    const jar = await cookies();
    jar.set(TEAM_COOKIE, TEAM_COOKIE_ADMIN, COOKIE_OPTIONS);
    // Also clear any legacy cookie name so auth state is unambiguous.
    jar.delete("harborline_team");
    redirect("/ops");
  }

  try {
    const client = await createClient();
    const employee = await findEmployeeByEmail(client, loginId);
    if (!employee) {
      return {
        error:
          "Invalid email or password. Use your work email, or G16 / team123 for full admin access.",
      };
    }
    if (employee.status !== "active") {
      return { error: "This employee account is not active." };
    }
    if (!verifyEmployeePassword(employee, password)) {
      return {
        error:
          "Invalid email or password. Use your work email, or G16 / team123 for full admin access.",
      };
    }

    const jar = await cookies();
    jar.set(TEAM_COOKIE, employee.id, COOKIE_OPTIONS);
    jar.delete("harborline_team");
    redirect("/ops");
  } catch (err) {
    // Next.js redirect() throws a special error — rethrow it.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("teamLogin failed:", err);
    return {
      error:
        "Could not sign in right now. Check your connection and try again, or use G16 / team123 for admin access.",
    };
  }
}

export async function teamLogout() {
  const jar = await cookies();
  jar.delete(TEAM_COOKIE);
  jar.delete("harborline_team");
  redirect("/");
}
