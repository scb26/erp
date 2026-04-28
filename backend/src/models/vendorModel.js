/**
 * @module models/vendorModel
 * @description Database operations for Vendor management.
 */
const { pool } = require("../db/mysql");

function mapVendor(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    gstin: row.gstin,
    state: row.state,
    pan: row.pan,
    email: row.email,
    opening_balance: Number(row.opening_balance || 0),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * @function createVendor
 * @description Inserts a new vendor record into the database.
 * @param {Object} payload - Vendor details.
 * @returns {Promise<Object>} The created vendor object.
 */
async function createVendor(payload) {
  const sql = `
    INSERT INTO vendors (
      name,
      phone,
      address,
      gstin,
      state,
      pan,
      email,
      opening_balance,
      is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    payload.name,
    payload.phone,
    payload.address || null,
    payload.gstin || null,
    payload.state,
    payload.pan || null,
    payload.email || null,
    payload.opening_balance ?? 0,
    payload.is_active ?? 1
  ];

  const [result] = await pool.execute(sql, params);
  return getVendorById(result.insertId);
}

async function getAllVendors() {
  const [rows] = await pool.execute(
    `SELECT *
     FROM vendors
     ORDER BY name ASC`
  );

  return rows.map(mapVendor);
}

async function getVendorById(id) {
  const [rows] = await pool.execute(
    `SELECT *
     FROM vendors
     WHERE id = ?`,
    [id]
  );

  return rows.length ? mapVendor(rows[0]) : null;
}

async function updateVendor(id, payload) {
  const sql = `
    UPDATE vendors
    SET
      name = ?,
      phone = ?,
      address = ?,
      gstin = ?,
      state = ?,
      pan = ?,
      email = ?,
      opening_balance = ?,
      is_active = ?
    WHERE id = ?
  `;

  const params = [
    payload.name,
    payload.phone,
    payload.address || null,
    payload.gstin || null,
    payload.state,
    payload.pan || null,
    payload.email || null,
    payload.opening_balance ?? 0,
    payload.is_active ?? 1,
    id
  ];

  const [result] = await pool.execute(sql, params);
  return result.affectedRows ? getVendorById(id) : null;
}

async function deleteVendor(id) {
  const [result] = await pool.execute(
    `DELETE FROM vendors
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor
};
