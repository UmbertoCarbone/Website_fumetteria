import { Request, Response } from "express";
import prisma from "../db/connection.js";

// Mappatura per associare il nome della sottocategoria al parametro "game" richiesto dall'API
const gameMapping: Record<string, string> = {
  Pokemon: "pokemon",
  PokemonJP: "pokemon",
  "One Piece": "onepiece",
  YuGiOh: "yugioh",
};

// Funzione Helper interna per salvare nel database
const saveProductWithCategory = async (
  card: any,
  catName: string,
  subCatName: string,
) => {
  // 1. Trova/Crea Macro-Categoria
  const category = await prisma.category.upsert({
    where: { name: catName },
    update: {},
    create: { name: catName },
  });

  // 2. Trova/Crea Sotto-Categoria
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

// --- ROTTE ESPORTATE ---

export const syncPokemon = async (req: Request, res: Response) => {
  await performSync(req, res, "Carte", "Pokemon");
};

export const syncPokemonJp = async (req: Request, res: Response) => {
  await performSync(req, res, "Carte", "PokemonJP");
};

export const syncOnePiece = async (req: Request, res: Response) => {
  await performSync(req, res, "Carte", "One Piece");
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

    // Utilizzo della mappa per determinare il gioco
    const gameValue = gameMapping[sub] || "yugioh";

    const params = new URLSearchParams({
      q: (q as string) || "luffy", // Default dinamico o generico
      game: gameValue,
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

    if (!data.data) {
      throw new Error(data.message || "Errore nel recupero dati dall'API");
    }

    for (const card of data.data) {
      await saveProductWithCategory(card, cat, sub);
    }

    res
      .status(200)
      .json({ message: `Sincronizzazione completata per ${sub} in ${cat}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
