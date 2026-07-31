import { Request, Response } from "express";
import prisma from "../db/connection.js";
import { resolveCategory, resolveFranchise } from "../service/catalogSync.js";
import { sendError } from "../utils/httpErrors.js";
import { mangaSyncQuerySchema } from "../validators/syncValidator.js";

// Forma (parziale) della risposta GraphQL di AniList usata da questo file
interface AniListMangaResult {
  id: string | number;
  title: { userPreferred?: string; english?: string; romaji?: string };
  description?: string | null;
  volumes?: number | null;
  coverImage?: { large?: string | null };
  staff?: {
    edges?: Array<{ role: string; node: { name: { full: string } } }>;
  };
}

const saveMangaProduct = async (manga: AniListMangaResult, franchiseTarget: string) => {
  const externalId = String(manga.id);
  const title =
    manga.title.userPreferred ||
    manga.title.english ||
    manga.title.romaji ||
    "Manga senza titolo";

  const authorStaff = manga.staff?.edges?.find(
    (edge) =>
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
  const validation = mangaSyncQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return sendError(res, 400, "Parametri di ricerca non validi", {
      errors: validation.error.format(),
    });
  }
  const { q, franchise: franchiseTarget } = validation.data;

  try {
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
      body: JSON.stringify({ query, variables: { search: q } }),
    });

    if (!apiResponse.ok) {
      return sendError(res, 503, "Errore durante la comunicazione con i server di AniList.");
    }

    const result = await apiResponse.json();
    const mangaList = result.data?.Page?.media || [];

    if (mangaList.length === 0) {
      return sendError(res, 404, "Nessun manga trovato con questa query.");
    }

    // Ogni volume viene salvato singolarmente: se uno fallisce non deve
    // buttare via il lavoro già fatto sugli altri.
    let saved = 0;
    const failures: Array<{ id?: string; error: string }> = [];
    for (const manga of mangaList) {
      try {
        await saveMangaProduct(manga, franchiseTarget);
        saved++;
      } catch (err) {
        failures.push({
          id: manga?.id !== undefined ? String(manga.id) : undefined,
          error: err instanceof Error ? err.message : "Errore sconosciuto",
        });
      }
    }

    if (saved === 0 && failures.length > 0) {
      return res.status(502).json({
        error: true,
        message: "Nessun manga sincronizzato",
        failures,
      });
    }

    res.status(200).json({
      error: false,
      message: `Sincronizzazione completata! Inseriti/aggiornati ${saved}/${mangaList.length} volumi per "${franchiseTarget}".`,
      ...(failures.length > 0 && { failures }),
    });
  } catch (error) {
    console.error("[mangaController] Errore di sync:", error);
    sendError(res, 500, error instanceof Error ? error.message : "Errore sconosciuto");
  }
};
