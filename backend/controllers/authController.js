/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTROLLER DI AUTENTICAZIONE (REGISTRAZIONE & LOGIN)
 * ─────────────────────────────────────────────────────────────────────────────
 * Questo modulo gestisce la logica di business per la sicurezza degli utenti.
 * Si occupa di:
 * 1. Validare e sanitizzare i dati in ingresso (email, username, password).
 * 2. Verificare l'esistenza di duplicati nel database tramite Prisma ORM.
 * 3. Criptare le password tramite l'algoritmo Bcrypt prima del salvataggio.
 * 4. Mitigare attacchi di tipo "Timing Attack" durante la fase di login.
 * 5. Rilasciare un Access Token (JWT) nel body della risposta per il frontend.
 * 6. Rilasciare un Refresh Token sicuro all'interno di un cookie HTTPOnly,
 * configurato in modo dinamico in base all'ambiente (Locale vs Produzione).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Inizializziamo il client di Prisma per interagire con il database PostgreSQL
const prisma = new PrismaClient();

/**
 * Helper function: Valida il formato dell'email tramite espressione regolare (Regex).
 * Ritorna true se il formato è valido, altrimenti false.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── 1. LOGICA DI REGISTRAZIONE ───────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    // Estraiamo i dati inviati dal form del frontend
    const { email, username, password } = req.body;

    // CONTROLLO 1: Verifichiamo che tutti i campi fondamentali siano stati compilati
    if (!email || !username || !password) {
      return res
        .status(400)
        .json({ error: true, message: "Tutti i campi sono obbligatori" });
    }

    // CONTROLLO 2: Verifichiamo che l'email abbia una struttura valida (es. nome@dominio.com)
    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ error: true, message: "Formato email non valido" });
    }

    // CONTROLLO 3: Imponiamo una lunghezza minima e massima della password per sicurezza
    if (password.length < 8 || password.length > 72) {
      return res
        .status(400)
        .json({
          error: true,
          message: "La password deve essere tra gli 8 e i 72 caratteri",
        });
    }

    // SANITIZZAZIONE: Rimuoviamo spazi vuoti accidentali e convertiamo l'email in minuscolo
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // DATABASE CHECK: Controlliamo se esiste già un utente con la stessa email o lo stesso username
    const userExists = await prisma.user.findFirst({
      where: { OR: [{ email: cleanEmail }, { username: cleanUsername }] },
    });

    // Se troviamo un duplicato, blocchiamo la registrazione mandando un errore di conflitto (409)
    if (userExists) {
      return res
        .status(409)
        .json({ error: true, message: "Email o Username già utilizzati" });
    }

    // CRITTOGRAFIA: Trasformiamo la password in chiaro in un hash illeggibile (12 round di rimescolamento)
    const hashedPassword = await bcrypt.hash(password, 12);

    // SALVATAGGIO: Creiamo effettivamente il nuovo record nella tabella User di PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        username: cleanUsername,
        password: hashedPassword,
      },
    });

    // RISPOSTA: Inviamo al frontend la conferma e i dati pubblici dell'utente (escludendo la password)
    return res.status(201).json({
      error: false,
      message: "Utente registrato con successo!",
      user: {
        id: newUser.id,
        email: newUser.email,
        username: cleanUsername,
        role: newUser.role,
      },
    });
  } catch (error) {
    // Gestione errori di sistema: stampiamo l'errore reale solo sul terminale del server per fare debug
    console.error("[Register Error]:", error);
    // Al client esterno restituiamo un messaggio generico per non esporre dettagli del database
    return res
      .status(500)
      .json({
        error: true,
        message: "Errore interno durante la registrazione",
      });
  }
};

// ─── 2. LOGICA DI LOGIN ───────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    // Estraiamo le credenziali inserite dall'utente
    const { email, password } = req.body;

    // CONTROLLO 1: Verifichiamo la presenza di entrambi i campi
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: true, message: "Email e password obbligatorie" });
    }

    // SANITIZZAZIONE: Puliamo l'email in ingresso per riflettere il formato del database
    const cleanEmail = email.trim().toLowerCase();

    // DATABASE CHECK: Cerchiamo l'utente tramite la sua email unica
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    /**
     * PROTEZIONE TIMING ATTACK:
     * Se l'utente non esiste, Bcrypt salterebbe il confronto della password rispondendo istantaneamente.
     * Un hacker potrebbe misurare i tempi di risposta per capire quali email sono registrate.
     * Soluzione: Se l'utente non c'è, confrontiamo la password con un hash fittizio (DUMMY_HASH).
     * In questo modo il server impiega sempre lo stesso tempo a rispondere.
     */
    const DUMMY_HASH =
      "$2b$12$invalidhashfortimingprotectiononly000000000000000000000";
    const passwordToCheck = user ? user.password : DUMMY_HASH;

    // Confrontiamo la password inserita con l'hash estratto (o con quello fittizio)
    const isPasswordValid = await bcrypt.compare(password, passwordToCheck);

    // Se l'utente non esiste OPPURE la password è errata, restituiamo un errore generico 401 (Non Autorizzato)
    if (!user || !isPasswordValid) {
      return res
        .status(401)
        .json({ error: true, message: "Credenziali non valide" });
    }

    // Sicurezza d'ambiente: Verifichiamo che la chiave segreta JWT sia configurata nel file .env
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET manca nel file .env!");
    }

    // ACCESS TOKEN: Generiamo un token che contiene ID e Ruolo, valido per 1 giorno
    const token = jwt.sign({ id: user.id, role: user.role }, secret, {
      expiresIn: "1d",
      algorithm: "HS256",
    });

    // REFRESH TOKEN: Generiamo un secondo token a lungo termine, valido per 7 giorni
    const refreshToken = jwt.sign({ id: user.id }, secret, {
      expiresIn: "7d",
      algorithm: "HS256",
    });

    // CONFIGURAZIONE DINAMICA COOKIE: Controlliamo se siamo in produzione (online) o in sviluppo (locale)
    const isProduction = process.env.NODE_ENV === "production";

    // Inseriamo il Refresh Token dentro un Cookie HTTPOnly sicuro
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Impedisce a script JavaScript malevoli (XSS) di leggere il cookie
      secure: isProduction, // Se true, viaggia solo su HTTPS (produzione). In locale (HTTP) deve essere false
      sameSite: isProduction ? "Strict" : "Lax", // Regola il passaggio del cookie tra domini differenti
      maxAge: 7 * 24 * 60 * 60 * 1000, // Durata fisica del cookie nel browser espressa in millisecondi (7 giorni)
    });

    // RISPOSTA: Restituiamo il successo del login, l'Access Token e i dettagli dell'utente nel body
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
