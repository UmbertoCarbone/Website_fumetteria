import express from "express";
import { getAllUsers } from "../controllers/userController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Elenca email/username/ruolo di tutti gli utenti: solo per lo staff.
router.get("/", authenticate, authorize("ADMIN", "SUPERADMIN"), getAllUsers);

export default router;
