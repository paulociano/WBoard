// projectService.js
const db = require('./db');

async function createProject(nome) {
  const existingProject = await db.query('SELECT * FROM projetos WHERE nome = $1', [nome]);
  if (existingProject.rows.length > 0) return existingProject.rows[0];
  const result = await db.query('INSERT INTO projetos (nome) VALUES ($1) RETURNING *', [nome]);
  return result.rows[0];
}

async function listProjects() {
  const result = await db.query("SELECT * FROM projetos WHERE ativo = true ORDER BY id ASC");
  return result.rows;
}

async function findProjectByName(name) {
  const result = await db.query('SELECT * FROM projetos WHERE nome ILIKE $1', [name]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function getActiveProjectCount() {
  const result = await db.query("SELECT COUNT(*) FROM projetos WHERE ativo = true");
  return parseInt(result.rows[0].count, 10);
}

module.exports = { createProject, listProjects, findProjectByName, getActiveProjectCount };