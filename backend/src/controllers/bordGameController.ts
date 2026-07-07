import { Request, Response } from "express";
import prisma from "../db/connection.js";
import axios from "axios";
import { parseStringPromise } from "xml2js";

// Funzione helper per creare un ritardo (per sembrare più "umani" a BGG)
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const syncBoardGames = async (req: Request, res: Response) => {
  const { q } = req.body;
  if (!q) return res.status(400).json({ error: "Campo 'q' obbligatorio." });

  // Proxy pubblico per nascondere il tuo IP originale
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

    // 1. Ricerca con Proxy
    const searchUrl = encodeURIComponent(
      `https://api.geekdo.com/xmlapi2/search?type=boardgame&query=${q}`,
    );
    const searchRes = await client.get(proxyUrl + searchUrl);
    const searchData = await parseStringPromise(searchRes.data);

    if (!searchData.items?.item?.[0]) {
      return res.status(404).json({ error: "Gioco non trovato." });
    }

    const bggId = searchData.items.item[0].$.id;

    // Pausa di 2 secondi prima della seconda chiamata per evitare blocchi
    await delay(2000);

    // 2. Dettaglio con Proxy
    const detailUrl = encodeURIComponent(
      `https://api.geekdo.com/xmlapi2/thing?id=${bggId}`,
    );
    const detailRes = await client.get(proxyUrl + detailUrl);
    const detailData = await parseStringPromise(detailRes.data);
    const item = detailData.items.item[0];

    // 3. Salva su DB
    const boardGame = await prisma.boardGame.upsert({
      where: { bggId: parseInt(bggId) },
      update: {
        description: item.description?.[0] || "",
        imageUrl: item.image?.[0] || "",
      },
      create: {
        bggId: parseInt(bggId),
        description: item.description?.[0] || "",
        imageUrl: item.image?.[0] || "",
        minPlayers: parseInt(item.minplayers?.[0]?.$?.value || "0"),
        maxPlayers: parseInt(item.maxplayers?.[0]?.$?.value || "0"),
        yearPublished: parseInt(item.yearpublished?.[0]?.$?.value || "0"),
      },
    });

    res.json({ message: "Successo! Dati sincronizzati.", data: boardGame });
  } catch (error: any) {
    console.error("[ERRORE FINALE]:", error.message);
    res.status(500).json({
      error: "Errore di connessione.",
      details:
        "BGG continua a bloccare la richiesta. Prova ad usare l'hotspot del telefono.",
    });
  }
};
