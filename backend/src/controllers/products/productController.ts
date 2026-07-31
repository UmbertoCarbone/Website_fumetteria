import { Request, Response } from "express";
import prisma from "../../db/connection.js";
import {
  resolveCategory,
  resolveFranchise,
} from "../../service/catalogSync.js";
import { sendError, handleControllerError, NotFoundError } from "../../utils/httpErrors.js";
import { parseId } from "../../utils/parseId.js";
import { createProductSchema, updateProductSchema } from "../../validators/productValidator.js";

const productInclude = {
  category: true,
  franchise: true,
  card: true,
  funkoPop: true,
  manga: true,
  boardGame: true,
};

// ------------------------------------------------------------
// 1. GET / — Recupera tutti i prodotti
// ------------------------------------------------------------
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(products);
  } catch (error) {
    handleControllerError(res, error);
  }
};

// ------------------------------------------------------------
// 2. GET /:id
// ------------------------------------------------------------
export const getProductById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return sendError(res, 400, "id non valido");

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) return sendError(res, 404, "Prodotto non trovato");
    res.status(200).json(product);
  } catch (error) {
    handleControllerError(res, error);
  }
};

// ------------------------------------------------------------
// 3. POST / — Crea prodotto manualmente (es. da pannello admin)
//    Il tipo si deduce da quale oggetto *Details è presente nel body,
//    non da un campo "type" separato da tenere sincronizzato a mano.
// ------------------------------------------------------------
export const createProduct = async (req: Request, res: Response) => {
  const validation = createProductSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, "Dati prodotto non validi", {
      errors: validation.error.format(),
    });
  }
  const data = validation.data;

  try {
    const productSku = data.sku || `MANUAL-${Date.now()}`;

    const newProduct = await prisma.$transaction(async (tx) => {
      const category = await resolveCategory(
        tx,
        data.categoryName.toLowerCase().trim().replace(/\s+/g, "-"),
        data.categoryName,
      );

      const franchise = data.franchiseName
        ? await resolveFranchise(tx, data.franchiseName, "MANUAL", data.franchiseName)
        : null;

      const product = await tx.product.create({
        data: {
          sku: productSku,
          name: data.name,
          description: data.description ?? null,
          images: data.images,
          price: data.price,
          stock: data.stock,
          categoryId: category.id,
          franchiseId: franchise?.id ?? null,
        },
      });

      if (data.cardDetails) {
        await tx.card.create({
          data: { ...data.cardDetails, productId: product.id },
        });
      } else if (data.funkoDetails) {
        await tx.funkoPop.create({
          data: { ...data.funkoDetails, productId: product.id },
        });
      } else if (data.mangaDetails) {
        await tx.manga.create({
          data: { ...data.mangaDetails, productId: product.id },
        });
      } else if (data.boardGameDetails) {
        await tx.boardGame.create({
          data: { ...data.boardGameDetails, productId: product.id },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: productInclude,
      });
    });

    res.status(201).json({ message: "Prodotto creato!", product: newProduct });
  } catch (error) {
    handleControllerError(res, error);
  }
};

// ------------------------------------------------------------
// 4. PATCH /:id — Aggiorna prodotto e/o il suo dettaglio
// ------------------------------------------------------------
export const updateProduct = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return sendError(res, 400, "id non valido");

  const validation = updateProductSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, "Dati prodotto non validi", {
      errors: validation.error.format(),
    });
  }
  const data = validation.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.findUnique({ where: { id } });
      if (!prod) throw new NotFoundError("Prodotto non trovato");

      if (data.cardDetails) {
        const cardDetails = data.cardDetails;
        await tx.card.upsert({
          where: { productId: id },
          update: cardDetails,
          create: {
            productId: id,
            number: cardDetails.number ?? "",
            rarity: cardDetails.rarity ?? "Common",
            set: cardDetails.set ?? "",
            variant: cardDetails.variant ?? "",
          },
        });
      }
      if (data.funkoDetails) {
        await tx.funkoPop.upsert({
          where: { productId: id },
          update: data.funkoDetails,
          create: { ...data.funkoDetails, productId: id },
        });
      }
      if (data.mangaDetails) {
        await tx.manga.upsert({
          where: { productId: id },
          update: data.mangaDetails,
          create: { ...data.mangaDetails, productId: id },
        });
      }
      if (data.boardGameDetails) {
        await tx.boardGame.upsert({
          where: { productId: id },
          update: data.boardGameDetails,
          create: { ...data.boardGameDetails, productId: id },
        });
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.images !== undefined && { images: data.images }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.stock !== undefined && { stock: data.stock }),
        },
        include: productInclude,
      });
    });

    res.status(200).json(updated);
  } catch (error) {
    handleControllerError(res, error, "Prodotto non trovato");
  }
};

// ------------------------------------------------------------
// 5. DELETE /:id
//    Il dettaglio collegato (Card/Manga/...) viene cancellato in
//    automatico grazie a onDelete: Cascade nello schema.
// ------------------------------------------------------------
export const deleteProduct = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return sendError(res, 400, "id non valido");

  try {
    await prisma.product.delete({ where: { id } });
    res.status(200).json({ message: "Prodotto eliminato" });
  } catch (error) {
    handleControllerError(res, error, "Prodotto non trovato");
  }
};
