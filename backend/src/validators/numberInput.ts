import { z } from "zod";

// Il frontend a volte manda prezzi in formato italiano ("12,50") come stringa:
// li normalizziamo prima che Zod validi il numero risultante.
function toNumber(val: unknown) {
  if (typeof val === "string") {
    const normalized = val.trim().replace(",", ".");
    return normalized === "" ? val : Number(normalized);
  }
  return val;
}

export const priceInput = z.preprocess(
  toNumber,
  z
    .number({ error: "price deve essere un numero" })
    .finite("price non è un numero valido")
    .nonnegative("price non può essere negativo"),
);

export const stockInput = z.preprocess(
  toNumber,
  z
    .number({ error: "stock deve essere un numero" })
    .finite("stock non è un numero valido")
    .int("stock deve essere un numero intero")
    .nonnegative("stock non può essere negativo"),
);

export const optionalIntInput = z.preprocess(toNumber, z.number().finite().int()).nullable().optional();
