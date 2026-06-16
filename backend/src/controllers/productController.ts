import { Request, Response } from "express";
import prisma from "../db/connection.js";

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    // Recupera tutto il catalogo senza filtri
    const products = await prisma.product.findMany({
      include: {
        category: true,
        subCategory: true,
        publisher: true
      }
    });

    res.status(200).json(products);
  } catch (error) {
    console.error("Errore recupero prodotti:", error);
    res.status(500).json({ error: true, message: "Errore interno del server" });
  }
};