import { Router } from "express";
import { syncLegoSet } from "../controllers/legoController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Scrive/aggiorna prodotti nel DB: solo staff autenticato
router.post("/sync", authenticate, authorize("ADMIN", "SUPERADMIN"), syncLegoSet);

export default router;
