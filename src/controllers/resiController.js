// src/controllers/resiController.js
import {
  getResiFiltered,
  createResi,
  updateResi,
  deleteResi,
} from "../models/resiModel.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper ambil userId dari request (di-set oleh authMiddleware)
 */
function getUserIdFromReq(req) {
  // sesuaikan dengan authMiddleware kamu
  const userId = req.user?.id || req.userId || req.user?.userId;
  return userId;
}

/**
 * GET daftar resi (dengan filter optional)
 * HANYA menampilkan resi milik user yang sedang login
 */
export const getResiList = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorised: user tidak ditemukan" });
    }

    const { start, end, jasa } = req.query;
    const rows = await getResiFiltered({ start, end, jasa, userId });
    return res.json(rows);
  } catch (err) {
    console.error("getResiList error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST tambah resi baru
 * Resi akan otomatis di-link ke user yang login (bukan dari body)
 */
export const addResi = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorised: user tidak ditemukan" });
    }

    const { nomor_resi, nama_barang, nama_toko, jasa_kirim, tanggal } = req.body;

    if (!nomor_resi) {
      return res.status(400).json({ message: "nomor_resi wajib diisi" });
    }

    try {
      const newResi = await createResi({
        nomor_resi,
        nama_barang: nama_barang || null,
        nama_toko: nama_toko || null,
        jasa_kirim: jasa_kirim || null,
        tanggal: tanggal || null,
        user_id: userId, // ⬅️ pakai userId dari token
      });

      return res.status(201).json({
        message: "Resi berhasil disimpan",
        data: newResi,
      });
    } catch (dbErr) {
      if (dbErr.code === "23505") {
        // misalnya unique index di nomor_resi
        return res
          .status(409)
          .json({ message: "Nomor resi sudah pernah disimpan" });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error("addResi error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT update resi
 * HANYA boleh update resi miliknya sendiri (cek user_id di query)
 */
export const editResi = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorised: user tidak ditemukan" });
    }

    const { id } = req.params;
    const { nama_barang, nama_toko, jasa_kirim, tanggal } = req.body;

    const updated = await updateResi(
      id,
      {
        nama_barang,
        nama_toko,
        jasa_kirim,
        tanggal,
      },
      userId // ⬅️ kirim ke model untuk dicek
    );

    if (!updated) {
      return res.status(404).json({
        message: "Resi tidak ditemukan atau bukan milik akun ini",
      });
    }

    return res.json({ message: "Resi berhasil diupdate", data: updated });
  } catch (err) {
    console.error("editResi error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE resi
 * HANYA boleh hapus resi miliknya sendiri
 */
export const removeResi = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorised: user tidak ditemukan" });
    }

    const { id } = req.params;
    await deleteResi(id, userId); // ⬅️ di model dicek user_id juga
    return res.json({ message: "Resi berhasil dihapus" });
  } catch (err) {
    console.error("removeResi error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET Export CSV
 * Hanya export resi milik user yang login
 */
export const exportResiCsv = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorised: user tidak ditemukan" });
    }

    const { start, end, jasa } = req.query;
    const rows = await getResiFiltered({ start, end, jasa, userId });

    let csv = "nomor_resi,nama_barang,nama_toko,jasa_kirim,tanggal\n";
    rows.forEach((row) => {
      csv += `${row.nomor_resi || ""},${row.nama_barang || ""},${
        row.nama_toko || ""
      },${row.jasa_kirim || ""},${row.tanggal || ""}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="resi_export.csv"'
    );
    return res.send(csv);
  } catch (err) {
    console.error("exportResiCsv error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Middleware upload CSV
export const uploadMiddleware = upload.single("file");

/**
 * Import CSV
 * Semua resi yang di-import otomatis milik user yang login
 */
export const importResiCsv = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorised: user tidak ditemukan" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "File CSV tidak ditemukan" });
    }

    const content = req.file.buffer.toString("utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

    const dataLines = lines.slice(1);

    let inserted = 0;
    let skipped = 0;

    for (const line of dataLines) {
      const [nomor_resi, nama_barang, nama_toko, jasa_kirim, tanggal] =
        line.split(",");

      if (!nomor_resi) continue;

      try {
        await createResi({
          nomor_resi: nomor_resi.trim(),
          nama_barang: nama_barang?.trim() || null,
          nama_toko: nama_toko?.trim() || null,
          jasa_kirim: jasa_kirim?.trim() || null,
          tanggal: tanggal?.trim() || null,
          user_id: userId, // ⬅️ selalu milik user yang import
        });
        inserted++;
      } catch (err2) {
        if (err2.code === "23505") {
          skipped++;
        }
      }
    }

    return res.json({
      message: "Import selesai",
      inserted,
      skipped,
    });
  } catch (err) {
    console.error("importResiCsv error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
