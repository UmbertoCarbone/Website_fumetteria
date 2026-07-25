import { Router } from "express";
import {
  getFunkos,
  getFunkoById,
  createFunko,
  updateFunko,
  deleteFunko,
} from "../controllers/funkoController.js";

const router = Router();

// 1. Rotte fisse (sempre per prime)
router.get("/", getFunkos);
router.post("/", createFunko);

// 2. Rotte dinamiche con parametro (sempre in fondo)
router.get("/:id", getFunkoById);
router.patch("/:id", updateFunko);
router.delete("/:id", deleteFunko);

export default router;
