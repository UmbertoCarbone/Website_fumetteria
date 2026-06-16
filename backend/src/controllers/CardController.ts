// config/cardController.ts
import { Request, Response } from "express";
import prisma from "../db/connection.js";

// Funzione upsert per evitare duplicati
const upsertProduct = async (
  card: any,
  categoryId: string,
  subCategoryId: string,
) => {
  const uniqueId = String(card.id); // Assicuriamoci che sia stringa
  const marketPrice = card.prices?.raw?.near_mint?.tcgplayer?.market || 4.99;

  return await prisma.product.upsert({
    where: { externalId: uniqueId },
    update: { price: Number(marketPrice) },
    create: {
      externalId: uniqueId,
      title: card.name || "Carta TCG",
      description: `Set: ${card.set?.name || "Generico"} - Rarità: ${card.rarity || "N/D"}`,
      price: Number(marketPrice),
      stock: 10,
      imageUrl: card.image_url,
      categoryId,
      subCategoryId,
    },
  });
};

export const syncTcgProducts = async (req: Request, res: Response) => {
  const { q, game, set, rarity, limit, offset } = req.query;

  try {
    const apiKey = process.env.CARD_API_KEY;
    if (!apiKey)
      return res.status(401).json({ error: true, message: "API Key mancante" });

    // URL CORRETTO come nella versione che funzionava
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
      throw new Error(
        `Errore API: ${apiResponse.status} - ${await apiResponse.text()}`,
      );
    }

    const responseData = await apiResponse.json();
    const cards = responseData.data || [];

    if (cards.length === 0)
      return res.status(404).json({ message: "Nessuna carta trovata." });

    // Setup categorie
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

    for (const card of cards) {
      await upsertProduct(card, category.id, subCategory.id);
    }

    res
      .status(200)
      .json({ message: `Sincronizzazione completata: ${cards.length} carte.` });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message });
  }
};
