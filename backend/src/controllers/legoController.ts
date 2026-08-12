import { Request, Response } from "express";
import prisma from "../db/connection.js";
import { resolveCategory } from "../service/catalogSync.js";
import { sendError } from "../utils/httpErrors.js";
import { legoSyncBodySchema } from "../validators/syncValidator.js";

const REBRICKABLE_BASE = "https://rebrickable.com/api/v3/lego";

interface RebrickableSet {
  set_num: string;
  name: string;
  year: number;
  theme_id: number;
  num_parts: number;
  set_img_url: string | null;
}

interface RebrickableTheme {
  id: number;
  parent_id: number | null;
  name: string;
}

interface RebrickableMinifig {
  set_num: string; // codice della minifig (es. "fig-002544"), non del set
  set_name: string;
  quantity: number;
  set_img_url: string | null;
}

export const syncLegoSet = async (req: Request, res: Response) => {
  const validation = legoSyncBodySchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, "Parametri di ricerca non validi", {
      errors: validation.error.format(),
    });
  }
  const { q } = validation.data;

  const apiKey = process.env.LEGO_API_KEY;
  if (!apiKey) {
    console.error("[legoController] LEGO_API_KEY non configurata nel .env");
    return sendError(res, 500, "Configurazione server incompleta: LEGO_API_KEY mancante");
  }

  // Rebrickable usa una API key semplice, non OAuth/Bearer
  const headers = { Authorization: `key ${apiKey}` };

  try {
    const searchResponse = await fetch(
      `${REBRICKABLE_BASE}/sets/?search=${encodeURIComponent(q)}&page_size=1`,
      { headers },
    );
    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      return sendError(res, 502, "Errore di connessione con Rebrickable.", {
        details: searchData?.detail,
      });
    }

    const set: RebrickableSet | undefined = searchData.results?.[0];
    if (!set) {
      return sendError(res, 404, "Set Lego non trovato.");
    }

    // Il nome del tema (e del suo padre) non sono inclusi nell'endpoint
    // /sets, servono chiamate dedicate. Es: "Ultimate Collector Series" ha
    // come padre "Star Wars" — utile per il breadcrumb della single page.
    let themeName: string | null = null;
    let themeParentName: string | null = null;
    const themeResponse = await fetch(`${REBRICKABLE_BASE}/themes/${set.theme_id}/`, {
      headers,
    });
    if (themeResponse.ok) {
      const themeData: RebrickableTheme = await themeResponse.json();
      themeName = themeData.name || null;

      if (themeData.parent_id) {
        const parentResponse = await fetch(
          `${REBRICKABLE_BASE}/themes/${themeData.parent_id}/`,
          { headers },
        );
        if (parentResponse.ok) {
          const parentData: RebrickableTheme = await parentResponse.json();
          themeParentName = parentData.name || null;
        }
      }
    }

    // Elenco minifigure incluse nel set (nome, immagine, quantità), non solo
    // il conteggio aggregato. page_size=100 copre praticamente ogni set reale.
    let minifigs: RebrickableMinifig[] = [];
    let minifigCount: number | null = null;
    const minifigsResponse = await fetch(
      `${REBRICKABLE_BASE}/sets/${set.set_num}/minifigs/?page_size=100`,
      { headers },
    );
    if (minifigsResponse.ok) {
      const minifigsData = await minifigsResponse.json();
      minifigs = minifigsData.results || [];
      minifigCount = typeof minifigsData.count === "number" ? minifigsData.count : null;
    }

    const externalId = String(set.set_num);
    const images = set.set_img_url ? [set.set_img_url] : [];

    const product = await prisma.$transaction(async (tx) => {
      const category = await resolveCategory(tx, "lego", "Lego");

      const product = await tx.product.upsert({
        where: {
          externalId_externalSource: { externalId, externalSource: "REBRICKABLE" },
        },
        update: {
          name: set.name,
          images,
        },
        create: {
          sku: `LEGO-${externalId}`,
          name: set.name,
          images,
          price: 0,
          stock: 0,
          categoryId: category.id,
          externalId,
          externalSource: "REBRICKABLE",
        },
      });

      const legoSet = await tx.legoSet.upsert({
        where: { productId: product.id },
        update: {
          theme: themeName,
          themeParent: themeParentName,
          pieceCount: set.num_parts ?? null,
          minifigCount,
          yearReleased: set.year ?? null,
        },
        create: {
          productId: product.id,
          theme: themeName,
          themeParent: themeParentName,
          pieceCount: set.num_parts ?? null,
          minifigCount,
          yearReleased: set.year ?? null,
        },
      });

      // Re-sync completo dell'elenco minifigure: più semplice e sicuro di un
      // upsert per-minifig (nessuna chiave naturale stabile da usare come target).
      await tx.legoMinifig.deleteMany({ where: { legoSetId: legoSet.id } });
      if (minifigs.length > 0) {
        await tx.legoMinifig.createMany({
          data: minifigs.map((m) => ({
            legoSetId: legoSet.id,
            externalId: m.set_num,
            name: m.set_name,
            quantity: m.quantity,
            imageUrl: m.set_img_url,
          })),
        });
      }

      // Il chiamante non deve fare una query separata per vedere tema/pezzi/
      // minifigure: le restituiamo annidate nella stessa risposta di sync.
      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { legoSet: { include: { minifigs: true } } },
      });
    });

    res.status(200).json({ message: "Successo! Dati sincronizzati.", data: product });
  } catch (error) {
    console.error("[legoController] Errore di sync:", error);
    sendError(res, 502, "Errore di connessione con Rebrickable.", {
      details: error instanceof Error ? error.message : "Errore sconosciuto",
    });
  }
};
