-- Harborline: full department budgets (2025 + 2026) + occupancy fix
-- Portfolio trimmed to 3 properties: Grandview, Meridian Tower, Riverbend

BEGIN;

CREATE TEMP TABLE props (
  id text PRIMARY KEY,
  name text NOT NULL,
  units int NOT NULL,
  monthly_rent numeric NOT NULL,
  annual_opex_2026 numeric NOT NULL,
  annual_opex_2025 numeric NOT NULL,
  ar_2026 numeric NOT NULL,
  ar_2025 numeric NOT NULL,
  target_occ int NOT NULL,
  distressed boolean NOT NULL DEFAULT false
);

INSERT INTO props VALUES
  ('prop-grandview', 'Grandview Apartments', 300, 478500, 2577600, 2422944, 5502720, 5160000, 82, false),
  ('prop-meridian-tower', 'Meridian Tower', 12, 312000, 2250000, 2115000, 3590400, 3369600, 75, false),
  ('00000000-0000-4000-8000-0000000000b1', 'Riverbend Commerce Center', 24, 86000, 464400, 436536, 990720, 928800, 88, false);

CREATE TEMP TABLE cats (
  dept text,
  key text,
  label text,
  dept_share numeric,
  cat_share numeric
);

INSERT INTO cats VALUES
  ('maintenance','hvac','HVAC',0.55,0.18),
  ('maintenance','plumbing','Plumbing',0.55,0.12),
  ('maintenance','electrical','Electrical',0.55,0.10),
  ('maintenance','structural','Structural',0.55,0.12),
  ('maintenance','janitorial','Janitorial',0.55,0.10),
  ('maintenance','landscaping','Landscaping',0.55,0.08),
  ('maintenance','security','Security',0.55,0.06),
  ('maintenance','appliance','Appliance',0.55,0.08),
  ('maintenance','general','General repair',0.55,0.12),
  ('maintenance','other','Other',0.55,0.04),
  ('sales_marketing','supplies','Supplies',0.20,0.10),
  ('sales_marketing','events','Events',0.20,0.22),
  ('sales_marketing','decoration','Decoration',0.20,0.12),
  ('sales_marketing','meals_entertainment','Meals & entertainment',0.20,0.16),
  ('sales_marketing','online_advertising','Online Advertising',0.20,0.40),
  ('executive','general','General',0.25,0.44),
  ('executive','travel','Travel',0.25,0.18),
  ('executive','professional_services','Professional services',0.25,0.26),
  ('executive','other','Other',0.25,0.12);

CREATE OR REPLACE FUNCTION tmp_months_from_annual(annual numeric)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  total int := greatest(0, round(annual)::int);
  base int := total / 12;
  rem int := total - base * 12;
  arr int[] := ARRAY[base,base,base,base,base,base,base,base,base,base,base,base];
BEGIN
  arr[12] := arr[12] + rem;
  RETURN to_jsonb(arr);
END;
$$;

