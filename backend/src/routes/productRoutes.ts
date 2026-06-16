import { Router } from "express";
import { getAllProducts } from "../controllers/productController.js";

const router = Router();

// Questa rotta risponderà a GET /api/products
router.get("/", getAllProducts);

export default router;