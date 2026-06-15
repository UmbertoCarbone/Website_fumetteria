import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Generiamo gli hash delle password (puoi usare la stessa password per fare i test più velocemente)
  const passwordAdmin = await bcrypt.hash("provaemailadmin", 12);
  const passwordStaff = await bcrypt.hash("provastaff", 12);
  const passwordUser = await bcrypt.hash("provauser", 12);

  // 1. CREAZIONE SUPERADMIN
  await prisma.user.upsert({
    where: { email: "provaemailadmin@esempio.com" },
    update: {},
    create: {
      email: "provaemailadmin@esempio.com",
      username: "superadmin",
      password: passwordAdmin,
      role: "SUPERADMIN",
    },
  });

  // 2. CREAZIONE STAFF
  await prisma.user.upsert({
    where: { email: "staff@esempio.com" },
    update: {},
    create: {
      email: "staff@esempio.com",
      username: "staff_membro",
      password: passwordStaff,
      role: "STAFF", // Assicurati che questo ruolo esista nel tuo Enum di Prisma
    },
  });

  // 3. CREAZIONE USER SEMPLICE
  await prisma.user.upsert({
    where: { email: "user@esempio.com" },
    update: {},
    create: {
      email: "user@esempio.com",
      username: "utente_base",
      password: passwordUser,
      role: "USER",
    },
  });

  console.log("Seed eseguito con successo: Creati Superadmin, Staff e User.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
