import { PrismaClient } from "@prisma/client";

const basePrisma = new PrismaClient({});

basePrisma
  .$connect()
  .then(() => {
    console.info("✅ Connection successful");
  })
  .catch((err: unknown) => {
    console.error(
      "❌ Errore di connessione al database:",
      err instanceof Error ? err.message : err,
    );
  });

function computeAvailability(stock: number): boolean {
  return stock > 0;
}

type WritableRecord = Record<string, unknown>;

// create: lo stock, se assente, vale 0 di default (come da schema) -> isAvailable sempre coerente.
function forceCreateAvailability(data: WritableRecord | undefined) {
  if (!data) return;
  data.isAvailable = computeAvailability(
    typeof data.stock === "number" ? data.stock : 0,
  );
}

// update: isAvailable va ricalcolato solo se lo stock cambia in questa stessa chiamata;
// un eventuale isAvailable passato manualmente viene sempre ignorato per evitare disallineamenti.
function syncUpdateAvailability(data: WritableRecord | undefined) {
  if (!data) return;
  if (typeof data.stock === "number") {
    data.isAvailable = computeAvailability(data.stock);
  } else {
    delete data.isAvailable;
  }
}

/**
 * Client Prisma Esteso.
 * Intercetta qualsiasi operazione di scrittura sui prodotti (anche quelle da codice o Prisma Studio).
 * isAvailable non è mai accettato in input: viene sempre ricalcolato da stock,
 * così resta coerente indipendentemente da dove/come viene scritto il prodotto.
 */
const prisma = basePrisma.$extends({
  query: {
    product: {
      async $allOperations({ operation, args, query }) {
        const argsWithData = args as any;

        switch (operation) {
          case "create":
            forceCreateAvailability(argsWithData.data);
            break;
          case "createMany":
            if (Array.isArray(argsWithData.data)) {
              argsWithData.data.forEach(forceCreateAvailability);
            }
            break;
          case "update":
          case "updateMany":
            syncUpdateAvailability(argsWithData.data);
            break;
          case "upsert":
            forceCreateAvailability(argsWithData.create);
            syncUpdateAvailability(argsWithData.update);
            break;
        }

        return query(args);
      },
    },
  },
});

export default prisma;
