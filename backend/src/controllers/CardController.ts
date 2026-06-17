// backend/controllers/cardController.ts
import { Request, Response } from "express";
import prisma from "../db/connection.js";

const upsertProduct = async (
  card: any,
  categoryId: string,
  subCategoryId: string,
) => {
  const marketPrice = card.prices?.raw?.near_mint?.tcgplayer?.market || 0;

  // Il titolo ora è pulito, il dettaglio è nelle colonne dedicate
  const title = `${card.name} (${card.number})`;

  return await prisma.product.upsert({
    where: { externalId: card.id },
    update: {
      price: Number(marketPrice),
      stock: 10,
    },
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
      categoryId: categoryId,
      subCategoryId: subCategoryId,
      isPreorder: false,
    },
  });
};

export const syncTcgProducts = async (req: Request, res: Response) => {
  const { q, game, set, rarity, limit, offset } = req.query;

  try {
    const apiKey = process.env.CARD_API_KEY;
    if (!apiKey)
      return res.status(401).json({ error: true, message: "API Key mancante" });

    const baseUrl = "https://api.tcgpricelookup.com/v1/cards/search";
    const params = new URLSearchParams({
      q: (q as string) || "charizard",
      game: (game as string) || "pokemon",
      ...(set && { set: set as string }),
      ...(rarity && { rarity: rarity as string }),
      ...(limit && { limit: limit as string }),
      ...(offset && { offset: offset as string }),
    });

    const apiResponse = await fetch(`${baseUrl}?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    if (!apiResponse.ok) {
      throw new Error(`Errore API: ${apiResponse.status}`);
    }

    const responseData = await apiResponse.json();
    const cards = responseData.data || [];

    if (cards.length === 0)
      return res.status(404).json({ message: "Nessuna carta trovata." });

    // Setup categorie (resta invariato)
    const category = await prisma.category.upsert({
      where: { name: "Giochi" },
      update: {},
      create: { name: "Giochi" },
    });
    const subCategory = await prisma.subCategory.upsert({
      where: {
        name_categoryId: { name: "Carte TCG", categoryId: category.id },
      },
      update: {},
      create: { name: "Carte TCG", categoryId: category.id },
    });

    // Loop di salvataggio
    for (const card of cards) {
      await upsertProduct(card, category.id, subCategory.id);
    }

    res.status(200).json({
      message: `Sincronizzazione completata: ${cards.length} carte salvate correttamente.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message });
  }
};
