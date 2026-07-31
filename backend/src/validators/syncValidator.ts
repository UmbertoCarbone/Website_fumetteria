import { z } from "zod";

// query string: tutti i valori arrivano come string | undefined
const nonEmptyQueryString = (label: string) =>
  z
    .string({ error: `${label} è obbligatorio` })
    .trim()
    .min(1, `${label} è obbligatorio`);

export const cardSyncQuerySchema = z.object({
  q: nonEmptyQueryString("q"),
  set: z.string().trim().optional(),
  limit: z.string().trim().optional(),
});

export const mangaSyncQuerySchema = z.object({
  q: nonEmptyQueryString("q"),
  franchise: nonEmptyQueryString("franchise"),
});

export const boardGameSyncBodySchema = z.object({
  q: nonEmptyQueryString("q"),
});
