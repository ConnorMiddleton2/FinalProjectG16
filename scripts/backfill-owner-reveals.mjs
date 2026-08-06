/**
 * Backfills passwordReveal + contact fields on existing owner_accounts
 * so Management can display credentials for seeded demo owners.
 *
 * Usage: node scripts/backfill-owner-reveals.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
  process.exit(1);
}

const sb = createClient(url, key);
const now = new Date().toISOString();

const KNOWN = {
  "jordan.hale@summitresidential.example": {
    passwordReveal: "OwnerDemo1!",
    companyName: "Summit Residential Partners LLC",
    phone: "(615) 555-0142",
  },
  "priya.desai@meridianholdings.example": {
    passwordReveal: "OwnerDemo1!",
    companyName: "Meridian Commercial Holdings",
    phone: "(312) 555-0198",
  },
  "marcus.webb@horizonsenior.example": {
    passwordReveal: "OwnerDemo1!",
    companyName: "Horizon Senior Living Group",
    phone: "(480) 555-0166",
  },
  "bobowner@building.com": {
    passwordReveal: "12345",
    companyName: "",
    phone: "",
  },
};

async function main() {
  const { data, error } = await sb
    .from("shared_records")
    .select("id, payload")
    .eq("collection", "owner_accounts");
  if (error) throw error;

  let updated = 0;
  for (const row of data || []) {
    const payload = { ...(row.payload || {}) };
    const email = String(payload.email || "").toLowerCase();
    const known = KNOWN[email];
    let changed = false;

    if (known) {
      if (!payload.passwordReveal) {
        payload.passwordReveal = known.passwordReveal;
        changed = true;
      }
      if (!payload.companyName && known.companyName) {
        payload.companyName = known.companyName;
        changed = true;
      }
      if (!payload.phone && known.phone) {
        payload.phone = known.phone;
        changed = true;
      }
    }

    // Legacy plaintext password → also copy into reveal
    if (
      !payload.passwordReveal &&
      typeof payload.password === "string" &&
      payload.password &&
      !String(payload.password).includes(":")
    ) {
      payload.passwordReveal = payload.password;
      changed = true;
    }

    if (!changed) continue;

    const { error: upErr } = await sb.from("shared_records").upsert(
      {
        collection: "owner_accounts",
        id: row.id,
        payload: { ...payload, id: row.id },
        updated_at: now,
      },
      { onConflict: "collection,id" }
    );
    if (upErr) throw upErr;
    updated++;
    console.log(`Updated reveal for ${email}`);
  }

  console.log(JSON.stringify({ owners: (data || []).length, updated }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
