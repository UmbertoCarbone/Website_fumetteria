import { z } from "zod";
import { priceInput, stockInput, optionalIntInput } from "./numberInput.js";

// .strict() su ogni dettaglio: un campo non previsto dal modello (es. "id",
// "productId") fa fallire la validazione con 400 invece di essere passato
// così com'è dentro una create/update di Prisma.
export const cardDetailsSchema = z
  .object({
    number: z.string().trim().min(1, "number è obbligatorio"),
    rarity: z.string().trim().min(1).default("Common"),
    set: z.string().trim().min(1, "set è obbligatorio"),
    variant: z.string().trim().default(""),
  })
  .strict();

export const funkoDetailsSchema = z
  .object({
    boxNumber: optionalIntInput,
    isChase: z.boolean().optional(),
    stickerExclusive: z.string().trim().nullable().optional(),
  })
  .strict();

export const mangaDetailsSchema = z
  .object({
    volume: optionalIntInput,
    authors: z.array(z.string().trim().min(1)).default([]),
    chapters: optionalIntInput,
    synopsis: z.string().nullable().optional(),
    score: z.number().finite().nullable().optional(),
    status: z.string().trim().nullable().optional(),
  })
  .strict();

export const boardGameDetailsSchema = z
  .object({
    minPlayers: optionalIntInput,
    maxPlayers: optionalIntInput,
    playingTime: optionalIntInput,
    minPlayTime: optionalIntInput,
    maxPlayTime: optionalIntInput,
    minAge: optionalIntInput,
    yearPublished: optionalIntInput,
  })
  .strict();

const detailsRefinement = <T extends z.ZodType<Record<string, unknown>>>(schema: T) =>
  schema.superRefine((data, ctx) => {
    const provided = ["cardDetails", "funkoDetails", "mangaDetails", "boardGameDetails"].filter(
      (key) => data[key] !== undefined,
    );
    if (provided.length > 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Specifica al massimo un tipo di dettaglio prodotto (cardDetails/funkoDetails/mangaDetails/boardGameDetails)",
      });
    }
  });

export const createProductSchema = detailsRefinement(
  z.object({
    sku: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1, "name è obbligatorio"),
    description: z.string().nullable().optional(),
    images: z.array(z.string()).default([]),
    price: priceInput,
    stock: stockInput.optional().default(0),
    categoryName: z.string().trim().min(1, "categoryName è obbligatorio"),
    franchiseName: z.string().trim().min(1).optional(),
    cardDetails: cardDetailsSchema.optional(),
    funkoDetails: funkoDetailsSchema.optional(),
    mangaDetails: mangaDetailsSchema.optional(),
    boardGameDetails: boardGameDetailsSchema.optional(),
  }),
);

export const updateProductSchema = detailsRefinement(
  z.object({
    name: z.string().trim().min(1).optional(),
    description: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),
    price: priceInput.optional(),
    stock: stockInput.optional(),
    cardDetails: cardDetailsSchema.partial().optional(),
    funkoDetails: funkoDetailsSchema.optional(),
    mangaDetails: mangaDetailsSchema.partial().optional(),
    boardGameDetails: boardGameDetailsSchema.optional(),
  }),
);

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
