import { z } from "zod";
import { priceInput, stockInput, optionalIntInput } from "./numberInput.js";

export const createFunkoSchema = z.object({
  sku: z.string().trim().min(1, "sku è obbligatorio"),
  name: z.string().trim().min(1, "name è obbligatorio"),
  description: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  price: priceInput,
  stock: stockInput.optional().default(0),
  franchiseName: z.string().trim().min(1).optional(),
  boxNumber: optionalIntInput,
  isChase: z.boolean().optional(),
  stickerExclusive: z.string().trim().nullable().optional(),
});

export const updateFunkoSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  price: priceInput.optional(),
  stock: stockInput.optional(),
  franchiseName: z.string().trim().min(1).nullable().optional(),
  boxNumber: optionalIntInput,
  isChase: z.boolean().optional(),
  stickerExclusive: z.string().trim().nullable().optional(),
});

export type CreateFunkoInput = z.infer<typeof createFunkoSchema>;
export type UpdateFunkoInput = z.infer<typeof updateFunkoSchema>;
