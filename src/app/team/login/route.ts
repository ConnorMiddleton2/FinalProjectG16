import { NextRequest, NextResponse } from "next/server";
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

function redirectWithTeamCookie(request: NextRequest, value: string, to = "/ops") {
  const response = NextResponse.redirect(new URL(to, request.url), 303);
  response.cookies.set(TEAM_COOKIE, value, COOKIE_OPTIONS);
  return response;
}

function redirectWithError(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/team?error=${encodeURIComponent(message)}`, request.url),
    303
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const loginId = String(
    formData.get("email") ?? formData.get("companyId") ?? ""
  ).trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!loginId || !password) {
    return redirectWithError(
      request,
      "Enter both email (or company ID) and password."
    );
  }

  const expected = getTeamCredentials();
  const isAdmin =
    loginId.toUpperCase() === expected.companyId.toUpperCase() &&
    password === expected.password;

  if (isAdmin) {
    return redirectWithTeamCookie(request, TEAM_COOKIE_ADMIN);
  }

  const client = await createClient();
  const employee = await findEmployeeByEmail(client, loginId);
  if (!employee) {
    return redirectWithError(
      request,
      "Invalid email or password. Use your work email, or G16 / team123 for full admin access."
    );
  }
  if (employee.status !== "active") {
    return redirectWithError(request, "This employee account is not active.");
  }
  if (!verifyEmployeePassword(employee, password)) {
    return redirectWithError(
      request,
      "Invalid email or password. Use your work email, or G16 / team123 for full admin access."
    );
  }

  return redirectWithTeamCookie(request, employee.id);
}
