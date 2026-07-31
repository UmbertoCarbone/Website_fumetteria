import { Response } from "express";
import { Prisma } from "@prisma/client";

// Usato dai controller per segnalare "risorsa non trovata" prima ancora
// di arrivare a Prisma (es. il record non esiste già a inizio transazione).
export class NotFoundError extends Error {}

// Forma unica di risposta di errore per tutta l'API: { error: true, message, ...extra }
export function sendError(
  res: Response,
  status: number,
  message: string,
  extra?: Record<string, unknown>,
) {
  return res.status(status).json({ error: true, message, ...extra });
}

// Traduce gli errori Prisma noti in status HTTP corretti, così i controller
// non devono ripetere lo stesso switch ovunque.
export function handleControllerError(
  res: Response,
  error: unknown,
  notFoundMessage = "Risorsa non trovata",
) {
  if (error instanceof NotFoundError) {
    return sendError(res, 404, error.message || notFoundMessage);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025":
        return sendError(res, 404, notFoundMessage);
      case "P2002": {
        const target = Array.isArray(error.meta?.target)
          ? (error.meta!.target as string[]).join(", ")
          : undefined;
        return sendError(
          res,
          409,
          target
            ? `Valore già in uso per: ${target}`
            : "Valore già in uso, deve essere univoco",
        );
      }
      case "P2003":
        return sendError(
          res,
          400,
          "Riferimento non valido: la risorsa collegata non esiste",
        );
    }
  }

  console.error(error);
  return sendError(res, 500, "Errore interno del server");
}
