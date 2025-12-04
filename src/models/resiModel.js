import pool from "../config/db.js";

/**
 * Ambil data resi dengan filter tanggal, jasa kirim, dan user_id
 */
export const getResiFiltered = async ({ start, end, jasa, userId }) => {
  let query = "SELECT * FROM resi WHERE user_id = $1";
  const params = [userId]; // selalu filter berdasarkan user yang login

  if (start) {
    params.push(start);
    query += ` AND tanggal >= $${params.length}`;
  }

  if (end) {
    params.push(end);
    query += ` AND tanggal <= $${params.length}`;
  }

  if (jasa) {
    params.push(jasa);
    query += ` AND jasa_kirim = $${params.length}`;
  }

  query += " ORDER BY tanggal DESC, id DESC";

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Tambah resi baru (user_id wajib dari user login)
 */
export const createResi = async ({
  nomor_resi,
  nama_barang,
  nama_toko,
  jasa_kirim,
  tanggal,
  user_id,
}) => {
  const result = await pool.query(
    `
    INSERT INTO resi (nomor_resi, nama_barang, nama_toko, jasa_kirim, tanggal, user_id)
    VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6)
    RETURNING *
  `,
    [nomor_resi, nama_barang, nama_toko, jasa_kirim, tanggal || null, user_id]
  );
  return result.rows[0];
};

/**
 * Update resi — hanya milik user ini
 */
export const updateResi = async (id, data, userId) => {
  const { nama_barang, nama_toko, jasa_kirim, tanggal } = data;

  const result = await pool.query(
    `
    UPDATE resi
    SET nama_barang = $1,
        nama_toko = $2,
        jasa_kirim = $3,
        tanggal = $4
    WHERE id = $5 AND user_id = $6     -- pastikan hanya pemiliknya
    RETURNING *
  `,
    [nama_barang, nama_toko, jasa_kirim, tanggal, id, userId]
  );

  return result.rows[0];
};

/**
 * Hapus resi — hanya milik user ini
 */
export const deleteResi = async (id, userId) => {
  await pool.query(
    `DELETE FROM resi WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
};
