import { Request, Response } from "express";
import prisma from "../../db/connection.js";

// Helper condiviso: mantiene coerenza anche senza trigger DB
const computeAvailability = (stock: number) => stock > 0;

// rotta GET
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        subCategory: {
          include: {
            category: true,
          },
        },
      },
    });

    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// rotta POST
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      price,
      stock,
      imageUrl,
      externalId,
      categoryName,
      subCategoryName,
    } = req.body;

    const parsedStock = parseInt(stock?.toString() || "0", 10);

    const newProduct = await prisma.$transaction(async (tx) => {
      const category = await tx.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName },
      });

      const subCategory = await tx.subCategory.upsert({
        where: {
          name_categoryId: { name: subCategoryName, categoryId: category.id },
        },
        update: {},
        create: { name: subCategoryName, categoryId: category.id },
      });

      return await tx.product.create({
        data: {
          name,
          price: parseFloat(price.toString().replace(",", ".")),
          stock: parsedStock,
          imageUrl,
          externalId,
          subCategoryId: subCategory.id,
        },
      });
    });

    res.status(201).json(newProduct);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// rotta PATCH /:id
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, stock, imageUrl } = req.body;

    const data: Record<string, any> = {};
    if (name !== undefined) data.name = name;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (price !== undefined)
      data.price = parseFloat(price.toString().replace(",", "."));
    if (stock !== undefined) {
      const parsedStock = parseInt(stock.toString(), 10);
      data.stock = parsedStock;
      data.isAvailable = computeAvailability(parsedStock);
    }

    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data,
    });

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// rotta GET /:id (Singolo prodotto tramite ID)
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        subCategory: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Prodotto non trovato" });
    }

    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// rotta DELETE /:id (Eliminazione prodotto)
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: "Prodotto eliminato con successo" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ error: "Impossibile eliminare: prodotto non trovato" });
    }
    res.status(500).json({ error: error.message });
  }
};
