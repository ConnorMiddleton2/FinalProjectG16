import Link from "next/link";
import {
  listMyApplications,
  listMyPortalMessages,
} from "@/app/portal/tenant-account-actions";
import { getTenantPortalSession } from "@/lib/tenant-portal-accounts";
import { ProspectPortalClient } from "@/components/portal/ProspectPortalClient";

export async function ProspectPortalHome() {
  const account = await getTenantPortalSession();
  if (!account) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
        Session expired.{" "}
        <Link href="/login?next=/portal" className="underline">
          Sign in again
        </Link>
        .
      </div>
    );
  }

  const [applications, messages] = await Promise.all([
    listMyApplications(),
    listMyPortalMessages(),
  ]);

  return (
    <ProspectPortalClient
      account={{
        fullName: account.fullName,
        email: account.email,
        status: account.status,
        propertyName: account.propertyName,
        unit: account.unit,
        lookingFor: account.lookingFor,
      }}
      applications={applications.map((a) => ({
        id: a.id,
        property: a.property,
        building: a.building,
        unitLabel: a.unitLabel,
        proposedRent: a.proposedRent,
        smStatus: a.smStatus,
        status: a.status,
        leasePacketStatus: a.leasePacketStatus,
        createdAt: a.createdAt,
      }))}
      messages={messages.map((m) => ({
        id: m.id,
        subject: m.subject,
        body: m.body,
        fromRole: m.fromRole,
        createdAt: m.createdAt,
        availabilityJson: m.availabilityJson,
        relatedApplicationId: m.relatedApplicationId,
      }))}
    />
  );
}
