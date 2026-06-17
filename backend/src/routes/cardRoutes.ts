import { Router } from "express";
import { syncTcgProducts } from "../controllers/cardController.js";

const router = Router();


router.post("/sync", syncTcgProducts);

export default router;