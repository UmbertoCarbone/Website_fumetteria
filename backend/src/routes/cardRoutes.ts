// backend/routes/cardRouter.ts
import { Router } from "express";
import {
  syncPokemon,
  syncPokemonJp,
  syncYugioh,
} from "../controllers/cardController.js";

const router = Router();

// Ora hai rotte specifiche per ogni tipo di importazione
router.post("/sync/pokemon", syncPokemon);
router.post("/sync/pokemon-jp", syncPokemonJp);
router.post("/sync/yugioh", syncYugioh);

export default router;
