import { Router } from "express";
import { syncManga } from "../controllers/mangaController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// POST perché la sincronizzazione scrive/aggiorna prodotti nel DB (non è una
// semplice lettura, quindi GET non è il verbo corretto); parametri via query
// string (es. ?q=Naruto&franchise=Naruto), coerente con /api/cards/sync/*.
router.post("/sync", authenticate, authorize("ADMIN", "SUPERADMIN"), syncManga);

export default router;