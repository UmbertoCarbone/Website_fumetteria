import { Request, Response } from "express";
import prisma from "../db/connection.js";

//rotta GET
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        subCategory: {
          include: {
            category: true, // Include anche la categoria padre
          },
        },
      },
    });

    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

//rotta POST
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, price, imageUrl, externalId, categoryName, subCategoryName } =
      req.body;

    // Usiamo una transazione per garantire l'integrità dei dati
    const newProduct = await prisma.$transaction(async (tx) => {
      // 1. Categoria
      const category = await tx.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName },
      });

      // 2. Sottocategoria
      let subCategory = await tx.subCategory.findFirst({
        where: { name: subCategoryName, categoryId: category.id },
      });

      if (!subCategory) {
        subCategory = await tx.subCategory.create({
          data: { name: subCategoryName, categoryId: category.id },
        });
      }

      // 3. Prodotto
      return await tx.product.create({
        data: {
          name,
          price: parseFloat(price.toString().replace(",", ".")),
          imageUrl,
          externalId,
          subCategoryId: subCategory.id,
        },
      });
    });

    res.status(201).json(newProduct);
  } catch (error: any) {
    // Se c'è un errore, Prisma annullerà automaticamente le operazioni precedenti
    res.status(500).json({ error: error.message });
  }
};
