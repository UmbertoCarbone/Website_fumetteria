import { Request, Response } from "express";
import prisma from "../db/connection.js";

// Helper interno per creare gli slug richiesti dallo schema (identico al tuo)
const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const saveMangaProductWithCategory = async (
  manga: any,
  catName: string,
  subCatName: string,
) => {
  const catSlug = createSlug(catName);
  const subCatSlug = createSlug(subCatName);

  // mal_id è l'ID univoco fornito dall'API di MyAnimeList
  const malId = Number(manga.mal_id);
  const title = manga.title || "Manga senza titolo";
  const authorName = manga.authors[0]?.name || "Unknown Author";
  const synopsisText = manga.synopsis || null;
  const coverUrl = manga.images?.jpg?.image_url || null;
  const volumeNum = manga.volumes || 1; // Numero di volumi o 1 se in corso/indefinito

  const defaultPrice = 5.2;
  const defaultStock = 10;

  return await prisma.$transaction(async (tx) => {
    // 1. Upsert Categoria
    const category = await tx.category.upsert({
      where: { slug: catSlug },
      update: { nameCategory: catName },
      create: { nameCategory: catName, slug: catSlug },
    });

    // 2. Upsert Sottocategoria usando la chiave composta del tuo schema
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

    // 3. Upsert Franchise basato sul nome della sottocategoria (es. Naruto, Berserk)
    const franchise = await tx.franchise.upsert({
      where: { slug: createSlug(subCatName) },
      update: { nameFranchise: subCatName },
      create: {
        nameFranchise: subCatName,
        slug: createSlug(subCatName),
      },
    });

    // 4. Upsert dei Dati Specifici del Manga usando l'externalId (mal_id)
    const savedManga = await tx.manga.upsert({
      where: { externalId: malId },
      update: {
        volumeNumber: volumeNum,
        author: authorName,
        synopsis: synopsisText,
        imageUrl: coverUrl,
      },
      create: {
        externalId: malId,
        volumeNumber: volumeNum,
        author: authorName,
        publisher: "Default Publisher", // MyAnimeList non ha editori locali
        synopsis: synopsisText,
        imageUrl: coverUrl,
      },
    });

    // 5. Verifica se esiste già il Prodotto collegato a questo Manga
    const existingProduct = await tx.product.findUnique({
      where: { mangaId: savedManga.id },
    });

    if (existingProduct) {
      // Se esiste già, aggiorniamo solo il nome in caso sia cambiato nell'API
      return await tx.product.update({
        where: { id: existingProduct.id },
        data: { name: title },
      });
    } else {
      // Se è completamente nuovo, crea il record Prodotto agganciandolo al Manga
      return await tx.product.create({
        data: {
          name: title,
          price: defaultPrice,
          stock: defaultStock,
          isAvailable: defaultStock > 0,
          type: "MANGA",
          subCategoryId: subCategory.id,
          franchiseId: franchise.id,
          mangaId: savedManga.id, // Collegamento 1-a-1
        },
      });
    }
  });
};

const performMangaSync = async (
  req: Request,
  res: Response,
  cat: string,
  sub: string,
) => {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== "string" || q.trim() === "") {
      return res.status(400).json({
        error: true,
        message:
          "Richiesta non valida: il parametro di ricerca 'q' è obbligatorio nell'URL.",
      });
    }

    const searchLimit = limit ? String(limit).trim() : "5";

    // Chiamata all'API pubblica di Jikan (MyAnimeList)
    const apiResponse = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q.trim())}&limit=${searchLimit}`,
    );

    const data = await apiResponse.json();

    if (!data.data || data.data.length === 0) {
      return res.status(404).json({
        error: true,
        message: "Nessun manga trovato su MyAnimeList con questa query.",
      });
    }

    // Ciclo sui manga ricevuti dall'API e salvataggio sequenziale nel database
    for (const manga of data.data) {
      await saveMangaProductWithCategory(manga, cat, sub);
    }

    res.status(200).json({
      error: false,
      message: `Sincronizzazione completata (con controllo duplicati) per l'opera "${sub}" in ${cat}!`,
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Rotta esposta per sincronizzare i Manga dinamicamente in base alla ricerca
export const syncManga = async (req: Request, res: Response) => {
  const { q } = req.query;
  // Usiamo il nome della ricerca (es. "Naruto" o "Bleach") direttamente come nome della Sottocategoria e del Franchise
  const subCategoryName = q ? String(q).trim() : "Manga Generico";
  await performMangaSync(req, res, "Manga", subCategoryName);
};
