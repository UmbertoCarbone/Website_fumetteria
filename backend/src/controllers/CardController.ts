import { Request, Response } from "express";
import prisma from "../db/connection.js";
import { resolveCategory, resolveFranchise } from "../service/catalogSync.js"

// Mapping per uniformare i nomi dei giochi verso l'API e verso il Franchise canonico
const gameMapping: Record<string, { apiValue: string; franchiseName: string }> = {
  Pokemon: { apiValue: "pokemon", franchiseName: "Pokémon" },
  PokemonJP: { apiValue: "pokemon", franchiseName: "Pokémon" },
  "One Piece": { apiValue: "onepiece", franchiseName: "One Piece" },
  YuGiOh: { apiValue: "yugioh", franchiseName: "Yu-Gi-Oh!" },
};

const saveCardProduct = async (card: any, subCatName: string) => {
  const mappingInfo = gameMapping[subCatName] || {
    apiValue: "yugioh",
    franchiseName: subCatName,
  };

  const setName = card.set?.name || "Unknown Set";
  const marketPrice = card.prices?.raw?.near_mint?.tcgplayer?.market || 0;
  const externalId = String(card.id);

  return await prisma.$transaction(async (tx) => {
    // Category fissa per tutte le carte, indipendentemente dal gioco
    const category = await resolveCategory(tx, "carte", "Carte");

    // Franchise dinamico: se "Pokemon" non esiste ancora lo crea al volo
    const franchise = await resolveFranchise(
      tx,
      subCatName,
      "TCG_PRICE_LOOKUP",
      mappingInfo.franchiseName,
    );

    // Product: upsert idempotente su externalId + source
    const product = await tx.product.upsert({
      where: {
        externalId_externalSource: {
          externalId,
          externalSource: "TCG_PRICE_LOOKUP",
        },
      },
      update: {
        price: Number(marketPrice),
      },
      create: {
        sku: `CARD-${externalId}`,
        name: `${card.name} (${card.number || "N/D"})`,
        price: Number(marketPrice),
        stock: 10,
        isAvailable: true,
        categoryId: category.id,
        franchiseId: franchise.id,
        externalId,
        externalSource: "TCG_PRICE_LOOKUP",
      },
    });

    // Dettaglio carta: upsert su productId (la FK sta sulla tabella figlia)
    await tx.card.upsert({
      where: { productId: product.id },
      update: {
        number: card.number,
        rarity: card.rarity || "Common",
        set: setName,
        variant: card.variant || "",
      },
      create: {
        productId: product.id,
        number: card.number,
        rarity: card.rarity || "Common",
        set: setName,
        variant: card.variant || "",
      },
    });

    return product;
  });
};

const performSync = async (req: Request, res: Response, sub: string) => {
  try {
    const { q, set, limit } = req.query;

    if (!q || typeof q !== "string" || q.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Richiesta non valida: il parametro 'q' è obbligatorio.",
      });
    }

    const apiKey = process.env.CARD_API_KEY;
    const mappingInfo = gameMapping[sub] || {
      apiValue: "yugioh",
      franchiseName: "Yu-Gi-Oh!",
    };

    const queryParams: Record<string, string> = {
      q: q.trim(),
      game: mappingInfo.apiValue,
    };
    if (set) queryParams.set = String(set).trim();
    if (limit) queryParams.limit = String(limit).trim();

    const apiResponse = await fetch(
      `https://api.tcgpricelookup.com/v1/cards/search?${new URLSearchParams(queryParams).toString()}`,
      { headers: { "X-API-Key": apiKey!, Accept: "application/json" } },
    );

    const data = await apiResponse.json();

    if (!data.data) {
      throw new Error(data.message || "Errore nel recupero dati dall'API");
    }

    for (const card of data.data) {
      await saveCardProduct(card, sub);
    }

    res.status(200).json({
      error: false,
      message: `Sincronizzazione completata con successo per ${sub}!`,
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message });
  }
};

export const syncPokemon = (req: Request, res: Response) => performSync(req, res, "Pokemon");
export const syncPokemonJp = (req: Request, res: Response) => performSync(req, res, "PokemonJP");
export const syncOnePiece = (req: Request, res: Response) => performSync(req, res, "One Piece");
export const syncYugioh = (req: Request, res: Response) => performSync(req, res, "YuGiOh");