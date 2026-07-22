import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // ------------------------------------------------------------
  // 1. UTENTI (invariato nella logica, solo "STAFF" -> "ADMIN"
  //    perché il tuo enum Role ha USER / ADMIN / SUPERADMIN)
  // ------------------------------------------------------------
  const passwordAdmin = await bcrypt.hash("provaemailadmin", 12);
  const passwordStaff = await bcrypt.hash("provastaff", 12);
  const passwordUser = await bcrypt.hash("provauser", 12);

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

  await prisma.user.upsert({
    where: { email: "staff@esempio.com" },
    update: {},
    create: {
      email: "staff@esempio.com",
      username: "staff_membro",
      password: passwordStaff,
      role: "ADMIN",
    },
  });

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

  console.log("Utenti creati: Superadmin, Admin, User.");

  // ------------------------------------------------------------
  // 2. CATEGORY — il tipo di prodotto, sempre gli stessi 4
  // ------------------------------------------------------------
  await prisma.category.upsert({
    where: { slug: "carte" },
    update: {},
    create: { name: "Carte", slug: "carte" },
  });

  await prisma.category.upsert({
    where: { slug: "manga" },
    update: {},
    create: { name: "Manga", slug: "manga" },
  });

  await prisma.category.upsert({
    where: { slug: "funko" },
    update: {},
    create: { name: "Funko", slug: "funko" },
  });

  await prisma.category.upsert({
    where: { slug: "giochi-da-tavolo" },
    update: {},
    create: { name: "Giochi da Tavolo", slug: "giochi-da-tavolo" },
  });

  console.log("Categorie create: Carte, Manga, Funko, Giochi da Tavolo.");

  // ------------------------------------------------------------
  // 3. FRANCHISE — i brand, trasversali alle categorie
  // ------------------------------------------------------------


  await prisma.franchise.upsert({
    where: { slug: "one-piece" },
    update: {},
    create: { name: "One Piece", slug: "one-piece" },
  });

  await prisma.franchise.upsert({
    where: { slug: "naruto" },
    update: {},
    create: { name: "Naruto", slug: "naruto" },
  });

  console.log("Franchise creati One Piece, Naruto.");

  // I prodotti veri arriveranno dalle fetch verso le API esterne
  // (CardController, mangaController, boardGameController) — il seed
  // ora popola solo i dati di base (utenti, categorie, franchise),
  // niente più prodotti finti.

  console.log("Seed completato con successo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
