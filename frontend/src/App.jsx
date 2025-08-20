import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { DndContext, closestCenter, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './App.css';

// --- Componentes Reutilizáveis ---

function TaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const timeInStatus = task.status_alterado_em ? formatDistanceToNow(new Date(task.status_alterado_em), { addSuffix: true, locale: ptBR }) : '';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="task-card">
      <p className="task-title">{task.titulo}</p>
      <div className="task-details">
        {/* Ícone adicionado ao projeto */}
        <span className="task-project">🏢 {task.nome_projeto || 'Sem projeto'}</span>
        {/* Ícone adicionado ao responsável */}
        <span className="task-assignee">👤 @{task.nome_responsavel || 'Ninguém'}</span>
      </div>
      <p className="task-status-time">⏱️ {timeInStatus}</p>
    </div>
  );
}

function Column({ id, title, tasks, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} id={id} className="column">
      <div className="column-header">
        <h2>{title} ({tasks.length})</h2>
        {children}
      </div>
      <div className="task-list">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.id} task={task} />)}
        </SortableContext>
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{title}</h2>
                {children}
            </div>
        </div>
    );
}

// --- Componente Principal da Aplicação ---

function App() {
  const [allTasks, setAllTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('all');

  useEffect(() => {
    document.title = 'Worqboard Kanban';
  }, []);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        axios.get('http://localhost:3000/api/tasks'),
        axios.get('http://localhost:3000/api/projects'),
        axios.get('http://localhost:3000/api/users'),
      ]);
      setAllTasks(tasksRes.data);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError('Não foi possível carregar os dados.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const projectMatch = selectedProjectId === 'all' || task.projeto_id === parseInt(selectedProjectId);
      const userMatch = selectedUserId === 'all' || task.responsavel_id === parseInt(selectedUserId);
      return projectMatch && userMatch;
    });
  }, [allTasks, selectedProjectId, selectedUserId]);

  const handleCreateTask = async (taskData) => {
    try {
        await axios.post('http://localhost:3000/api/tasks', taskData);
        setTaskModalOpen(false);
        fetchAllData();
    } catch (error) {
        console.error("Erro ao criar tarefa:", error);
        alert("Falha ao criar a tarefa.");
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
        await axios.post('http://localhost:3000/api/projects', projectData);
        setProjectModalOpen(false);
        fetchAllData();
    } catch (error) {
        console.error("Erro ao criar projeto:", error);
        alert("Falha ao criar o projeto.");
    }
  };

  const handleClearCompleted = async () => {
    if (!window.confirm('Você tem certeza que deseja apagar permanentemente todas as tarefas concluídas?')) {
      return;
    }
    try {
      await axios.delete('http://localhost:3000/api/tasks/completed');
      setAllTasks(currentTasks => currentTasks.filter(task => task.status !== 'Concluído'));
      alert('Tarefas concluídas foram apagadas!');
    } catch (error) {
      console.error('Erro ao limpar tarefas:', error);
      alert('Não foi possível apagar as tarefas.');
    }
  };

  function handleDragEnd({ active, over }) {
    if (!over) return;
    const activeTask = allTasks.find(t => t.id === active.id);
    let newStatus = activeTask.status;
    if (over.id === 'column-pending') newStatus = 'A Fazer';
    if (over.id === 'column-inprogress') newStatus = 'Em Andamento';
    if (over.id === 'column-completed') newStatus = 'Concluído';

    if (activeTask && activeTask.status !== newStatus) {
        setAllTasks((currentTasks) => currentTasks.map(t => 
            t.id === active.id ? { ...t, status: newStatus } : t
        ));
        axios.patch(`http://localhost:3000/api/tasks/${active.id}/status`, { status: newStatus })
            .catch(error => {
                console.error('Erro ao atualizar o status:', error);
                alert('Ocorreu um erro ao salvar a alteração.');
                fetchAllData();
            });
    }
  }

  if (loading) return <div>Carregando...</div>;
  if (error) return <div className="error">{error}</div>;

  const pendingTasks = filteredTasks.filter(task => task.status === 'A Fazer');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'Em Andamento');
  const completedTasks = filteredTasks.filter(task => task.status === 'Concluído');

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="toolbar">
          {/* Ícones adicionados aos filtros e botões */}
          <span>🏢</span>
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
            <option value="all">Todos os Projetos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <span>👤</span>
          <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
            <option value="all">Todos os Usuários</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.nome || u.numero_whatsapp}</option>)}
          </select>
          <button onClick={() => setTaskModalOpen(true)}>➕ Nova Tarefa</button>
          <button onClick={() => setProjectModalOpen(true)}>➕ Novo Projeto</button>
        </div>
      </header>
      
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="board-container">
          <Column id="column-pending" title="🔴 Pendente" tasks={pendingTasks} />
          <Column id="column-inprogress" title="🟡 Em Andamento" tasks={inProgressTasks} />
          <Column id="column-completed" title="🟢 Concluídas" tasks={completedTasks}>
            {completedTasks.length > 0 && (
              <button onClick={handleClearCompleted} className="clear-button">
                Limpar
              </button>
            )}
          </Column>
        </div>
      </DndContext>

      <Modal isOpen={isTaskModalOpen} onClose={() => setTaskModalOpen(false)} title="Criar Nova Tarefa">
        <NewTaskForm users={users} projects={projects} onSubmit={handleCreateTask} onCancel={() => setTaskModalOpen(false)} />
      </Modal>

      <Modal isOpen={isProjectModalOpen} onClose={() => setProjectModalOpen(false)} title="Criar Novo Projeto">
        <NewProjectForm onSubmit={handleCreateProject} onCancel={() => setProjectModalOpen(false)} />
      </Modal>
    </div>
  );
}

// --- Componentes de Formulário para os Modais ---

function NewTaskForm({ users, projects, onSubmit, onCancel }) {
    const [titulo, setTitulo] = useState('');
    const [responsavelId, setResponsavelId] = useState('');
    const [projetoId, setProjetoId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!titulo || !responsavelId) {
            alert('Título e Responsável são obrigatórios.');
            return;
        }
        onSubmit({ titulo, responsavelId: parseInt(responsavelId), projetoId: projetoId ? parseInt(projetoId) : null });
    };

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <label>
                Título da Tarefa:
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required />
            </label>
            <label>
                Responsável:
                <select value={responsavelId} onChange={e => setResponsavelId(e.target.value)} required>
                    <option value="" disabled>Selecione um usuário</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
            </label>
            <label>
                Projeto:
                <select value={projetoId} onChange={e => setProjetoId(e.target.value)}>
                    <option value="">Nenhum</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
            </label>
            <div className="modal-actions">
                <button type="button" onClick={onCancel} className="cancel">Cancelar</button>
                <button type="submit" className="submit">Criar Tarefa</button>
            </div>
        </form>
    );
}

function NewProjectForm({ onSubmit, onCancel }) {
    const [nome, setNome] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!nome) {
            alert('O nome do projeto é obrigatório.');
            return;
        }
        onSubmit({ nome });
    };

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <label>
                Nome do Projeto:
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} required />
            </label>
            <div className="modal-actions">
                <button type="button" onClick={onCancel} className="cancel">Cancelar</button>
                <button type="submit" className="submit">Criar Projeto</button>
            </div>
        </form>
    );
}

export default App;
