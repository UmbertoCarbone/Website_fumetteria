import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/products/productController.js";

/* import { getProductsByCategoryFilter } from "../controllers/products/productFilters/filtersCategory.js"; */
// NUOVO IMPORT
/* import { getProductsBySubCategoryFilter } from "../controllers/products/productFilters/filtersSubCategory.js"; */

const router = Router();

// 1. Rotte fisse/statiche (Sempre per prime!)
router.get("/", getProducts);
/* router.get("/category", getProductsByCategoryFilter);
router.get("/sub-category", getProductsBySubCategoryFilter); // AGGIUNTA QUI!
router.post("/", createProduct); */

// 2. Rotte dinamiche con parametri (Sempre in fondo!)
/* router.get("/:id", getProductById);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);
 */
export default router;
