"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  COLLECTIONS,
  deleteSharedRecord,
  listSharedRecords,
  replaceSharedCollection,
  upsertSharedRecord,
  type SharedCollection,
} from "@/lib/shared-store";

export function useSharedCollection<T extends { id: string }>(
  collection: SharedCollection,
  seed?: () => T[]
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const supabase = createClient();
      let rows = await listSharedRecords<T>(supabase, collection);
      if (rows.length === 0 && seed) {
        const seeded = seed();
        for (const row of seeded) {
          await upsertSharedRecord(
            supabase,
            collection,
            row.id,
            row as unknown as Record<string, unknown>
          );
        }
        rows = seeded;
      }
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shared load failed.");
    } finally {
      setLoading(false);
    }
  }, [collection, seed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveOne = useCallback(
    async (item: T) => {
      const supabase = createClient();
      await upsertSharedRecord(
        supabase,
        collection,
        item.id,
        item as unknown as Record<string, unknown>
      );
      setItems((prev) => {
        const without = prev.filter((p) => p.id !== item.id);
        return [item, ...without];
      });
    },
    [collection]
  );

  const saveAll = useCallback(
    async (next: T[]) => {
      const supabase = createClient();
      await replaceSharedCollection(
        supabase,
        collection,
        next as Array<{ id: string } & Record<string, unknown>>
      );
      setItems(next);
    },
    [collection]
  );

  const removeOne = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await deleteSharedRecord(supabase, collection, id);
      setItems((prev) => prev.filter((p) => p.id !== id));
    },
    [collection]
  );

  return {
    items,
    setItems,
    loading,
    error,
    refresh,
    saveOne,
    saveAll,
    removeOne,
  };
}

export { COLLECTIONS };
