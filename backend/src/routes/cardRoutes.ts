// backend/routes/cardRouter.ts
import { Router } from "express";
import {
  syncPokemon,
  syncPokemonJp,
  syncYugioh,
  syncOnePiece,
} from "../controllers/CardController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
const staffOnly = [authenticate, authorize("ADMIN", "SUPERADMIN")] as const;

// rotte specifiche per ogni tipo di importazione — scrivono nel DB, solo staff
router.post("/sync/pokemon", ...staffOnly, syncPokemon);
router.post("/sync/pokemon-jp", ...staffOnly, syncPokemonJp);
router.post("/sync/yugioh", ...staffOnly, syncYugioh);
router.post("/sync/one-piece", ...staffOnly, syncOnePiece);

export default router;
