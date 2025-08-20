// taskService.js
const db = require('./db');

async function createTask(titulo, responsavelId, projetoId = null, prazoFinal = null) {
  const result = await db.query(
    'INSERT INTO tarefas (titulo, responsavel_id, status, projeto_id, prazo_final) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [titulo, responsavelId, 'A Fazer', projetoId, prazoFinal]
  );
  return result.rows[0];
}

async function getTasksByUser(responsavelId, projetoId = null) {
  let query = "SELECT * FROM tarefas WHERE responsavel_id = $1 AND status != 'Concluído'";
  const params = [responsavelId];
  if (projetoId) {
    query += ' AND projeto_id = $2';
    params.push(projetoId);
  }
  query += ' ORDER BY id ASC';
  const result = await db.query(query, params);
  return result.rows;
}

async function updateTaskStatus(taskId, newStatus) {
  const result = await db.query('UPDATE tarefas SET status = $1, status_alterado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [newStatus, taskId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function editTaskTitle(taskId, newTitle) {
  const result = await db.query('UPDATE tarefas SET titulo = $1 WHERE id = $2 RETURNING *', [newTitle, taskId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function deleteTask(taskId) {
  const result = await db.query('DELETE FROM tarefas WHERE id = $1 RETURNING *', [taskId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function getTaskSummary() {
  const result = await db.query("SELECT status, COUNT(*) as count FROM tarefas WHERE status != 'Concluído' GROUP BY status");
  return result.rows;
}

async function deleteCompletedTasks() {
    const result = await db.query("DELETE FROM tarefas WHERE status = 'Concluído'");
    return result.rowCount;
}

// CORREÇÃO APLICADA AQUI: Garantimos que todas as funções estão sendo exportadas
module.exports = { 
  createTask, 
  getTasksByUser, 
  updateTaskStatus, 
  editTaskTitle, 
  deleteTask, 
  getTaskSummary,
  deleteCompletedTasks
};
