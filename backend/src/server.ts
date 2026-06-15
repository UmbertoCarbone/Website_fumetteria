import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import prisma from "./db/connection.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 5121;

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Rotte
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Rotta di test
app.get("/", async (req: Request, res: Response) => {
  try {
    const comics = await prisma.comic.findMany();
    res.json({
      status: "success",
      message: "Connessione OK!",
      data: comics,
    });
  } catch (err: any) {
    res.status(500).json({ 
      status: "error", 
      message: "Errore DB", 
      details: err instanceof Error ? err.message : "Errore sconosciuto" 
    });
  }
});

app.listen(PORT, () => {
  console.info(`🚀 Server running on port ${PORT}`);
});