import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true, // Non mostriamo la password per sicurezza!
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero utenti" });
  }
};