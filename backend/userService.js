// userService.js
const db = require('./db');

async function findOrCreateUser(numeroWhatsapp) {
  let userResult = await db.query('SELECT * FROM usuarios WHERE numero_whatsapp = $1', [numeroWhatsapp]);
  if (userResult.rows.length === 0) {
    userResult = await db.query('INSERT INTO usuarios (numero_whatsapp, nome) VALUES ($1, $2) RETURNING *', [numeroWhatsapp, '']);
  }
  return userResult.rows[0];
}

async function setUserName(userId, nome) {
  const result = await db.query('UPDATE usuarios SET nome = $1 WHERE id = $2 RETURNING *', [nome, userId]);
  return result.rows[0];
}

async function findUserByName(nome) {
  const result = await db.query('SELECT * FROM usuarios WHERE nome ILIKE $1', [nome]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

module.exports = { findOrCreateUser, setUserName, findUserByName };