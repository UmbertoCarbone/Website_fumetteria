import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({});

prisma.$connect()
  .then(() => {
    console.info("✅ Connection successfull");
  })
  .catch((err) => {
    console.error("❌ Errore di connessione al database:", err);
  });

export default prisma;