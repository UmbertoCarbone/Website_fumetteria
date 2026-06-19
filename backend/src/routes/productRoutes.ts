import { Router } from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
} from "../controllers/productController.js";

const router = Router();

router.get("/", getProducts);
router.post("/", createProduct);
router.patch("/:id", updateProduct);

export default router;