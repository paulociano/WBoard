const db = require('./db');

async function createTask(titulo, responsavelId, projetoId = null, prazoFinal = null) {
  const result = await db.query(
    'INSERT INTO tarefas (titulo, responsavel_id, status, projeto_id, prazo_final) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [titulo, responsavelId, 'A Fazer', projetoId, prazoFinal]
  );
  return result.rows[0];
}

/**
 * Busca todas as tarefas pendentes de um usuário, juntando dados do projeto e do responsável.
 * As tarefas são ordenadas por projeto para facilitar o agrupamento.
 * @param {number} userId O ID do usuário que está pedindo a lista.
 * @returns {Promise<Array>} Uma lista de tarefas com detalhes do projeto e do responsável.
 */
async function getTasksByUser(userId) {
  const result = await db.query(
    `SELECT
        t.id,
        t.titulo,
        t.status,
        t.prazo_final,
        t.status_alterado_em,
        p.nome as nome_projeto,
        -- CORREÇÃO: Usa COALESCE para mostrar o número do WhatsApp se o nome for nulo ou vazio
        COALESCE(NULLIF(u.nome, ''), u.numero_whatsapp) as nome_responsavel
     FROM tarefas t
     LEFT JOIN projetos p ON t.projeto_id = p.id
     LEFT JOIN usuarios u ON t.responsavel_id = u.id
     WHERE t.responsavel_id = $1 AND t.status != 'Concluído'
     ORDER BY p.nome ASC, t.id ASC`,
    [userId]
  );
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

module.exports = { 
  createTask, 
  getTasksByUser, 
  updateTaskStatus, 
  editTaskTitle, 
  deleteTask, 
  getTaskSummary,
  deleteCompletedTasks
};
