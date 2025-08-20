// userService.js
const db = require('./db');

/**
 * Procura um usuário pelo número do WhatsApp. Se não encontrar, cria um novo.
 * @param {string} numeroWhatsapp O número de telefone do usuário.
 * @returns {Promise<object>} O objeto do usuário encontrado ou criado.
 */
async function findOrCreateUser(numeroWhatsapp) {
  let userResult = await db.query('SELECT * FROM usuarios WHERE numero_whatsapp = $1', [numeroWhatsapp]);
  if (userResult.rows.length === 0) {
    userResult = await db.query('INSERT INTO usuarios (numero_whatsapp, nome) VALUES ($1, $2) RETURNING *', [numeroWhatsapp, '']);
  }
  return userResult.rows[0];
}

/**
 * Define ou atualiza o nome de um usuário.
 * @param {number} userId O ID do usuário.
 * @param {string} nome O novo nome para o usuário.
 * @returns {Promise<object>} O objeto do usuário atualizado.
 */
async function setUserName(userId, nome) {
  const result = await db.query('UPDATE usuarios SET nome = $1 WHERE id = $2 RETURNING *', [nome, userId]);
  return result.rows[0];
}

/**
 * Encontra um usuário pelo nome (case-insensitive).
 * @param {string} nome O nome do usuário a ser procurado.
 * @returns {Promise<object|null>} O objeto do usuário ou null se não for encontrado.
 */
async function findUserByName(nome) {
  const result = await db.query('SELECT * FROM usuarios WHERE nome ILIKE $1', [nome]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Lista todos os usuários que já definiram um nome.
 * @returns {Promise<Array>} Uma lista de usuários.
 */
async function listAllUsers() {
  const result = await db.query("SELECT * FROM usuarios WHERE nome IS NOT NULL AND nome != '' ORDER BY nome ASC");
  return result.rows;
}

// CORREÇÃO APLICADA AQUI: Adicionamos listAllUsers à exportação
module.exports = { 
  findOrCreateUser, 
  setUserName, 
  findUserByName, 
  listAllUsers 
};