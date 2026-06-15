import "dotenv/config";
import express from "express";
import prisma from "./db/connection.js";

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.get("/", async (req, res) => {
  try {
    res.json({ status: "success", message: "Connessione OK!", data: await prisma.comic.findMany() });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Errore DB", details: err.message });
  }
});

app.listen(PORT, () => {
  console.info(`🚀 Server running on port ${PORT}`);
});
