import { Router } from "express";
import { syncManga } from "../controllers/mangaController.js";

const router = Router();

// Rotta GET per avviare la sincronizzazione dei manga tramite query string (es. ?q=Naruto)
router.get("/sync", syncManga);

export default router;