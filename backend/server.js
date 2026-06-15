import "dotenv/config";
import express from "express";
import prisma from "./db/connection.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", async (req, res) => {
  try {
    const comics = await prisma.comic.findMany();
    res.json({
      status: "success",
      message: "Backend e Database comunicano alla perfezione!",
      data: comics,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Errore durante la lettura dal database",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.info(`🚀 Server running on port ${PORT}`);
});
