-- Funzione che calcola isAvailable in base allo stock
CREATE OR REPLACE FUNCTION sync_product_is_available()
RETURNS TRIGGER AS $$
BEGIN
  NEW."isAvailable" = NEW.stock > 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE INSERT OR UPDATE: scatta sempre, incluso Prisma Studio
CREATE TRIGGER trg_product_is_available
BEFORE INSERT OR UPDATE OF stock ON "Product"
FOR EACH ROW
EXECUTE FUNCTION sync_product_is_available();

-- Allinea i record già presenti nel DB
UPDATE "Product" SET "isAvailable" = (stock > 0);
