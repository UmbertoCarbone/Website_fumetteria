import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({});

prisma.$connect()
  .then(() => {
    console.info("✅ Connection successful");
  })
  .catch((err: unknown) => {
    console.error("❌ Errore di connessione al database:", err instanceof Error ? err.message : err);
  });

export default prisma;