import { Router } from "express";
import { syncBoardGames } from "../controllers/bordGameController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Scrive/aggiorna prodotti nel DB: solo staff autenticato
router.post("/sync", authenticate, authorize("ADMIN", "SUPERADMIN"), syncBoardGames);

export default router;