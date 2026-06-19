// backend/routes/cardRouter.ts
import { Router } from "express";
import {
  syncPokemon,
  syncPokemonJp,
  syncYugioh,
  syncOnePiece,
} from "../controllers/cardController.js";



const router = Router();

//rotte specifiche per ogni tipo di importazione
router.post("/sync/pokemon", syncPokemon);
router.post("/sync/pokemon-jp", syncPokemonJp);
router.post("/sync/yugioh", syncYugioh);
router.post("/sync/OnePiece", syncOnePiece);


export default router;
