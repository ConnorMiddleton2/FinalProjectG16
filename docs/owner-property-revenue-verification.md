# Owner property revenue — manual verification

## What to open

1. Sign in as demo owner: `bobowner@building.com` / `12345` at `/owners`
2. Open `/owners/dashboard`

You should see **Property income this period** above the property cards.

## Expected numbers (Bob → Riverbend Commerce Center)

AR seed base rent for Riverbend (current month):

| Tenant | Billed | Collected (amountReceived) |
|--------|--------|----------------------------|
| Northwind Retail | $7,200 | $7,200 |
| Cedar Dental | $4,850 | **$0** (cash-flow delay) |
| Lumen Creative | $7,320 | **$0** (HVAC dispute hold) |
| **Total** | | **$7,200** |

Contract fee: **4% of collections** (`percent_collections`).

| Line | Amount |
|------|--------|
| Property rent collected | **$7,200** |
| Harborline management fee (expense) | **$288** (= 7,200 × 4%) |
| Net after management fee | **$6,912** |

Per-property table should show one row (Riverbend) matching those totals. Portfolio total row = same (single property).

Trend bars: older months without exceptions typically show full Riverbend collections **$19,370** rent and **$774.80** fee (4%).

## Checks

1. Per-property rent sums to portfolio rent.
2. Per-property fee sums to portfolio fee.
3. Net = rent − fee (not Harborline “management fee income” as revenue).
4. Another owner’s login must not show Bob/Riverbend figures.
5. If AR store was empty, first load seeds `rental_receivables` via `ensureRentalReceivablesSeeded`.

## Notes

- Legacy Bob property named “Harborline Commons” is migrated to **Riverbend Commerce Center** on dashboard load so it matches AR property names.
- If a property has no AR match, the UI may fall back to rent-roll estimate and label that row.