INSERT INTO shared_records (collection, id, payload, created_at, updated_at)
SELECT
  'property_budget_packs',
  'budget-pack-' || p.id || '-' || y.yr,
  jsonb_build_object(
    'id', 'budget-pack-' || p.id || '-' || y.yr,
    'propertyId', p.id,
    'propertyName', p.name,
    'fiscalYear', y.yr,
    'enabledBuiltIns', '["maintenance","sales_marketing","executive"]'::jsonb,
    'customDepartments', '[]'::jsonb,
    'createdAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ),
  timezone('utc', now()),
  timezone('utc', now())
FROM props p
CROSS JOIN (VALUES (2025), (2026)) AS y(yr)
ON CONFLICT (collection, id) DO UPDATE SET
  payload = excluded.payload,
  updated_at = excluded.updated_at;

DELETE FROM shared_records
WHERE collection = 'department_budgets'
  AND (payload->>'propertyId') IN (SELECT id FROM props)
  AND (payload->>'fiscalYear')::int IN (2025, 2026);

INSERT INTO shared_records (collection, id, payload, created_at, updated_at)
SELECT
  'department_budgets',
  'mgmt-budget-' || p.id || '-' || y.yr || '-' || c.dept || '-' || c.key,
  jsonb_build_object(
    'id', 'mgmt-budget-' || p.id || '-' || y.yr || '-' || c.dept || '-' || c.key,
    'propertyId', p.id,
    'propertyName', p.name,
    'fiscalYear', y.yr,
    'department', c.dept,
    'categoryKey', c.key,
    'label', c.label,
    'months', tmp_months_from_annual(
      (CASE WHEN y.yr = 2026 THEN p.annual_opex_2026 ELSE p.annual_opex_2025 END)
      * c.dept_share * c.cat_share
    ),
    'notes', CASE WHEN p.distressed THEN 'Distressed asset — elevated opex vs collections' ELSE '' END,
    'updatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ),
  timezone('utc', now()),
  timezone('utc', now())
FROM props p
CROSS JOIN (VALUES (2025), (2026)) AS y(yr)
CROSS JOIN cats c;

INSERT INTO shared_records (collection, id, payload, created_at, updated_at)
SELECT
  'rental_receivables',
  'ar-annual-' || p.id || '-' || y.yr,
  jsonb_build_object(
    'id', 'ar-annual-' || p.id || '-' || y.yr,
    'receivableId', 'AR-YR-' || upper(substr(replace(p.id, 'prop-', ''), 1, 8)) || '-' || y.yr,
    'kind', 'rental',
    'customerName', p.name || ' — rent roll',
    'customerId', 'roll-' || p.id,
    'unit', 'Portfolio',
    'property', p.name,
    'amount', CASE WHEN y.yr = 2026 THEN p.ar_2026 ELSE p.ar_2025 END,
    'amountReceived', CASE WHEN y.yr = 2026 THEN p.ar_2026 ELSE p.ar_2025 END,
    'disputed', false,
    'category', 'base_rent',
    'dueDate', y.yr || CASE WHEN y.yr = 2026 THEN '-08-05' ELSE '-12-15' END,
    'invoiceDate', y.yr || CASE WHEN y.yr = 2026 THEN '-01-01' ELSE '-01-05' END,
    'paymentMethod', 'ACH',
    'paymentReference', 'ACH-ANNUAL-' || y.yr,
    'description', 'Annual base rent collections',
    'notes', CASE
      WHEN p.distressed THEN 'Low occupancy collections — property underperforming'
      ELSE 'Annual rent collections for budget comparison'
    END,
    'createdAt', y.yr || '-01-10',
    'fileName', '',
    'period', y.yr || CASE WHEN y.yr = 2026 THEN '-08' ELSE '-12' END
  ),
  timezone('utc', now()),
  timezone('utc', now())
FROM props p
CROSS JOIN (VALUES (2025), (2026)) AS y(yr)
ON CONFLICT (collection, id) DO UPDATE SET
  payload = excluded.payload,
  updated_at = excluded.updated_at;

UPDATE shared_records sr
SET
  payload = sr.payload || jsonb_build_object(
    'occupancyPercent', p.target_occ::text,
    'monthlyRentRoll', p.monthly_rent::text,
    'tenantCount', greatest(1, round(p.units * p.target_occ / 100.0))::text
  ),
  updated_at = timezone('utc', now())
FROM props p
WHERE sr.collection = 'managed_properties' AND sr.id = p.id;

-- Clear any prior Riverbend unit rows before re-seeding roster
DELETE FROM shared_records
WHERE collection IN ('property_tenants', 'tenants')
  AND (
    payload->>'propertyName' = 'Riverbend Commerce Center'
    OR payload->>'propertyLeased' = 'Riverbend Commerce Center'
    OR payload->>'propertyId' = '00000000-0000-4000-8000-0000000000b1'
  );

-- Riverbend: 24 units, 21 occupied (~88%)
WITH rb AS (
  SELECT * FROM generate_series(1, 24) AS u
),
rb_rows AS (
  SELECT
    u,
    u <= 21 AS occ,
    round((3100 + (u % 5) * 220)::numeric, 2) AS rent,
    (950 + (u % 4) * 80)::text AS sqft
  FROM rb
)
INSERT INTO shared_records (collection, id, payload, created_at, updated_at)
SELECT
  'property_tenants',
  'pt-riverbend-' || u,
  jsonb_build_object(
    'id', 'pt-riverbend-' || u,
    'propertyId', '00000000-0000-4000-8000-0000000000b1',
    'propertyName', 'Riverbend Commerce Center',
    'unit', CASE WHEN u <= 12 THEN 'Retail ' || u ELSE 'Office ' || (u - 12) END,
    'name', CASE WHEN occ THEN
      (ARRAY['Alex','Sam','Chris','Pat','Dana','Lee','Jesse','Kai','Remy','Shawn','Toni','Val','Wynn','Zoe','Ash','Bea','Cory','Dell','Eden','Fran','Gale'])[u]
      || ' ' ||
      (ARRAY['Carter','Diaz','Evans','Ford','Green','Hayes','Ingram','James','King','Lopez','Moss','Nash','Owen','Page','Quinn','Ross','Stone','Tucker','Underwood','Vance','Wells'])[u]
      ELSE '' END,
    'email', CASE WHEN occ THEN 'riverbend.tenant.' || u || '@harborline.example' ELSE '' END,
    'phone', CASE WHEN occ THEN '(662) 555-' || lpad((3000 + u)::text, 4, '0') ELSE '' END,
    'leaseStart', CASE WHEN occ THEN '2024-06-01' ELSE '' END,
    'leaseEnd', CASE WHEN occ THEN '2027-05-31' ELSE '' END,
    'monthlyRent', rent::text,
    'sqft', sqft,
    'status', CASE WHEN occ THEN 'active' ELSE 'vacant' END,
    'floorPlan', CASE WHEN u <= 12 THEN 'Retail bay' ELSE 'Office suite' END,
    'askingRent', rent::text,
    'fairMarketRent', rent::text,
    'achAutopay', CASE WHEN occ AND (u % 4 <> 3) THEN true ELSE false END
  ),
  timezone('utc', now()),
  timezone('utc', now())
FROM rb_rows;

INSERT INTO shared_records (collection, id, payload, created_at, updated_at)
SELECT
  'tenants',
  'ten-riverbend-' || u,
  jsonb_build_object(
    'id', 'ten-riverbend-' || u,
    'name',
      (ARRAY['Alex','Sam','Chris','Pat','Dana','Lee','Jesse','Kai','Remy','Shawn','Toni','Val','Wynn','Zoe','Ash','Bea','Cory','Dell','Eden','Fran','Gale'])[u]
      || ' ' ||
      (ARRAY['Carter','Diaz','Evans','Ford','Green','Hayes','Ingram','James','King','Lopez','Moss','Nash','Owen','Page','Quinn','Ross','Stone','Tucker','Underwood','Vance','Wells'])[u],
    'unit', CASE WHEN u <= 12 THEN 'Retail ' || u ELSE 'Office ' || (u - 12) END,
    'propertyLeased', 'Riverbend Commerce Center',
    'category', 'active',
    'pendingDue', 0,
    'monthlyRent', round((3100 + (u % 5) * 220)::numeric, 2),
    'sqft', 950 + (u % 4) * 80,
    'ageYears', 2,
    'dateLeased', '2024-06-01',
    'leaseEnd', '2027-05-31',
    'paymentStatus', 'current',
    'achAutopay', (u % 4) <> 3
  ),
  timezone('utc', now()),
  timezone('utc', now())
FROM generate_series(1, 21) AS u;

COMMIT;

-- Verification
SELECT 'budget_packs' AS metric, count(*)::int AS n
FROM shared_records WHERE collection = 'property_budget_packs'
UNION ALL
SELECT 'budget_lines_2025', count(*)::int FROM shared_records
WHERE collection = 'department_budgets' AND (payload->>'fiscalYear')::int = 2025
UNION ALL
SELECT 'budget_lines_2026', count(*)::int FROM shared_records
WHERE collection = 'department_budgets' AND (payload->>'fiscalYear')::int = 2026
UNION ALL
SELECT 'riverbend_occ', count(*)::int FROM shared_records
WHERE collection = 'property_tenants'
  AND payload->>'propertyName' = 'Riverbend Commerce Center'
  AND payload->>'status' = 'active';
