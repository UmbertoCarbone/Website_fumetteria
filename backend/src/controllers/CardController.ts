import { Request, Response } from "express";
import prisma from "../db/connection.js";

// Funzione Helper interna (non esportata)
const saveProductWithCategory = async (
  card: any,
  catName: string,
  subCatName: string,
) => {
  // 1. Trova/Crea Macro-Categoria (es. "Carte")
  const category = await prisma.category.upsert({
    where: { name: catName },
    update: {},
    create: { name: catName },
  });

  // 2. Trova/Crea Sotto-Categoria (es. "Pokemon", "PokemonJP")
  const subCategory = await prisma.subCategory.upsert({
    where: { name_categoryId: { name: subCatName, categoryId: category.id } },
    update: {},
    create: { name: subCatName, categoryId: category.id },
  });

  // 3. Esegui l'upsert del prodotto
  const marketPrice = card.prices?.raw?.near_mint?.tcgplayer?.market || 0;
  const title = `${card.name} (${card.number})`;

  return await prisma.product.upsert({
    where: { externalId: card.id },
    update: { price: Number(marketPrice), stock: 10 },
    create: {
      externalId: card.id,
      tcgplayerId: String(card.tcgplayer_id || ""),
      name: card.name,
      number: card.number,
      rarity: card.rarity,
      variant: card.variant,
      title: title,
      description: `Set: ${card.set?.name || "Generico"} - Rarità: ${card.rarity || "N/D"}`,
      price: Number(marketPrice),
      stock: 10,
      imageUrl: card.image_url,
      categoryId: category.id,
      subCategoryId: subCategory.id,
      isPreorder: false,
    },
  });
};

// --- LE TUE ROTTE SPECIFICHE ---

export const syncPokemon = async (req: Request, res: Response) => {
  await performSync(req, res, "Carte", "Pokemon");
};

export const syncPokemonJp = async (req: Request, res: Response) => {
  await performSync(req, res, "Carte", "PokemonJP");
};

export const syncYugioh = async (req: Request, res: Response) => {
  await performSync(req, res, "Carte", "YuGiOh");
};

// Funzione comune per chiamare l'API
const performSync = async (
  req: Request,
  res: Response,
  cat: string,
  sub: string,
) => {
  try {
    const { q, set, limit } = req.query;
    const apiKey = process.env.CARD_API_KEY;

    const params = new URLSearchParams({
      q: (q as string) || "charizard",
      game: sub === "Pokemon" || sub === "PokemonJP" ? "pokemon" : "yugioh", // Esempio logica
      ...(set && { set: set as string }),
      ...(limit && { limit: limit as string }),
    });

    const apiResponse = await fetch(
      `https://api.tcgpricelookup.com/v1/cards/search?${params.toString()}`,
      {
        headers: { "X-API-Key": apiKey!, Accept: "application/json" },
      },
    );

    const data = await apiResponse.json();
    for (const card of data.data) {
      await saveProductWithCategory(card, cat, sub);
    }
    res.status(200).json({ message: `Salvato in ${cat} -> ${sub}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
