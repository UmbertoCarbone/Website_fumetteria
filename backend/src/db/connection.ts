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

/**
 * Client Prisma Esteso.
 * Intercetta qualsiasi operazione di scrittura sui prodotti (anche quelle da codice o Prisma Studio).
 * Se lo stock cambia, calcola in tempo reale lo stato di isAvailable.
 */
const prisma = basePrisma.$extends({
  query: {
    product: {
      async $allOperations({ operation, args, query }) {
        if (
          ["create", "update", "upsert", "updateMany", "createMany"].includes(
            operation,
          )
        ) {
          const argsWithData = args as any;

          // create / createMany / updateMany
          if (
            argsWithData.data &&
            typeof argsWithData.data.stock === "number"
          ) {
            argsWithData.data.isAvailable = argsWithData.data.stock > 0;
          }

          // update (stand-alone) e ramo update dell'upsert
          if (
            argsWithData.update &&
            typeof argsWithData.update.stock === "number"
          ) {
            argsWithData.update.isAvailable = argsWithData.update.stock > 0;
          }

          // ramo create dell'upsert
          if (
            argsWithData.create &&
            typeof argsWithData.create.stock === "number"
          ) {
            argsWithData.create.isAvailable = argsWithData.create.stock > 0;
          }
        }
        return query(args);
      },
    },
  },
});

export default prisma;
