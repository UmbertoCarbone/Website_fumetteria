-- Trigger a livello di database: mantiene "isAvailable" coerente con "stock"
-- per QUALSIASI scrittura sulla tabella Product, incluse quelle che non
-- passano dal client Prisma esteso dell'app (Prisma Studio, script,
-- SQL diretto, seed, ecc.), che la sola logica applicativa non può coprire.
CREATE OR REPLACE FUNCTION sync_product_availability()
RETURNS TRIGGER AS $$
BEGIN
  NEW."isAvailable" := NEW."stock" > 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_availability ON "Product";

CREATE TRIGGER trg_product_availability
BEFORE INSERT OR UPDATE ON "Product"
FOR EACH ROW
EXECUTE FUNCTION sync_product_availability();

-- Backfill una tantum: corregge le righe già fuori sync (es. modifiche
-- fatte a mano da Prisma Studio prima che il trigger esistesse).
UPDATE "Product" SET "isAvailable" = ("stock" > 0) WHERE "isAvailable" IS DISTINCT FROM ("stock" > 0);
