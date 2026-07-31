import { Request, Response } from "express";
import prisma from "../db/connection.js";
import { resolveCategory, resolveFranchise } from "../service/catalogSync.js";
import { sendError } from "../utils/httpErrors.js";
import { cardSyncQuerySchema } from "../validators/syncValidator.js";

// Mapping per uniformare i nomi dei giochi verso l'API e verso il Franchise canonico
const gameMapping: Record<string, { apiValue: string; franchiseName: string }> = {
  Pokemon: { apiValue: "pokemon", franchiseName: "Pokémon" },
  PokemonJP: { apiValue: "pokemon", franchiseName: "Pokémon" },
  "One Piece": { apiValue: "onepiece", franchiseName: "One Piece" },
  YuGiOh: { apiValue: "yugioh", franchiseName: "Yu-Gi-Oh!" },
};

// Forma (parziale) della risposta di tcgpricelookup.com usata da questo file
interface TcgApiCard {
  id: string | number;
  name: string;
  number?: string;
  rarity?: string;
  variant?: string;
  image_url?: string | null;
  set?: { name?: string };
  prices?: {
    raw?: { near_mint?: { tcgplayer?: { market?: number } } };
  };
}

const saveCardProduct = async (card: TcgApiCard, subCatName: string) => {
  const mappingInfo = gameMapping[subCatName] || {
    apiValue: "yugioh",
    franchiseName: subCatName,
  };

  const setName = card.set?.name || "Unknown Set";
  const marketPrice = card.prices?.raw?.near_mint?.tcgplayer?.market || 0;
  const externalId = String(card.id);
  const imageUrl = card.image_url || null;

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
        images: imageUrl ? [imageUrl] : [],
      },
      create: {
        sku: `CARD-${externalId}`,
        name: `${card.name} (${card.number || "N/D"})`,
        price: Number(marketPrice),
        stock: 10,
        categoryId: category.id,
        franchiseId: franchise.id,
        externalId,
        externalSource: "TCG_PRICE_LOOKUP",
        images: imageUrl ? [imageUrl] : [],
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
        number: card.number || "N/D",
        rarity: card.rarity || "Common",
        set: setName,
        variant: card.variant || "",
      },
    });

    return product;
  });
};

const performSync = async (req: Request, res: Response, sub: string) => {
  const validation = cardSyncQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return sendError(res, 400, "Parametri di ricerca non validi", {
      errors: validation.error.format(),
    });
  }
  const { q, set, limit } = validation.data;

  const apiKey = process.env.CARD_API_KEY;
  if (!apiKey) {
    console.error("[CardController] CARD_API_KEY non configurata nel .env");
    return sendError(res, 500, "Configurazione server incompleta: CARD_API_KEY mancante");
  }

  try {
    const mappingInfo = gameMapping[sub] || {
      apiValue: "yugioh",
      franchiseName: "Yu-Gi-Oh!",
    };

    const queryParams: Record<string, string> = {
      q,
      game: mappingInfo.apiValue,
    };
    if (set) queryParams.set = set;
    if (limit) queryParams.limit = limit;

    const apiResponse = await fetch(
      `https://api.tcgpricelookup.com/v1/cards/search?${new URLSearchParams(queryParams).toString()}`,
      { headers: { "X-API-Key": apiKey, Accept: "application/json" } },
    );

    const data = await apiResponse.json();

    if (!data.data) {
      return sendError(res, 502, data.message || "Errore nel recupero dati dall'API");
    }

    // Ogni carta viene salvata singolarmente: se una fallisce non deve
    // buttare via il lavoro già fatto sulle altre.
    let saved = 0;
    const failures: Array<{ id?: string; error: string }> = [];
    for (const card of data.data) {
      try {
        await saveCardProduct(card, sub);
        saved++;
      } catch (err) {
        failures.push({
          id: card?.id !== undefined ? String(card.id) : undefined,
          error: err instanceof Error ? err.message : "Errore sconosciuto",
        });
      }
    }

    if (saved === 0 && failures.length > 0) {
      return res.status(502).json({
        error: true,
        message: "Nessuna carta sincronizzata",
        failures,
      });
    }

    res.status(200).json({
      error: false,
      message: `Sincronizzazione completata per ${sub}: ${saved}/${data.data.length} carte salvate.`,
      ...(failures.length > 0 && { failures }),
    });
  } catch (error) {
    console.error("[CardController] Errore di sync:", error);
    sendError(res, 500, error instanceof Error ? error.message : "Errore sconosciuto");
  }
};

export const syncPokemon = (req: Request, res: Response) => performSync(req, res, "Pokemon");
export const syncPokemonJp = (req: Request, res: Response) => performSync(req, res, "PokemonJP");
export const syncOnePiece = (req: Request, res: Response) => performSync(req, res, "One Piece");
export const syncYugioh = (req: Request, res: Response) => performSync(req, res, "YuGiOh");
