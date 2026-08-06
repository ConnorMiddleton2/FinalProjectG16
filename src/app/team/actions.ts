"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TEAM_COOKIE } from "@/lib/team-auth";

export async function teamLogout() {
  const jar = await cookies();
  jar.delete(TEAM_COOKIE);
  redirect("/");
}
