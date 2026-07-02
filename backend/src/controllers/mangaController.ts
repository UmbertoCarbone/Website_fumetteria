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

const saveMangaProductWithCategory = async (
  manga: any,
  catName: string,
  subCatName: string,
  franchiseName: string
) => {
  const catSlug = createSlug(catName);
  const subCatSlug = createSlug(subCatName);
  const franchiseSlug = createSlug(franchiseName);

  // Dati univoci dall'API
  const malId = Number(manga.mal_id);
  const title = manga.title || "Manga senza titolo";
  const authorName = manga.authors[0]?.name || "Unknown Author";
  const synopsisText = manga.synopsis || null;
  const coverUrl = manga.images?.jpg?.image_url || null;
  const volumeNum = manga.volumes || 1;

  const defaultPrice = 5.20;
  const defaultStock = 10;

  return await prisma.$transaction(async (tx) => {
    // 1. Upsert Categoria Madre (sempre "Manga")
    const category = await tx.category.upsert({
      where: { slug: catSlug },
      update: { nameCategory: catName },
      create: { nameCategory: catName, slug: catSlug },
    });

    // 2. Upsert Sottocategoria basata sul formato (es. "Manga", "Novel")
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

    // 3. Upsert Franchise basato sul nome pulito passato dall'URL (es. "One Piece", "Bleach")
    const franchise = await tx.franchise.upsert({
      where: { slug: franchiseSlug },
      update: { nameFranchise: franchiseName },
      create: {
        nameFranchise: franchiseName,
        slug: franchiseSlug,
      },
    });

    // 4. Upsert dei dati specifici del Manga (Tabella Figlia) tramite externalId
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
        publisher: "Default Publisher",
        synopsis: synopsisText,
        imageUrl: coverUrl,
      },
    });

    // 5. Controllo se il Prodotto Madre è già associato a questo specifico Manga
    const existingProduct = await tx.product.findUnique({
      where: { mangaId: savedManga.id },
    });

    if (existingProduct) {
      return await tx.product.update({
        where: { id: existingProduct.id },
        data: { name: title },
      });
    } else {
      return await tx.product.create({
        data: {
          name: title,
          price: defaultPrice,
          stock: defaultStock,
          isAvailable: defaultStock > 0,
          type: "MANGA",
          subCategoryId: subCategory.id,
          franchiseId: franchise.id,
          mangaId: savedManga.id,
        },
      });
    }
  });
};

export const syncManga = async (req: Request, res: Response) => {
  try {
    const { q, franchise } = req.query;

    // Adesso blocchiamo la richiesta se manca la query di ricerca o il nome del franchise desiderato
    if (!q || typeof q !== "string" || q.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Richiesta non valida: il parametro di ricerca 'q' è obbligatorio.",
      });
    }

    if (!franchise || typeof franchise !== "string" || franchise.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Richiesta non valida: il parametro 'franchise' è obbligatorio per associare correttamente i prodotti.",
      });
    }

    const franchiseTarget = franchise.trim();

    // Chiamata a Jikan senza limiti per prendere tutti i risultati della prima pagina
    const apiResponse = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q.trim())}`
    );

    const data = await apiResponse.json();

    if (!data.data || data.data.length === 0) {
      return res.status(404).json({
        error: true,
        message: "Nessun manga trovato su MyAnimeList con questa query.",
      });
    }

    // Ciclo sui manga ricevuti
    for (const manga of data.data) {
      // Sottocategoria dinamica estratta dal formato dell'opera (es. "Manga" o "Novel")
      const formatType = manga.type || "Manga"; 
      
      await saveMangaProductWithCategory(manga, "Manga", formatType, franchiseTarget);
    }

    res.status(200).json({
      error: false,
      message: `Sincronizzazione completata con successo! Tutti i prodotti trovati sono stati collegati al franchise "${franchiseTarget}".`,
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message });
  }
};