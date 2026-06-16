import { Request, Response } from "express";
import prisma from "../db/connection.js";

export const syncTcgProducts = async (req: Request, res: Response) => {
  const gameSlug = (req.query.game as string) || "pokemon";
  const searchQuery = (req.query.q as string) || "charizard";
  const maxLimit = parseInt(req.query.limit as string) || 20;

  try {
    const apiKey = process.env.CARD_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: true,
        message: "Chiave API mancante nel file .env",
      });
    }

    console.log(
      `🔄 Avvio sincronizzazione: Gioco [${gameSlug}], Query [${searchQuery}]...`,
    );

    // 1. Allineamento Categorie
    const category = await prisma.category.upsert({
      where: { name: "Giochi" },
      update: {},
      create: { name: "Giochi" },
    });

    const subCategoryName =
      gameSlug === "pokemon"
        ? "Carte Pokémon"
        : gameSlug === "yugioh"
          ? "Carte Yu-Gi-Oh!"
          : gameSlug === "onepiece"
            ? "Carte One Piece"
            : "Carte TCG";

    const subCategory = await prisma.subCategory.upsert({
      where: {
        name_categoryId: { name: subCategoryName, categoryId: category.id },
      },
      update: {},
      create: { name: subCategoryName, categoryId: category.id },
    });

    // 2. Chiamata API con Header multipli per sicurezza
    const apiUrl = `https://api.tcgpricelookup.com/v1/cards/search?q=${encodeURIComponent(searchQuery)}&game=${gameSlug}&limit=${maxLimit}`;

    const apiResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`❌ Errore API ${apiResponse.status}:`, errorText);
      throw new Error(
        `Errore API Esterna: ${apiResponse.status} - ${errorText}`,
      );
    }

    const responseData = (await apiResponse.json()) as any;
    const cards = responseData.data || [];

    if (cards.length === 0) {
      return res
        .status(404)
        .json({ error: true, message: "Nessuna carta trovata." });
    }

    // 3. Salvataggio Prodotti
    let importedCount = 0;
    for (const card of cards) {
      let publisherId: string | null = null;
      if (card.set?.name) {
        const pub = await prisma.publisher.upsert({
          where: { name: card.set.name },
          update: {},
          create: { name: card.set.name },
        });
        publisherId = pub.id;
      }

      const marketPrice =
        card.prices?.raw?.near_mint?.tcgplayer?.market || 4.99;

      await prisma.product.create({
        data: {
          title: card.name || "Carta TCG",
          description: `Rarità: ${card.rarity || "N/D"} - Set: ${card.set?.name || "Generico"}`,
          price: Number(marketPrice),
          stock: Math.floor(Math.random() * 20) + 1,
          imageUrl: card.image_url || null,
          isPreorder: false,
          categoryId: category.id,
          subCategoryId: subCategory.id,
          publisherId: publisherId,
        },
      });
      importedCount++;
    }

    res
      .status(200)
      .json({
        error: false,
        message: "Sincronizzazione completata",
        imported: importedCount,
      });
  } catch (error: any) {
    console.error("❌ Errore:", error.message);
    res.status(500).json({ error: true, message: error.message });
  }
};
