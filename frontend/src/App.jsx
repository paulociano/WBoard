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

  // Calcula o tempo no status atual
  const timeInStatus = task.status_alterado_em
    ? formatDistanceToNow(new Date(task.status_alterado_em), { addSuffix: true, locale: ptBR })
    : '';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="task-card">
      <p className="task-title">{task.titulo}</p>
      <div className="task-details">
        <span className="task-project">{task.nome_projeto || 'Sem projeto'}</span>
        <span className="task-assignee">@{task.nome_responsavel || 'Ninguém'}</span>
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

// --- Componente Principal da Aplicação ---

function App() {
  // Estados de dados
  const [allTasks, setAllTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const [isTaskModalOpen, setTaskModalOpen] = useState(false); // Comentado para remover o aviso

  // Estados de filtro
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('all');

  // Busca todos os dados da API quando o componente é montado
  useEffect(() => {
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
        setError('Não foi possível carregar os dados. O servidor backend está rodando e as novas rotas da API foram implementadas?');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Lógica de filtragem
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const projectMatch = selectedProjectId === 'all' || task.projeto_id === parseInt(selectedProjectId);
      const userMatch = selectedUserId === 'all' || task.responsavel_id === parseInt(selectedUserId);
      return projectMatch && userMatch;
    });
  }, [allTasks, selectedProjectId, selectedUserId]);

  // Função que é chamada quando o usuário solta uma tarefa
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
            .then(response => console.log('Status atualizado com sucesso!', response.data))
            .catch(error => {
                console.error('Erro ao atualizar o status:', error);
                alert('Ocorreu um erro ao salvar a alteração.');
            });
    }
  }

  // Funções para o modal de nova tarefa (placeholder)
  const handleOpenTaskModal = () => alert('Funcionalidade de "Nova Tarefa" a ser implementada!');
  const handleOpenProjectModal = () => alert('Funcionalidade de "Novo Projeto" a ser implementada!');


  if (loading) return <div>Carregando...</div>;
  if (error) return <div className="error">{error}</div>;

  // Filtra as tarefas para cada coluna com base nos filtros aplicados
  const pendingTasks = filteredTasks.filter(task => task.status === 'A Fazer');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'Em Andamento');
  const completedTasks = filteredTasks.filter(task => task.status === 'Concluído');

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Meu Kanban Worqboard</h1>
        <div className="toolbar">
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
            <option value="all">Todos os Projetos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
            <option value="all">Todos os Usuários</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.nome || u.numero_whatsapp}</option>)}
          </select>
          <button onClick={handleOpenTaskModal}>+ Nova Tarefa</button>
          <button onClick={handleOpenProjectModal}>+ Novo Projeto</button>
        </div>
      </header>
      
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="board-container">
          <Column id="column-pending" title="🔴 Pendente" tasks={pendingTasks} />
          <Column id="column-inprogress" title="🟡 Em Andamento" tasks={inProgressTasks} />
          <Column id="column-completed" title="🟢 Concluídas" tasks={completedTasks} />
        </div>
      </DndContext>
    </div>
  );
}

export default App;
