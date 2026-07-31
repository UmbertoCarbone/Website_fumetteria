import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/products/productController.js";
import { authenticate, authorize } from "../middleware/auth.js";

/* import { getProductsByCategoryFilter } from "../controllers/products/productFilters/filtersCategory.js"; */
// NUOVO IMPORT
/* import { getProductsBySubCategoryFilter } from "../controllers/products/productFilters/filtersSubCategory.js"; */

const router = Router();
const staffOnly = [authenticate, authorize("ADMIN", "SUPERADMIN")] as const;

// 1. Rotte fisse/statiche (Sempre per prime!) — lettura del catalogo, pubblica
router.get("/", getProducts);
/* router.get("/category", getProductsByCategoryFilter);
router.get("/sub-category", getProductsBySubCategoryFilter); // AGGIUNTA QUI! */

// Scrittura: solo staff autenticato
router.post("/", ...staffOnly, createProduct);

// 2. Rotte dinamiche con parametri (Sempre in fondo!)
router.get("/:id", getProductById);
router.patch("/:id", ...staffOnly, updateProduct);
router.delete("/:id", ...staffOnly, deleteProduct);

export default router;
