"use server";

import { requireOpsModule } from "@/lib/team-auth";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  buildAssetsForProperty,
  normalizeAssetOwnership,
  type PropertyAsset,
} from "@/lib/property-assets";

/** Ensure each managed property has a seeded PP&E package. */
export async function ensurePropertyAssetsAction() {
  await requireOpsModule("assets");
  const client = await createClient();
  const [existing, properties] = await Promise.all([
    listSharedRecords<PropertyAsset>(client, COLLECTIONS.propertyAssets),
    listSharedRecords<ManagementContractDraft>(
      client,
      COLLECTIONS.managedProperties
    ),
  ]);

  const byProperty = new Set(existing.map((a) => a.propertyId));
  const now = new Date().toISOString();
  let created = 0;

  for (const property of properties) {
    if (byProperty.has(property.id)) continue;
    const assets = buildAssetsForProperty(
      {
        id: property.id,
        propertyName: property.propertyName,
        yearBuilt: property.yearBuilt,
        yearRenovated: property.yearRenovated,
        rentableSf: property.rentableSf,
        grossSf: property.grossSf,
        monthlyRentRoll: property.monthlyRentRoll,
      },
      now
    );
    for (const asset of assets) {
      await upsertSharedRecord(
        client,
        COLLECTIONS.propertyAssets,
        asset.id,
        asset as unknown as Record<string, unknown>
      );
      created += 1;
    }
  }

  return { ok: true as const, created, propertyCount: properties.length };
}

export async function savePropertyAssetAction(asset: PropertyAsset) {
  await requireOpsModule("assets");
  if (!asset.propertyId || !asset.name.trim()) {
    return { error: "Property and asset name are required." as const };
  }
  const client = await createClient();
  const next: PropertyAsset = {
    ...asset,
    name: asset.name.trim(),
    ownership: normalizeAssetOwnership(asset.ownership),
    updatedAt: new Date().toISOString(),
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.propertyAssets,
    next.id,
    next as unknown as Record<string, unknown>
  );
  return { ok: true as const, asset: next };
}
