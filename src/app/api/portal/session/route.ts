import { NextResponse } from "next/server";
import { getCurrentPortalTenant } from "@/lib/portal/auth-server";

/** Client-readable portal session (for hooks that cannot read httpOnly cookies). */
export async function GET() {
  const session = await getCurrentPortalTenant();
  if (!session) {
    return NextResponse.json({ session: null }, { status: 401 });
  }
  return NextResponse.json({ session });
}
