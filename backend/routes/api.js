// routes/api.js
const express = require('express');
const db = require('../db');
const router = express.Router();
const { updateTaskStatus } = require('../taskService'); 

// Rota para buscar todas as tarefas (exceto as concluídas)
router.get('/tasks', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, p.nome as nome_projeto, u.nome as nome_responsavel
       FROM tarefas t
       LEFT JOIN projetos p ON t.projeto_id = p.id
       LEFT JOIN usuarios u ON t.responsavel_id = u.id
       WHERE t.status != 'Concluído'
       ORDER BY t.id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar tarefas via API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/tasks/:id/status', async (req, res) => {
  const { id } = req.params; // Pega o ID da URL
  const { status } = req.body; // Pega o novo status do corpo da requisição

  try {
    // Reutilizamos a função que já tínhamos criado!
    const updatedTask = await updateTaskStatus(id, status);
    if (updatedTask) {
      res.json(updatedTask); // Responde com a tarefa atualizada
    } else {
      res.status(404).json({ error: 'Tarefa não encontrada' });
    }
  } catch (error) {
    console.error(`Erro ao atualizar status da tarefa ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;