import { Request, Response } from "express";
import prisma from "../../db/connection.js";

const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// 1. GET / - Recupera tutti
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        subCategory: { include: { category: true } },
        franchise: true,
        card: true,
        funkoPop: true,
        manga: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 2. GET /:id
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        subCategory: { include: { category: true } },
        franchise: true,
        card: true,
        funkoPop: true,
        manga: true,
      },
    });
    if (!product)
      return res.status(404).json({ error: "Prodotto non trovato" });
    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 3. POST / - Crea prodotto con logica sicura (sequenziale)
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      price,
      stock,
      type,
      categoryName,
      subCategoryName,
      franchiseName,
      cardDetails,
      funkoDetails,
      mangaDetails,
    } = req.body;

    const parsedStock = parseInt(stock?.toString() || "0", 10);
    const productPrice = parseFloat(price.toString().replace(",", "."));
    const targetFranchise = franchiseName || categoryName;

    const newProduct = await prisma.$transaction(async (tx) => {
      const category = await tx.category.upsert({
        where: { slug: createSlug(categoryName) },
        update: { nameCategory: categoryName },
        create: { nameCategory: categoryName, slug: createSlug(categoryName) },
      });
      const subCategory = await tx.subCategory.upsert({
        where: {
          nameSubCategory_categoryId: {
            nameSubCategory: subCategoryName,
            categoryId: category.id,
          },
        },
        update: { nameSubCategory: subCategoryName },
        create: {
          nameSubCategory: subCategoryName,
          slug: createSlug(subCategoryName),
          categoryId: category.id,
        },
      });
      const franchise = await tx.franchise.upsert({
        where: { slug: createSlug(targetFranchise) },
        update: { nameFranchise: targetFranchise },
        create: {
          nameFranchise: targetFranchise,
          slug: createSlug(targetFranchise),
        },
      });

      let cardId = null,
        funkoPopId = null,
        mangaId = null;

      if (type === "CARD" && cardDetails) {
        const c = await tx.card.create({ data: { ...cardDetails } });
        cardId = c.id;
      } else if (type === "FUNKO" && funkoDetails) {
        const f = await tx.funkoPop.create({ data: { ...funkoDetails } });
        funkoPopId = f.id;
      } else if (type === "MANGA" && mangaDetails) {
        const m = await tx.manga.create({ data: { ...mangaDetails } });
        mangaId = m.id;
      }

      return await tx.product.create({
        data: {
          name,
          price: productPrice,
          stock: parsedStock,
          isAvailable: parsedStock > 0,
          type,
          subCategoryId: subCategory.id,
          franchiseId: franchise.id,
          cardId,
          funkoPopId,
          mangaId,
        },
        include: {
          card: true,
          funkoPop: true,
          manga: true,
          subCategory: true,
          franchise: true,
        },
      });
    });
    res.status(201).json({ message: "Prodotto creato!", product: newProduct });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 4. PATCH /:id - Aggiorna con logica sicura
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      stock,
      type,
      cardDetails,
      funkoDetails,
      mangaDetails,
    } = req.body;
    const productId = Number(id);

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.findUnique({ where: { id: productId } });
      if (!prod) throw new Error("Prodotto non trovato");

      if (type === "CARD" && cardDetails && prod.cardId)
        await tx.card.update({ where: { id: prod.cardId }, data: cardDetails });
      if (type === "FUNKO" && funkoDetails && prod.funkoPopId)
        await tx.funkoPop.update({
          where: { id: prod.funkoPopId },
          data: funkoDetails,
        });
      if (type === "MANGA" && mangaDetails && prod.mangaId)
        await tx.manga.update({
          where: { id: prod.mangaId },
          data: mangaDetails,
        });

      return await tx.product.update({
        where: { id: productId },
        data: {
          ...(name && { name }),
          ...(price && {
            price: parseFloat(price.toString().replace(",", ".")),
          }),
          ...(stock !== undefined && {
            stock: parseInt(stock),
            isAvailable: parseInt(stock) > 0,
          }),
        },
        include: { card: true, funkoPop: true, manga: true },
      });
    });
    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 5. DELETE /:id
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.status(200).json({ message: "Prodotto eliminato" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
