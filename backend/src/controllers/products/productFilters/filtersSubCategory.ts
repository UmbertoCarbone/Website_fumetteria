import { Request, Response } from "express";
import prisma from "../../../db/connection.js";

/**
 * ENDPOINT 2: Cerca prodotti per Sottocategoria (ID, Nome o entrambi)
 * POSTMAN: GET /api/products/sub-category?id=...&name=...
 */
export const getProductsBySubCategoryFilter = async (req: Request, res: Response) => {
  try {
    const { id, name } = req.query;

    // Se l'utente non passa né ID né Nome, blocchiamo la richiesta
    if (!id && !name) {
      return res.status(400).json({
        error: true,
        message: "Devi fornire almeno un parametro tra 'id' e 'name' della sottocategoria.",
      });
    }

    // Costruiamo le condizioni di filtro per la Sottocategoria
    const subCategoryConditions: Record<string, any> = {};

    if (id) {
      subCategoryConditions.id = Number(id);
    }

    if (name) {
      subCategoryConditions.name = {
        equals: String(name).trim(),
        mode: "insensitive", // Ignora maiuscole e minuscole
      };
    }

    // Cerchiamo i prodotti filtrando direttamente sulla relazione subCategory
    const products = await prisma.product.findMany({
      where: {
        subCategory: subCategoryConditions, // Applica i filtri dinamici sulla sottocategoria
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