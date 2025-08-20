// routes/api.js
const express = require('express');
const db = require('../db'); // Usamos '../' para voltar um diretório
const router = express.Router();

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

module.exports = router;