import { Request, Response } from "express";
import prisma from "../../../db/connection.js";

/**
 * ENDPOINT 1: Cerca prodotti per Categoria (ID, Nome o entrambi)
 * POSTMAN: GET /api/products-filter/category?id=...&name=...
 */
export const getProductsByCategoryFilter = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id, name } = req.query;

    // Se l'utente non passa né ID né Nome, blocchiamo la richiesta
    if (!id && !name) {
      return res.status(400).json({
        error: true,
        message:
          "Devi fornire almeno un parametro tra 'id' e 'name' della categoria.",
      });
    }

    // Costruiamo le condizioni di filtro per Prisma
    const categoryConditions: Record<string, any> = {};

    if (id) {
      categoryConditions.id = Number(id);
    }

    if (name) {
      const cleanName = String(name).trim();

      categoryConditions.name = {
        contains: cleanName, // Cerca corrispondenze parziali (es. "funko" trova "Funko Pop")
        mode: "insensitive", // Ignora maiuscole/minuscole
      };
    }

    // Cerchiamo i prodotti filtrando attraverso la relazione subCategory -> category
    const products = await prisma.product.findMany({
      where: {
        subCategory: {
          category: categoryConditions, // Applica i filtri dinamici sulla categoria
        },
      },
      include: {
        subCategory: {
          include: {
            category: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      resultsCount: products.length,
      data: products,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
