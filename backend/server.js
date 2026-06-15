import "dotenv/config";
import express from "express";
import cors from "cors"; // Assicurati di averlo installato: npm install cors
import prisma from "./db/connection.js";
import authRoutes from "./routes/auth.js"; // Importiamo le tue nuove rotte di auth

const app = express();
const PORT = process.env.PORT || 5121;

// 1. Middleware CORS: essenziale per far parlare frontend e backend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// 2. Middleware per leggere il body JSON
app.use(express.json());

// 3. Rotte di Autenticazione (register/login)
app.use("/api/auth", authRoutes);

// 4. Rotta di test (la tua rotta originale)
app.get("/", async (req, res) => {
  try {
    res.json({
      status: "success",
      message: "Connessione OK!",
      data: await prisma.comic.findMany(),
    });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", message: "Errore DB", details: err.message });
  }
});

// 5. Avvio del server
app.listen(PORT, () => {
  console.info(`🚀 Server running on port ${PORT}`);
});
