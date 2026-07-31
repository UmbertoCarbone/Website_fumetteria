import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import prisma from "../db/connection.js";
import { registerSchema, loginSchema } from "../validators/authValidator.js";

// ─── 1. LOGICA DI REGISTRAZIONE ───────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  // Zod convalida l'input in tempo reale
  const validation = registerSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: true,
      message: "Dati di registrazione non validi",
      errors: validation.error.format()
    });
  }

  // I dati validati ed estratti in sicurezza da Zod
  const { email, username, password } = validation.data;

  try {
    const cleanEmail = email.toLowerCase();

    // DATABASE CHECK
    const userExists = await prisma.user.findFirst({
      where: { OR: [{ email: cleanEmail }, { username: username }] },
    });

    if (userExists) {
      return res
        .status(409)
        .json({ error: true, message: "Email o Username già utilizzati" });
    }

    // CRITTOGRAFIA
    const hashedPassword = await bcrypt.hash(password, 12);

    // SALVATAGGIO
    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        username: username,
        password: hashedPassword,
        role: "USER",
      },
    });

    return res.status(201).json({
      error: false,
      message: "Utente registrato con successo!",
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    // Race condition: due registrazioni simultanee con la stessa email/username
    // possono entrambe superare il controllo di esistenza e scontrarsi sul
    // vincolo unique in fase di create.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ error: true, message: "Email o Username già utilizzati" });
    }
    console.error("[Register Error]:", error);
    return res.status(500).json({
      error: true,
      message: "Errore interno durante la registrazione",
    });
  }
};

// ─── 2. LOGICA DI LOGIN ───────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  // Zod convalida il body delle credenziali
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: true,
      message: "Dati di login non validi",
      errors: validation.error.format()
    });
  }

  const { email, password } = validation.data;

  try {
    const cleanEmail = email.toLowerCase();

    // DATABASE CHECK
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // PROTEZIONE TIMING ATTACK
    const DUMMY_HASH = "$2b$12$invalidhashfortimingprotectiononly000000000000000000000";
    const passwordToCheck = user ? user.password : DUMMY_HASH;

    const isPasswordValid = await bcrypt.compare(password, passwordToCheck);

    if (!user || !isPasswordValid) {
      return res
        .status(401)
        .json({ error: true, message: "Credenziali non valide" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET manca nel file .env!");
    }

    // ACCESS TOKEN
    const token = jwt.sign({ id: user.id, role: user.role }, secret, {
      expiresIn: "1d",
      algorithm: "HS256",
    });

    // REFRESH TOKEN
    const refreshToken = jwt.sign({ id: user.id }, secret, {
      expiresIn: "7d",
      algorithm: "HS256",
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      error: false,
      message: "Login effettuato con successo!",
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error("[Login Error]:", error);
    return res
      .status(500)
      .json({ error: true, message: "Errore interno durante il login" });
  }
};