import { Request, Response } from "express";
import prisma from "../db/connection.js";
import { resolveCategory, resolveFranchise } from "../service/catalogSync.js"

const saveMangaProduct = async (manga: any, franchiseTarget: string) => {
  const externalId = String(manga.id);
  const title =
    manga.title.userPreferred ||
    manga.title.english ||
    manga.title.romaji ||
    "Manga senza titolo";

  const authorStaff = manga.staff?.edges?.find(
    (edge: any) =>
      edge.role.toLowerCase().includes("story") ||
      edge.role.toLowerCase().includes("art"),
  );
  const authorName = authorStaff ? authorStaff.node.name.full : "Unknown Author";

  const synopsisText = manga.description
    ? manga.description.replace(/<[^>]*>?/gm, "")
    : null;
  const coverUrl = manga.coverImage?.large || null;
  const volumeNum = manga.volumes || 1;

  return await prisma.$transaction(async (tx) => {
    // Category fissa per tutti i manga, indipendentemente dal franchise
    const category = await resolveCategory(tx, "manga", "Manga");

    // Franchise dinamico: se non esiste ancora lo crea al volo
    const franchise = await resolveFranchise(tx, franchiseTarget, "ANILIST");

    const product = await tx.product.upsert({
      where: {
        externalId_externalSource: { externalId, externalSource: "ANILIST" },
      },
      update: {
        name: title,
        images: coverUrl ? [coverUrl] : [],
      },
      create: {
        sku: `MANGA-${externalId}`,
        name: title,
        images: coverUrl ? [coverUrl] : [],
        price: 5.2,
        stock: 10,
        isAvailable: true,
        categoryId: category.id,
        franchiseId: franchise.id,
        externalId,
        externalSource: "ANILIST",
      },
    });

    await tx.manga.upsert({
      where: { productId: product.id },
      update: {
        volume: volumeNum,
        authors: [authorName],
        synopsis: synopsisText,
      },
      create: {
        productId: product.id,
        volume: volumeNum,
        authors: [authorName],
        synopsis: synopsisText,
      },
    });

    return product;
  });
};

export const syncManga = async (req: Request, res: Response) => {
  try {
    const { q, franchise } = req.query;

    if (!q || typeof q !== "string" || q.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Richiesta non valida: il parametro 'q' è obbligatorio.",
      });
    }

    if (!franchise || typeof franchise !== "string" || franchise.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Richiesta non valida: il parametro 'franchise' è obbligatorio.",
      });
    }

    const franchiseTarget = franchise.trim();

    const query = `
      query ($search: String) {
        Page(perPage: 20) {
          media(search: $search, type: MANGA) {
            id
            title { romaji english userPreferred }
            description
            volumes
            format
            coverImage { large }
            staff {
              edges {
                role
                node { name { full } }
              }
            }
          }
        }
      }
    `;

    const apiResponse = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { search: q.trim() } }),
    });

    if (!apiResponse.ok) {
      return res.status(503).json({
        error: true,
        message: "Errore durante la comunicazione con i server di AniList.",
      });
    }

    const result = await apiResponse.json();
    const mangaList = result.data?.Page?.media || [];

    if (mangaList.length === 0) {
      return res.status(404).json({
        error: true,
        message: "Nessun manga trovato con questa query.",
      });
    }

    let totalSaved = 0;
    for (const manga of mangaList) {
      await saveMangaProduct(manga, franchiseTarget);
      totalSaved++;
    }

    res.status(200).json({
      error: false,
      message: `Sincronizzazione completata! Inseriti/aggiornati ${totalSaved} volumi per "${franchiseTarget}".`,
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message });
  }
};