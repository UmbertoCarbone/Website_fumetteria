import { Request, Response } from "express";
import prisma from "../../db/connection.js";
import {
  resolveCategory,
  resolveFranchise,
} from "../../service/catalogSync.js";

// ------------------------------------------------------------
// 1. GET / — Recupera tutti i prodotti
// ------------------------------------------------------------
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        franchise: true,
        card: true,
        funkoPop: true,
        manga: true,
        boardGame: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ------------------------------------------------------------
// 2. GET /:id
// ------------------------------------------------------------
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        category: true,
        franchise: true,
        card: true,
        funkoPop: true,
        manga: true,
        boardGame: true,
      },
    });
    if (!product)
      return res.status(404).json({ error: "Prodotto non trovato" });
    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ------------------------------------------------------------
// 3. POST / — Crea prodotto manualmente (es. da pannello admin)
//    Il tipo si deduce da quale oggetto *Details è presente nel body,
//    non da un campo "type" separato da tenere sincronizzato a mano.
// ------------------------------------------------------------
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      sku,
      name,
      description,
      images,
      price,
      stock,
      categoryName, // es. "Carte", "Manga", "Funko", "Giochi da Tavolo"
      franchiseName, // opzionale: prodotti generici senza brand
      cardDetails,
      funkoDetails,
      mangaDetails,
      boardGameDetails,
    } = req.body;

    if (!name || !categoryName) {
      return res
        .status(400)
        .json({ error: "name e categoryName sono obbligatori" });
    }

    const parsedStock = parseInt(stock?.toString() || "0", 10);
    const productPrice = parseFloat(price?.toString().replace(",", ".") || "0");
    const productSku = sku || `MANUAL-${Date.now()}`;

    const newProduct = await prisma.$transaction(async (tx) => {
      const category = await resolveCategory(
        tx,
        categoryName.toLowerCase().trim().replace(/\s+/g, "-"),
        categoryName,
      );

      const franchise = franchiseName
        ? await resolveFranchise(tx, franchiseName, "MANUAL", franchiseName)
        : null;

      const product = await tx.product.create({
        data: {
          sku: productSku,
          name,
          description: description || null,
          images: images || [],
          price: productPrice,
          stock: parsedStock,
          isAvailable: parsedStock > 0,
          categoryId: category.id,
          franchiseId: franchise?.id ?? null,
        },
      });

      // Crea il dettaglio giusto in base a quale oggetto è arrivato nel body
      if (cardDetails) {
        await tx.card.create({
          data: { ...cardDetails, productId: product.id },
        });
      } else if (funkoDetails) {
        await tx.funkoPop.create({
          data: { ...funkoDetails, productId: product.id },
        });
      } else if (mangaDetails) {
        await tx.manga.create({
          data: { ...mangaDetails, productId: product.id },
        });
      } else if (boardGameDetails) {
        await tx.boardGame.create({
          data: { ...boardGameDetails, productId: product.id },
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          franchise: true,
          card: true,
          funkoPop: true,
          manga: true,
          boardGame: true,
        },
      });
    });

    res.status(201).json({ message: "Prodotto creato!", product: newProduct });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ------------------------------------------------------------
// 4. PATCH /:id — Aggiorna prodotto e/o il suo dettaglio
// ------------------------------------------------------------
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = Number(id);
    const {
      name,
      description,
      images,
      price,
      stock,
      cardDetails,
      funkoDetails,
      mangaDetails,
      boardGameDetails,
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.findUnique({ where: { id: productId } });
      if (!prod) throw new Error("Prodotto non trovato");

      // upsert sul dettaglio: aggiorna se esiste già, lo crea se il
      // prodotto non ne aveva ancora uno (es. stavi popolando dati a fasi)
      if (cardDetails) {
        await tx.card.upsert({
          where: { productId },
          update: cardDetails,
          create: { ...cardDetails, productId },
        });
      }
      if (funkoDetails) {
        await tx.funkoPop.upsert({
          where: { productId },
          update: funkoDetails,
          create: { ...funkoDetails, productId },
        });
      }
      if (mangaDetails) {
        await tx.manga.upsert({
          where: { productId },
          update: mangaDetails,
          create: { ...mangaDetails, productId },
        });
      }
      if (boardGameDetails) {
        await tx.boardGame.upsert({
          where: { productId },
          update: boardGameDetails,
          create: { ...boardGameDetails, productId },
        });
      }

      return tx.product.update({
        where: { id: productId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(images && { images }),
          ...(price !== undefined && {
            price: parseFloat(price.toString().replace(",", ".")),
          }),
          ...(stock !== undefined && {
            stock: parseInt(stock),
            isAvailable: parseInt(stock) > 0,
          }),
        },
        include: {
          category: true,
          franchise: true,
          card: true,
          funkoPop: true,
          manga: true,
          boardGame: true,
        },
      });
    });

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ------------------------------------------------------------
// 5. DELETE /:id
//    Il dettaglio collegato (Card/Manga/...) viene cancellato in
//    automatico grazie a onDelete: Cascade nello schema.
// ------------------------------------------------------------
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.status(200).json({ message: "Prodotto eliminato" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
