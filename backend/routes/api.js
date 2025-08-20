const express = require('express');
const db = require('../db');
const { updateTaskStatus, deleteCompletedTasks, createTask } = require('../taskService');
const { listProjects, createProject } = require('../projectService');
const { listAllUsers } = require('../userService');
const router = express.Router();

// Rota para buscar todas as tarefas
router.get('/tasks', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
          t.*,
          p.nome as nome_projeto,
          u.nome as nome_responsavel
       FROM tarefas t
       LEFT JOIN projetos p ON t.projeto_id = p.id
       LEFT JOIN usuarios u ON t.responsavel_id = u.id
       ORDER BY t.id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar tarefas via API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para buscar todos os projetos ativos
router.get('/projects', async (req, res) => {
    try {
        const projects = await listProjects();
        res.json(projects);
    } catch (error) {
        console.error('Erro ao buscar projetos via API:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para buscar todos os usuários com nome definido
router.get('/users', async (req, res) => {
    try {
        const users = await listAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários via API:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- NOVAS ROTAS POST PARA CRIAÇÃO ---

// Rota para criar uma nova tarefa
router.post('/tasks', async (req, res) => {
    const { titulo, responsavelId, projetoId } = req.body;
    try {
        // Reutilizamos a função do taskService que o bot do WhatsApp já usa!
        const newTask = await createTask(titulo, responsavelId, projetoId, null);
        res.status(201).json(newTask); // 201 Created
    } catch (error) {
        console.error('Erro ao criar tarefa via API:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para criar um novo projeto
router.post('/projects', async (req, res) => {
    const { nome } = req.body;
    try {
        const newProject = await createProject(nome);
        res.status(201).json(newProject);
    } catch (error) {
        console.error('Erro ao criar projeto via API:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ------------------------------------

// Rota para atualizar o status de uma tarefa
router.patch('/tasks/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updatedTask = await updateTaskStatus(id, status);
    if (updatedTask) {
      res.json(updatedTask);
    } else {
      res.status(404).json({ error: 'Tarefa não encontrada' });
    }
  } catch (error) {
    console.error(`Erro ao atualizar status da tarefa ${id}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para limpar tarefas concluídas
router.delete('/tasks/completed', async (req, res) => {
  try {
    const deletedCount = await deleteCompletedTasks();
    res.status(200).json({ message: `${deletedCount} tarefas apagadas com sucesso.` });
  } catch (error) {
    console.error('Erro ao limpar tarefas concluídas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
