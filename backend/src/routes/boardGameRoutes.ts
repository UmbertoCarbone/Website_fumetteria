import { Router } from "express";
import { syncBoardGames } from "../controllers/bordGameController.js";

const router = Router();

// Gestisce unicamente la richiesta POST
router.post("/sync", syncBoardGames);

export default router;