import { redirect } from "next/navigation";

/** Contracts live under Owner applications now. */
export default function Page() {
  redirect("/ops/management/owner-applications");
}
