import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import prisma from "./db/connection.js";

//rotta per gli User + Auth
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/auth.js";

//prodotti 
import productRoutes from "./routes/productRoutes.js";

//fetch + POST per importare carte nel DB principale
import cardRoutes from "./routes/cardRoutes.js";
//fetch giochi da tavolo
import boardGameRoutes from "./routes/boardGameRoutes.js";
//funkopop
import funkoRoutes from "./routes/funkoRoutes.js";
const app = express();
const PORT = process.env.PORT || 5121;

// Middleware
app.use(
  cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }),
);
app.use(express.json());

// Rotte
app.use("/api/auth", authRoutes);
//db user
app.use("/api/users", userRoutes);
//prodotti nel DB
app.use("/api/products", productRoutes);
//import da apikey per carte
app.use("/api/cards", cardRoutes);
//fetch giochi da tavolo
app.use("/api/boardgame", boardGameRoutes);
//funko
app.use("/api/funko", funkoRoutes);

//query per testare il Backend acceso
app.get("/", async (req: Request, res: Response) => {
  try {
    
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: "online",
      message: "Database connesso e attivo",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "offline",
      message: "Database spento o non raggiungibile",
      error: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
});

// 404 — nessuna rotta corrisponde
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: true, message: "Endpoint non trovato" });
});

// Error handler globale: rete di sicurezza per errori non catturati nei
// controller (es. JSON malformato nel body, eccezioni sincrone nei
// middleware) — senza questo, Express risponderebbe con una pagina HTML
// invece che con JSON, incoerente con il resto dell'API.
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error("[Unhandled Error]:", err);
  if (res.headersSent) return next(err);

  // express.json() segnala un body malformato con un errore che ha già uno
  // status 4xx (es. 400): lo rispettiamo invece di appiattire tutto su 500.
  const status =
    err instanceof Error &&
    "status" in err &&
    typeof (err as { status?: unknown }).status === "number" &&
    (err as { status: number }).status >= 400 &&
    (err as { status: number }).status < 500
      ? (err as { status: number }).status
      : 500;

  res.status(status).json({
    error: true,
    message: status === 500 ? "Errore interno del server" : "Richiesta non valida",
  });
});

app.listen(PORT, () => {
  console.info(`🚀 Server running on port ${PORT}`);
});
