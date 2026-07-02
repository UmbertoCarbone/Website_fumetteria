import { Request, Response } from "express";
import prisma from "../db/connection.js";

// Helper interno per creare gli slug richiesti dallo schema
const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Mapping per uniformare i Franchise e mappare i valori corretti per l'API
const gameMapping: Record<string, { apiValue: string; franchiseName: string }> =
  {
    Pokemon: { apiValue: "pokemon", franchiseName: "Pokémon" },
    PokemonJP: { apiValue: "pokemon", franchiseName: "Pokémon" },
    "One Piece": { apiValue: "onepiece", franchiseName: "One Piece" },
    YuGiOh: { apiValue: "yugioh", franchiseName: "Yu-Gi-Oh!" },
  };

const saveProductWithCategory = async (
  card: any,
  catName: string,
  subCatName: string,
) => {
  const catSlug = createSlug(catName);
  const subCatSlug = createSlug(subCatName);

  // Otteniamo il nome reale del franchise e il valore api corretto
  const franchiseInfo = gameMapping[subCatName] || {
    apiValue: "yugioh",
    franchiseName: subCatName,
  };

  // Estraiamo in sicurezza il nome del set (visto che dall'API arriva come oggetto)
  const setStringName = card.set?.name || "Unknown Set";

  // Estraiamo il prezzo corretto dall'albero dei prezzi dell'API
  const marketPrice = card.prices?.raw?.near_mint?.tcgplayer?.market || 0;
  const defaultStock = 10;
  const computedPrice = Number(marketPrice);

  return await prisma.$transaction(async (tx) => {
    // 1. Upsert Categoria (Nome campo aggiornato a nameCategory)
    const category = await tx.category.upsert({
      where: { slug: catSlug },
      update: { nameCategory: catName },
      create: { nameCategory: catName, slug: catSlug },
    });

    // 2. Upsert Sottocategoria (Usa la chiave composta aggiornata dallo schema)
    const subCategory = await tx.subCategory.upsert({
      where: {
        nameSubCategory_categoryId: {
          nameSubCategory: subCatName,
          categoryId: category.id,
        },
      },
      update: { nameSubCategory: subCatName },
      create: {
        nameSubCategory: subCatName,
        slug: subCatSlug,
        categoryId: category.id,
      },
    });

    // 3. Upsert Franchise (Nome campo aggiornato a nameFranchise)
    const franchise = await tx.franchise.upsert({
      where: { slug: createSlug(franchiseInfo.franchiseName) },
      update: { nameFranchise: franchiseInfo.franchiseName },
      create: {
        nameFranchise: franchiseInfo.franchiseName,
        slug: createSlug(franchiseInfo.franchiseName),
      },
    });

    // 4. Gestione Dati Specifici della Carta (Tabella Figlia indipendente)
    const savedCard = await tx.card.upsert({
      where: { externalId: card.id },
      update: {
        number: card.number,
        rarity: card.rarity || "Common",
        set: setStringName,
        variant: card.variant || "",
      },
      create: {
        externalId: card.id,
        number: card.number,
        rarity: card.rarity || "Common",
        set: setStringName,
        variant: card.variant || "",
      },
    });

    // 5. Gestione Prodotto Generico (Verifica se esiste già agganciato a questa carta)
    const existingProduct = await tx.product.findUnique({
      where: { cardId: savedCard.id },
    });

    if (existingProduct) {
      // Se esiste, aggiorna solo il prezzo di mercato
      return await tx.product.update({
        where: { id: existingProduct.id },
        data: { price: computedPrice },
      });
    } else {
      // Se è nuovo, crea il record prodotto completo collegando l'ID della carta appena salvata
      return await tx.product.create({
        data: {
          name: `${card.name} (${card.number || "N/D"})`,
          price: computedPrice,
          stock: defaultStock,
          isAvailable: defaultStock > 0,
          type: "CARD",
          subCategoryId: subCategory.id,
          franchiseId: franchise.id,
          cardId: savedCard.id, // Collegamento 1-a-1 invertito
        },
      });
    }
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

// Rotte esposte per la sincronizzazione delle card
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
