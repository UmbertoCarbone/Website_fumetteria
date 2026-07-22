import { Router } from "express";
import { createFunko, getFunkos } from "../controllers/funkoController.js";

const router = Router();

router.get("/", getFunkos);
router.post("/", createFunko);

export default router;