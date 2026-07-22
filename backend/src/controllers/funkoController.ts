import { Request, Response } from "express";
import prisma from "../db/connection.js";
import { resolveCategory, resolveFranchise } from "../service/catalogSync.js";

// ------------------------------------------------------------
// POST / — Crea un Funko Pop inserito a mano (dati presi da
// Funko Europe/Funko US, immagini copiate manualmente)
// ------------------------------------------------------------
export const createFunko = async (req: Request, res: Response) => {
  try {
    const {
      sku,
      name,
      description,
      images,       // convenzione: images[0] = scatola, images[1] = figura
      price,
      stock,
      franchiseName, // opzionale: es. "Star Wars", "Pokemon"...
      boxNumber,
      isChase,
      stickerExclusive,
    } = req.body;

    if (!sku || !name || price === undefined) {
      return res.status(400).json({
        error: true,
        message: "sku, name e price sono obbligatori",
      });
    }

    const parsedStock = parseInt(stock?.toString() || "0", 10);
    const parsedPrice = parseFloat(price.toString().replace(",", "."));

    const product = await prisma.$transaction(async (tx) => {
      // Categoria fissa: un Funko è sempre "Funko", nessun bisogno di specificarla
      const category = await resolveCategory(tx, "funko", "Funko");

      // Franchise dinamico: se "Star Wars" non esiste ancora lo crea al volo
      const franchise = franchiseName
        ? await resolveFranchise(tx, franchiseName, "MANUAL", franchiseName)
        : null;

      const newProduct = await tx.product.create({
        data: {
          sku,
          name,
          description: description || null,
          images: images || [],
          price: parsedPrice,
          stock: parsedStock,
          isAvailable: parsedStock > 0,
          categoryId: category.id,
          franchiseId: franchise?.id ?? null,
        },
      });

      await tx.funkoPop.create({
        data: {
          productId: newProduct.id,
          boxNumber: boxNumber ? parseInt(boxNumber.toString(), 10) : null,
          isChase: Boolean(isChase),
          stickerExclusive: stickerExclusive || null,
        },
      });

      return tx.product.findUnique({
        where: { id: newProduct.id },
        include: { category: true, franchise: true, funkoPop: true },
      });
    });

    res.status(201).json({ message: "Funko Pop creato!", product });
  } catch (error: any) {
    // sku duplicato -> messaggio chiaro invece dell'errore Prisma grezzo
    if (error.code === "P2002") {
      return res.status(409).json({
        error: true,
        message: `SKU "${req.body.sku}" già esistente, usane uno diverso`,
      });
    }
    res.status(500).json({ error: true, message: error.message });
  }
};

// ------------------------------------------------------------
// GET / — Lista di tutti i Funko Pop
// ------------------------------------------------------------
export const getFunkos = async (req: Request, res: Response) => {
  try {
    const funkos = await prisma.product.findMany({
      where: { category: { slug: "funko" } },
      include: { category: true, franchise: true, funkoPop: true },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(funkos);
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message });
  }
};