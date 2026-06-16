import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import prisma from "./db/connection.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/auth.js";

import cardRoutes from "./routes/cardRoutes.js";

const app = express();
const PORT = process.env.PORT || 5121;

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Rotte
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cards", cardRoutes);

// Rotta di test
app.get("/", async (req: Request, res: Response) => {
  try {
    // Ora usiamo il modello unificato Product
    const products = await prisma.product.findMany({
      include: {
        category: true, // Ci mostra la categoria (es. Giochi)
        subCategory: true, // Ci mostra la sotto-categoria (es. Carte Pokémon)
      },
    });

    res.json({
      status: "success",
      message: "Connessione al Database OK!",
      totalProducts: products.length,
      data: products,
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: "Errore DB durante il recupero dei prodotti",
      details: err instanceof Error ? err.message : "Errore sconosciuto",
    });
  }
});

app.listen(PORT, () => {
  console.info(`🚀 Server running on port ${PORT}`);
});
