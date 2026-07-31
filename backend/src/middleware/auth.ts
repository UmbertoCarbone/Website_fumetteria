import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface AuthPayload {
  id: number;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// Legge "Authorization: Bearer <token>", verifica la firma e popola req.user.
// Prima di questo middleware, i token generati al login non venivano mai
// controllati da nessuna parte: qualunque richiesta, anche senza token, veniva eseguita.
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: true, message: "Token di autenticazione mancante" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[auth middleware] JWT_SECRET mancante nel .env");
    return res.status(500).json({ error: true, message: "Errore di configurazione del server" });
  }

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    req.user = { id: payload.id as number, role: payload.role as Role };
    next();
  } catch {
    return res.status(401).json({ error: true, message: "Token non valido o scaduto" });
  }
}

// Va sempre usato dopo `authenticate`. Limita l'accesso ai soli ruoli indicati.
export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: true, message: "Autenticazione richiesta" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: true, message: "Permessi insufficienti" });
    }
    next();
  };
}
