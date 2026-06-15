import "dotenv/config";
import express from "express";
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
app.use("/api/users", userRoutes); // Qui le rotte di userRoutes vengono caricate correttamente

// Rotta di test
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

app.listen(PORT, () => {
  console.info(`🚀 Server running on port ${PORT}`);
});
