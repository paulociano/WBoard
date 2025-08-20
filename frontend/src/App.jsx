// src/App.jsx (Versão Final com Coluna "Concluídas")
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './App.css';

// Componente TaskCard (sem alterações)
function TaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="task-card">
      <p className="task-title">{task.titulo}</p>
      <p className="task-project">{task.nome_projeto || 'Sem projeto'}</p>
      <p className="task-assignee">@{task.nome_responsavel || 'Ninguém'}</p>
    </div>
  );
}

// Componente Column (sem alterações)
function Column({ id, title, tasks }) {
  return (
    <div className="column">
      <h2>{title} ({tasks.length})</h2>
      <div className="task-list">
        <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.id} task={task} />)}
        </SortableContext>
      </div>
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/tasks');
        setTasks(response.data);
      } catch (err) {
        setError('Não foi possível carregar as tarefas. O servidor backend está rodando?');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);

    // Mapeia o ID da coluna para o status correspondente
    let newStatus = activeTask.status; // Mantém o status atual por padrão
    if (over.id === 'column-pending') newStatus = 'A Fazer';
    if (over.id === 'column-inprogress') newStatus = 'Em Andamento';
    if (over.id === 'column-completed') newStatus = 'Concluído';

    if (activeTask && activeTask.status !== newStatus) {
        setTasks((currentTasks) => currentTasks.map(t => 
            t.id === active.id ? { ...t, status: newStatus } : t
        ));

        axios.patch(`http://localhost:3000/api/tasks/${active.id}/status`, { status: newStatus })
            .then(response => console.log('Status atualizado com sucesso!', response.data))
            .catch(error => {
                console.error('Erro ao atualizar o status:', error);
                alert('Ocorreu um erro ao salvar a alteração.');
                // Aqui poderíamos reverter o estado visual para a posição original
            });
    }
  }

  if (loading) return <div>Carregando...</div>;
  if (error) return <div className="error">{error}</div>;

  // Filtra as tarefas para cada uma das três colunas
  const pendingTasks = tasks.filter(task => task.status === 'A Fazer');
  const inProgressTasks = tasks.filter(task => task.status === 'Em Andamento');
  const completedTasks = tasks.filter(task => task.status === 'Concluído');

  return (
    <div className="app-container">
      <h1>Meu Kanban Worqboard</h1>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="board-container">
          <Column id="column-pending" title="🔴 Pendente" tasks={pendingTasks} />
          <Column id="column-inprogress" title="🟡 Em Andamento" tasks={inProgressTasks} />
          <Column id="column-completed" title="🟢 Concluídas (Últimas 24h)" tasks={completedTasks} />
        </div>
      </DndContext>
    </div>
  );
}

export default App;