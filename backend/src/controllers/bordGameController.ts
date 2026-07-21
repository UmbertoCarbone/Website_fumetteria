import { Request, Response } from "express";
import prisma from "../db/connection.js";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { resolveCategory } from "../service/catalogSync.js";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const syncBoardGames = async (req: Request, res: Response) => {
  const { q } = req.body;
  if (!q) return res.status(400).json({ error: "Campo 'q' obbligatorio." });

  const proxyUrl = "https://corsproxy.io/?";
  const client = axios.create({
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "application/xml",
    },
    timeout: 15000,
  });

  try {
    console.log(`[SYNC] Ricerca gioco tramite proxy: ${q}`);

    const searchUrl = encodeURIComponent(
      `https://api.geekdo.com/xmlapi2/search?type=boardgame&query=${q}`,
    );
    const searchRes = await client.get(proxyUrl + searchUrl);
    const searchData = await parseStringPromise(searchRes.data);

    if (!searchData.items?.item?.[0]) {
      return res.status(404).json({ error: "Gioco non trovato." });
    }

    const bggId = searchData.items.item[0].$.id;

    await delay(2000);

    const detailUrl = encodeURIComponent(`https://api.geekdo.com/xmlapi2/thing?id=${bggId}`);
    const detailRes = await client.get(proxyUrl + detailUrl);
    const detailData = await parseStringPromise(detailRes.data);
    const item = detailData.items.item[0];

    const externalId = String(bggId);
    const name = item.name?.[0]?.$?.value || `Gioco #${bggId}`;
    const imageUrl = item.image?.[0] || null;

    const product = await prisma.$transaction(async (tx) => {
      // Category fissa, i giochi da tavolo di solito non hanno un
      // Franchise a meno che non siano licenze (es. gioco da tavolo di
      // One Piece) — in quel caso aggiungeresti franchiseId come fai
      // già per carte/manga.
      const category = await resolveCategory(tx, "giochi-da-tavolo", "Giochi da Tavolo");

      const product = await tx.product.upsert({
        where: {
          externalId_externalSource: { externalId, externalSource: "BGG" },
        },
        update: {
          name,
          images: imageUrl ? [imageUrl] : [],
        },
        create: {
          sku: `BGG-${externalId}`,
          name,
          images: imageUrl ? [imageUrl] : [],
          price: 0,
          stock: 0,
          isAvailable: false,
          categoryId: category.id,
          externalId,
          externalSource: "BGG",
        },
      });

      await tx.boardGame.upsert({
        where: { productId: product.id },
        update: {
          description: item.description?.[0] || "",
          minPlayers: parseInt(item.minplayers?.[0]?.$?.value || "0"),
          maxPlayers: parseInt(item.maxplayers?.[0]?.$?.value || "0"),
          yearPublished: parseInt(item.yearpublished?.[0]?.$?.value || "0"),
        },
        create: {
          productId: product.id,
          description: item.description?.[0] || "",
          minPlayers: parseInt(item.minplayers?.[0]?.$?.value || "0"),
          maxPlayers: parseInt(item.maxplayers?.[0]?.$?.value || "0"),
          yearPublished: parseInt(item.yearpublished?.[0]?.$?.value || "0"),
        },
      });

      return product;
    });

    res.json({ message: "Successo! Dati sincronizzati.", data: product });
  } catch (error: any) {
    console.error("[ERRORE FINALE]:", error.message);
    res.status(500).json({
      error: "Errore di connessione.",
      details: "BGG continua a bloccare la richiesta. Prova ad usare l'hotspot del telefono.",
    });
  }
};