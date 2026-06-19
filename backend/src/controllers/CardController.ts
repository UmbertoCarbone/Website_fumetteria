import { Request, Response } from "express";
import prisma from "../db/connection.js";

const gameMapping: Record<string, string> = {
  Pokemon: "pokemon",
  PokemonJP: "pokemon",
  "One Piece": "onepiece",
  YuGiOh: "yugioh",
};

const saveProductWithCategory = async (
  card: any,
  catName: string,
  subCatName: string,
) => {
  const category = await prisma.category.upsert({
    where: { name: catName },
    update: {},
    create: { name: catName },
  });

  const subCategory = await prisma.subCategory.upsert({
    where: { name_categoryId: { name: subCatName, categoryId: category.id } },
    update: {},
    create: { name: subCatName, categoryId: category.id },
  });

  const marketPrice = card.prices?.raw?.near_mint?.tcgplayer?.market || 0;
  const defaultStock = 10;

  return await prisma.product.upsert({
    where: { externalId: card.id },
    update: {
      price: Number(marketPrice),
    },
    create: {
      externalId: card.id,
      name: `${card.name} (${card.number || "N/D"})`,
      price: Number(marketPrice),
      stock: defaultStock,
      imageUrl: card.image_url,
      subCategoryId: subCategory.id,
    },
  });
};

const performSync = async (
  req: Request,
  res: Response,
  cat: string,
  sub: string,
) => {
  try {
    const { q, set, limit } = req.query;

    if (!q || typeof q !== "string" || q.trim() === "") {
      return res.status(400).json({
        error: true,
        message:
          "Richiesta non valida: il parametro di ricerca 'q' è obbligatorio nell'URL.",
      });
    }

    const apiKey = process.env.CARD_API_KEY;
    const gameValue = gameMapping[sub] || "yugioh";

    const queryParams: Record<string, string> = {
      q: q.trim(),
      game: gameValue,
    };
    if (set) queryParams.set = String(set).trim();
    if (limit) queryParams.limit = String(limit).trim();

    const params = new URLSearchParams(queryParams);

    const apiResponse = await fetch(
      `https://api.tcgpricelookup.com/v1/cards/search?${params.toString()}`,
      { headers: { "X-API-Key": apiKey!, Accept: "application/json" } },
    );

    const data = await apiResponse.json();

    if (!data.data) {
      throw new Error(data.message || "Errore nel recupero dati dall'API");
    }

    for (const card of data.data) {
      await saveProductWithCategory(card, cat, sub);
    }

    res.status(200).json({
      error: false,
      message: `Sincronizzazione completata con successo per ${sub} in ${cat}!`,
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message });
  }
};

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
