import { Request, Response } from "express";
import prisma from "../db/connection.js";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { resolveCategory } from "../service/catalogSync.js";
import { sendError } from "../utils/httpErrors.js";
import { boardGameSyncBodySchema } from "../validators/syncValidator.js";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Chiamata diretta a BGG, nessun proxy: siamo un backend Node,
// non un browser, quindi CORS non ci riguarda. Gestiamo anche il
// caso in cui BGG risponde 202 (richiesta in coda, dati non pronti).
const bggClient = axios.create({
  headers: {
    "User-Agent": "fumetteria-app/1.0 (contatto: tuo@email.it)",
    Accept: "application/xml",
  },
  timeout: 15000,
});

async function fetchBggXml(url: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await bggClient.get(url);

    // BGG risponde 200 con un body vuoto/placeholder quando la
    // richiesta è ancora "in coda" per il thing endpoint
    if (
      response.status === 202 ||
      !response.data ||
      response.data.trim() === ""
    ) {
      await delay(2000);
      continue;
    }

    return parseStringPromise(response.data);
  }
  throw new Error("BGG non ha restituito dati validi dopo diversi tentativi");
}

export const syncBoardGames = async (req: Request, res: Response) => {
  const validation = boardGameSyncBodySchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, "Parametri di ricerca non validi", {
      errors: validation.error.format(),
    });
  }
  const { q } = validation.data;

  try {
    console.log(`[SYNC] Ricerca gioco su BGG: ${q}`);

    const searchData = await fetchBggXml(
      `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(q)}`,
    );

    if (!searchData.items?.item?.[0]) {
      return sendError(res, 404, "Gioco non trovato.");
    }

    const bggId = searchData.items.item[0].$.id;

    // Piccola pausa di cortesia tra le due chiamate, per non
    // sovraccaricare l'API pubblica
    await delay(1500);

    const detailData = await fetchBggXml(
      `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`,
    );
    const item = detailData.items.item[0];

    const externalId = String(bggId);
    const name = item.name?.[0]?.$?.value || `Gioco #${bggId}`;
    const imageUrl = item.image?.[0] || null;
    const thumbnailUrl = item.thumbnail?.[0] || null;

    // BGG restituisce la descrizione con entità HTML codificate
    // (es. &amp;#10; per gli a-capo) - le decodifichiamo per mostrarla pulita
    const rawDescription = item.description?.[0] || "";
    const cleanDescription = rawDescription
      .replace(/&amp;/g, "&")
      .replace(/&#10;/g, "\n")
      .replace(/&#13;/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>?/gm, "")
      .trim();

    // Fino a 2 immagini, stessa convenzione del Funko: [0] = principale, [1] = thumbnail
    const images = [imageUrl, thumbnailUrl].filter((url): url is string =>
      Boolean(url),
    );

    const product = await prisma.$transaction(async (tx) => {
      const category = await resolveCategory(
        tx,
        "giochi-da-tavolo",
        "Giochi da Tavolo",
      );

      const product = await tx.product.upsert({
        where: {
          externalId_externalSource: { externalId, externalSource: "BGG" },
        },
        update: {
          name,
          description: cleanDescription || null,
          images,
        },
        create: {
          sku: `BGG-${externalId}`,
          name,
          description: cleanDescription || null,
          images,
          price: 0,
          stock: 0,
          categoryId: category.id,
          externalId,
          externalSource: "BGG",
        },
      });

      await tx.boardGame.upsert({
        where: { productId: product.id },
        update: {
          minPlayers: parseInt(item.minplayers?.[0]?.$?.value || "0"),
          maxPlayers: parseInt(item.maxplayers?.[0]?.$?.value || "0"),
          yearPublished: parseInt(item.yearpublished?.[0]?.$?.value || "0"),
        },
        create: {
          productId: product.id,
          minPlayers: parseInt(item.minplayers?.[0]?.$?.value || "0"),
          maxPlayers: parseInt(item.maxplayers?.[0]?.$?.value || "0"),
          yearPublished: parseInt(item.yearpublished?.[0]?.$?.value || "0"),
        },
      });

      return product;
    });

    res.status(200).json({ message: "Successo! Dati sincronizzati.", data: product });
  } catch (error) {
    console.error("[ERRORE FINALE]:", error);
    sendError(
      res,
      502,
      "Errore di connessione con BGG.",
      { details: error instanceof Error ? error.message : "Errore sconosciuto" },
    );
  }
};
