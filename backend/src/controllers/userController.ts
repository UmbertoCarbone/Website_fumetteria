import { Request, Response } from "express";
import prisma from "../db/connection.js";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true, // La password rimane nascosta per sicurezza!
      },
    });
    return res.json(users);
  } catch (error) {
    console.error("[Get All Users Error]:", error);
    return res.status(500).json({ message: "Errore nel recupero utenti" });
  }
};