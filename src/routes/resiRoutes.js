// src/routes/resiRoutes.js
import express from "express";
import {
  getResiList,
  addResi,
  editResi,
  removeResi,
  exportResiCsv,
  importResiCsv,
  uploadMiddleware,
} from "../controllers/resiController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Semua endpoint resi harus melewati verifyToken dulu
router.use(verifyToken);

// CRUD
router.get("/", getResiList);        // list resi
router.post("/", addResi);           // tambah resi
router.put("/:id", editResi);        // edit resi
router.delete("/:id", removeResi);   // hapus resi

// export & import
router.get("/export", exportResiCsv);
router.post("/import", uploadMiddleware, importResiCsv);

export default router;
