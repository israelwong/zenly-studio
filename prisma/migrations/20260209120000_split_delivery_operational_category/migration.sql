-- Recrear enum OperationalCategory con DIGITAL_DELIVERY y PHYSICAL_DELIVERY (evita "new value must be committed")
-- y migrar DELIVERY → DIGITAL_DELIVERY en una sola transacción.

CREATE TYPE "OperationalCategory_new" AS ENUM (
  'PRODUCTION',
  'POST_PRODUCTION',
  'DELIVERY',
  'DIGITAL_DELIVERY',
  'PHYSICAL_DELIVERY',
  'LOGISTICS'
);

ALTER TABLE "studio_items"
  ALTER COLUMN "operational_category" TYPE "OperationalCategory_new"
  USING (
    CASE WHEN "operational_category"::text = 'DELIVERY' THEN 'DIGITAL_DELIVERY'::"OperationalCategory_new"
         ELSE "operational_category"::text::"OperationalCategory_new"
    END
  );

DROP TYPE "OperationalCategory";
ALTER TYPE "OperationalCategory_new" RENAME TO "OperationalCategory";
