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
  const categorieCarte = await prisma.category.upsert({
    where: { slug: "carte" },
    update: {},
    create: { name: "Carte", slug: "carte" },
  });

  const categoriaManga = await prisma.category.upsert({
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
  const franchisePokemon = await prisma.franchise.upsert({
    where: { slug: "pokemon" },
    update: {},
    create: { name: "Pokemon", slug: "pokemon" },
  });

  const franchiseOnePiece = await prisma.franchise.upsert({
    where: { slug: "one-piece" },
    update: {},
    create: { name: "One Piece", slug: "one-piece" },
  });

  await prisma.franchise.upsert({
    where: { slug: "naruto" },
    update: {},
    create: { name: "Naruto", slug: "naruto" },
  });

  console.log("Franchise creati: Pokemon, One Piece, Naruto.");

  // ------------------------------------------------------------
  // 4. PRODUCT DI ESEMPIO — una carta e un manga, per verificare
  //    che le relazioni Category / Franchise / Detail funzionino
  // ------------------------------------------------------------
  const cartaPokemon = await prisma.product.upsert({
    where: { sku: "CARD-POK-001" },
    update: {},
    create: {
      sku: "CARD-POK-001",
      name: "Charizard - Base Set 4/102",
      description: "Carta Pokemon rara, Base Set.",
      images: [],
      price: 250.0,
      stock: 3,
      isAvailable: true,
      categoryId: categorieCarte.id,
      franchiseId: franchisePokemon.id,
      card: {
        create: {
          number: "4/102",
          rarity: "Holo Rare",
          set: "Base Set",
          variant: "1st Edition",
        },
      },
    },
  });

  const mangaOnePiece = await prisma.product.upsert({
    where: { sku: "MANGA-OP-001" },
    update: {},
    create: {
      sku: "MANGA-OP-001",
      name: "One Piece Vol. 1 - Romance Dawn",
      description: "Primo volume del manga di One Piece.",
      images: [],
      price: 5.5,
      stock: 20,
      isAvailable: true,
      categoryId: categoriaManga.id,
      franchiseId: franchiseOnePiece.id,
      manga: {
        create: {
          volumeNumber: 1,
          author: "Eiichiro Oda",
          publisher: "Star Comics",
          synopsis:
            "Monkey D. Rufy inizia il suo viaggio per diventare il Re dei Pirati.",
        },
      },
    },
  });

  console.log(
    "Prodotti di esempio creati:",
    cartaPokemon.name,
    "/",
    mangaOnePiece.name,
  );
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
