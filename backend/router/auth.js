import express from "express";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

// Definiamo gli endpoint: quando il frontend chiamerà /register o /login,
// Express eseguirà le funzioni corrispondenti che abbiamo importato dal controller.
router.post("/register", register);
router.post("/login", login);

export default router;
