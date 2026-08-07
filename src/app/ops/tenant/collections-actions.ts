"use server";

import { requireOpsModule } from "@/lib/team-auth";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { CollectionsNotice } from "@/lib/collections";
import type {
  TenantAccount,
  TenantPortalMessage,
} from "@/lib/tenant-portal-accounts";

/**
 * Mirror collections notices into the tenant portal inbox (idempotent by notice id).
 */
export async function syncDelinquencyPortalMessagesAction(
  notices: CollectionsNotice[]
) {
  await requireOpsModule("tenant");
  if (!notices.length) return { ok: true as const, posted: 0 };

  const client = await createClient();
  const [accounts, existingMsgs] = await Promise.all([
    listSharedRecords<TenantAccount>(client, COLLECTIONS.tenantAccounts),
    listSharedRecords<TenantPortalMessage>(
      client,
      COLLECTIONS.tenantPortalMessages
    ),
  ]);

  const byEmail = new Map(
    accounts.map((a) => [a.email.trim().toLowerCase(), a])
  );
  const existingIds = new Set(existingMsgs.map((m) => m.id));
  let posted = 0;

  for (const notice of notices) {
    const email = (notice.intendedEmail || "").trim().toLowerCase();
    if (!email) continue;
    const account = byEmail.get(email);
    if (!account) continue;

    const msgId = `tpm-delinq-${notice.id}`;
    if (existingIds.has(msgId)) continue;

    const row: TenantPortalMessage = {
      id: msgId,
      tenantAccountId: account.id,
      tenantEmail: account.email,
      fromRole: "system",
      subject: notice.subject,
      body:
        notice.noticeBody ||
        notice.noticeSummary ||
        "Your rent account is overdue. Please review your balance and pay through the portal.",
      relatedApplicationId: "",
      availabilityJson: "",
      createdAt: notice.generatedAt || new Date().toISOString(),
      readAt: "",
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.tenantPortalMessages,
      row.id,
      row as unknown as Record<string, unknown>
    );
    existingIds.add(msgId);
    posted += 1;
  }

  return { ok: true as const, posted };
}
