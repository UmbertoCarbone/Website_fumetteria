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

// Helper per fermare l'esecuzione (evita il rate limit di Jikan)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const saveMangaProductWithCategory = async (
  manga: any,
  catName: string,
  subCatName: string,
  franchiseName: string
) => {
  const catSlug = createSlug(catName);
  const subCatSlug = createSlug(subCatName);
  const franchiseSlug = createSlug(franchiseName);

  const malId = Number(manga.mal_id);
  const title = manga.title || "Manga senza titolo";
  const authorName = manga.authors[0]?.name || "Unknown Author";
  const synopsisText = manga.synopsis || null;
  const coverUrl = manga.images?.jpg?.image_url || null;
  const volumeNum = manga.volumes || 1;

  const defaultPrice = 5.20;
  const defaultStock = 10;

  return await prisma.$transaction(async (tx) => {
    // 1. Upsert Categoria Madre (Manga)
    const category = await tx.category.upsert({
      where: { slug: catSlug },
      update: { nameCategory: catName },
      create: { nameCategory: catName, slug: catSlug },
    });

    // 2. Upsert Sottocategoria (Manga, Novel, etc.)
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

    // 3. Upsert Franchise dinamico
    const franchise = await tx.franchise.upsert({
      where: { slug: franchiseSlug },
      update: { nameFranchise: franchiseName },
      create: {
        nameFranchise: franchiseName,
        slug: franchiseSlug,
      },
    });

    // 4. Upsert Manga specifico
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

    // 5. Aggancio al Prodotto Madre
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

    if (!q || typeof q !== "string" || q.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Richiesta non valida: il parametro di ricerca 'q' è obbligatorio.",
      });
    }

    if (!franchise || typeof franchise !== "string" || franchise.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Richiesta non valida: il parametro 'franchise' è obbligatorio.",
      });
    }

    const franchiseTarget = franchise.trim();
    let currentPage = 1;
    let hasNextPage = true;
    let totalSaved = 0;

    while (hasNextPage) {
      const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q.trim())}&page=${currentPage}`;
      console.log("=== EFFETTUO FETCH A ===", url);

      const apiResponse = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      // Gestione del limite di richieste di Jikan (Rate Limit 429)
      if (apiResponse.status === 429) {
        console.log("=== ATTENZIONE: RATE LIMIT 429 ===");
        await delay(2000); 
        continue;
      }

      // Gestione dei crash/timeout dei server esterni di MyAnimeList (502, 503, 504)
      if (apiResponse.status >= 500) {
        console.log(`=== ERRORE SERVER ESTERNO JIKAN/MAL: ${apiResponse.status} ===`);
        return res.status(503).json({
          error: true,
          message: "I server di MyAnimeList o Jikan sono temporaneamente sovraccarichi o offline. Riprova tra qualche minuto.",
        });
      }

      const data = await apiResponse.json();

      if (!data.data || data.data.length === 0) {
        if (currentPage === 1) {
          return res.status(404).json({
            error: true,
            message: "Nessun manga trovato su MyAnimeList con questa query.",
          });
        }
        break;
      }

      for (const manga of data.data) {
        const formatType = manga.type || "Manga";
        await saveMangaProductWithCategory(manga, "Manga", formatType, franchiseTarget);
        totalSaved++;
      }

      hasNextPage = data.pagination?.has_next_page || false;
      
      if (hasNextPage) {
        currentPage++;
        await delay(1000); // Pausa di sicurezza tra le pagine
      }
    }

    res.status(200).json({
      error: false,
      message: `Sincronizzazione completata! Inseriti/Aggiornati con successo ${totalSaved} volumi legati al franchise "${franchiseTarget}".`,
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message });
  }
};