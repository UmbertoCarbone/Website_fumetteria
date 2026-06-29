import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import prisma from "./db/connection.js";

//rotta per gli User + Auth
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/auth.js";

//prodotti 
import productRoutes from "./routes/productRoutes.js";

//fetch + POST per importare carte nel DB principale
import cardRoutes from "./routes/cardRoutes.js";

import mangaSyncRoutes from "./routes/mangaRoutes.js";
const app = express();
const PORT = process.env.PORT || 5121;

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Rotte
app.use("/api/auth", authRoutes);
//db user
app.use("/api/users", userRoutes);
//prodotti nel DB
app.use("/api/products", productRoutes);
//import da apikey per carte
app.use("/api/cards", cardRoutes);

app.use("/api/products-filter", productRoutes);
//fetch manga
app.use("/api/manga", mangaSyncRoutes);


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

app.listen(PORT, () => {
  console.info(`🚀 Server running on port ${PORT}`);
});
