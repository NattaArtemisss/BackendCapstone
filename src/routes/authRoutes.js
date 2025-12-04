// src/routes/authRoutes.js
import express from "express";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

// FULL URL: POST http://IP:5000/api/auth/register
router.post("/register", register);

// FULL URL: POST http://IP:5000/api/auth/login
router.post("/login", login);

export default router;
