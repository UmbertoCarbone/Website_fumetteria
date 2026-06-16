import { Router } from "express";
import { syncTcgProducts } from "../controllers/cardController.js";

const router = Router();

// Endpoint POST per attivare la sincronizzazione delle carte
// Questo risponderà all'indirizzo: /api/cards/sync
router.post("/sync", syncTcgProducts);

export default router;