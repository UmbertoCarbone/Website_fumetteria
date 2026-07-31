import { Request, Response } from "express";
import prisma from "../db/connection.js";
import { resolveCategory, resolveFranchise } from "../service/catalogSync.js";
import { sendError, handleControllerError, NotFoundError } from "../utils/httpErrors.js";
import { parseId } from "../utils/parseId.js";
import { createFunkoSchema, updateFunkoSchema } from "../validators/funkoValidator.js";

const funkoInclude = { category: true, franchise: true, funkoPop: true };

// ------------------------------------------------------------
// GET / — Lista di tutti i Funko Pop
// ------------------------------------------------------------
export const getFunkos = async (req: Request, res: Response) => {
  try {
    const funkos = await prisma.product.findMany({
      where: { category: { slug: "funko" } },
      include: funkoInclude,
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(funkos);
  } catch (error) {
    handleControllerError(res, error);
  }
};

// ------------------------------------------------------------
// GET /:id — Dettaglio di un singolo Funko Pop
// ------------------------------------------------------------
export const getFunkoById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return sendError(res, 400, "id non valido");

  try {
    const funko = await prisma.product.findUnique({
      where: { id },
      include: funkoInclude,
    });

    if (!funko || !funko.funkoPop) {
      return sendError(res, 404, "Funko Pop non trovato");
    }

    res.status(200).json(funko);
  } catch (error) {
    handleControllerError(res, error);
  }
};

// ------------------------------------------------------------
// POST / — Crea un Funko Pop inserito a mano (dati presi da
// Funko Europe/Funko US, immagini copiate manualmente)
// ------------------------------------------------------------
export const createFunko = async (req: Request, res: Response) => {
  const validation = createFunkoSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, "Dati Funko Pop non validi", {
      errors: validation.error.format(),
    });
  }
  const data = validation.data;

  try {
    const product = await prisma.$transaction(async (tx) => {
      // Categoria fissa: un Funko è sempre "Funko", nessun bisogno di specificarla
      const category = await resolveCategory(tx, "funko", "Funko");

      // Franchise dinamico: se "Star Wars" non esiste ancora lo crea al volo
      const franchise = data.franchiseName
        ? await resolveFranchise(tx, data.franchiseName, "MANUAL", data.franchiseName)
        : null;

      const newProduct = await tx.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description ?? null,
          images: data.images,
          price: data.price,
          stock: data.stock,
          categoryId: category.id,
          franchiseId: franchise?.id ?? null,
        },
      });

      await tx.funkoPop.create({
        data: {
          productId: newProduct.id,
          boxNumber: data.boxNumber ?? null,
          isChase: data.isChase ?? false,
          stickerExclusive: data.stickerExclusive ?? null,
        },
      });

      return tx.product.findUniqueOrThrow({
        where: { id: newProduct.id },
        include: funkoInclude,
      });
    });

    res.status(201).json({ message: "Funko Pop creato!", product });
  } catch (error) {
    handleControllerError(res, error);
  }
};

// ------------------------------------------------------------
// PATCH /:id — Aggiorna un Funko Pop esistente
// ------------------------------------------------------------
export const updateFunko = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return sendError(res, 400, "id non valido");

  const validation = updateFunkoSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, "Dati Funko Pop non validi", {
      errors: validation.error.format(),
    });
  }
  const data = validation.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("Funko Pop non trovato");

      // Se cambia il franchise, risolvilo/crealo come nella create
      let franchiseId = existing.franchiseId;
      if (data.franchiseName !== undefined) {
        const franchise = data.franchiseName
          ? await resolveFranchise(tx, data.franchiseName, "MANUAL", data.franchiseName)
          : null;
        franchiseId = franchise?.id ?? null;
      }

      // Aggiorna/crea il dettaglio solo se arriva almeno un campo specifico
      if (
        data.boxNumber !== undefined ||
        data.isChase !== undefined ||
        data.stickerExclusive !== undefined
      ) {
        await tx.funkoPop.upsert({
          where: { productId: id },
          update: {
            ...(data.boxNumber !== undefined && { boxNumber: data.boxNumber }),
            ...(data.isChase !== undefined && { isChase: data.isChase }),
            ...(data.stickerExclusive !== undefined && {
              stickerExclusive: data.stickerExclusive,
            }),
          },
          create: {
            productId: id,
            boxNumber: data.boxNumber ?? null,
            isChase: data.isChase ?? false,
            stickerExclusive: data.stickerExclusive ?? null,
          },
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
          franchiseId,
        },
        include: funkoInclude,
      });
    });

    res.status(200).json(updated);
  } catch (error) {
    handleControllerError(res, error, "Funko Pop non trovato");
  }
};

// ------------------------------------------------------------
// DELETE /:id — Elimina un Funko Pop
// (FunkoPop collegato sparisce da solo grazie a onDelete: Cascade)
// ------------------------------------------------------------
export const deleteFunko = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return sendError(res, 400, "id non valido");

  try {
    await prisma.product.delete({ where: { id } });
    res.status(200).json({ message: "Funko Pop eliminato" });
  } catch (error) {
    handleControllerError(res, error, "Funko Pop non trovato");
  }
};
