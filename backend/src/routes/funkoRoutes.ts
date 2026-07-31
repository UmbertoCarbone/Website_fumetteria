import { Router } from "express";
import {
  getFunkos,
  getFunkoById,
  createFunko,
  updateFunko,
  deleteFunko,
} from "../controllers/funkoController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
const staffOnly = [authenticate, authorize("ADMIN", "SUPERADMIN")] as const;

// 1. Rotte fisse (sempre per prime) — lettura pubblica, scrittura riservata allo staff
router.get("/", getFunkos);
router.post("/", ...staffOnly, createFunko);

// 2. Rotte dinamiche con parametro (sempre in fondo)
router.get("/:id", getFunkoById);
router.patch("/:id", ...staffOnly, updateFunko);
router.delete("/:id", ...staffOnly, deleteFunko);

export default router;
