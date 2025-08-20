import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './App.css';

// Componente para o Card da Tarefa (agora com lógica de drag)
function TaskCard({ task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="task-card">
      <p className="task-title">{task.titulo}</p>
      <p className="task-project">{task.nome_projeto || 'Sem projeto'}</p>
      <p className="task-assignee">@{task.nome_responsavel || 'Ninguém'}</p>
    </div>
  );
}

// Componente para a Coluna
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

  // Função que será chamada quando um drag é completado
  function handleDragEnd(event) {
    const { active, over } = event;

    // Se o card não foi movido para uma coluna válida, não faz nada
    if (!over) return;

    // Pega a tarefa que foi movida
    const activeTask = tasks.find(t => t.id === active.id);

    // Pega o status da coluna de destino
    const newStatus = over.id === 'column-pending' ? 'A Fazer' : 'Em Andamento';

    // Só faz a atualização se o status realmente mudou
    if (activeTask && activeTask.status !== newStatus) {

        // 1. Atualização Otimista da UI:
        // Movemos o card visualmente na tela ANTES da resposta da API.
        // Isso faz a interface parecer instantânea para o usuário.
        setTasks((currentTasks) => {
            const updatedTasks = currentTasks.map(t => {
                if (t.id === active.id) {
                    return { ...t, status: newStatus };
                }
                return t;
            });
            return updatedTasks;
        });

        // 2. Chamada à API para salvar a mudança no banco de dados:
        axios.patch(`http://localhost:3000/api/tasks/${active.id}/status`, {
            status: newStatus
        }).then(response => {
            console.log('Status atualizado com sucesso no backend!', response.data);
        }).catch(error => {
            console.error('Erro ao atualizar o status:', error);
            // Opcional: aqui você poderia reverter o estado visual se a API falhar
            alert('Ocorreu um erro ao salvar a alteração. Por favor, recarregue a página.');
        });
    }
  }

  if (loading) return <div>Carregando...</div>;
  if (error) return <div className="error">{error}</div>;

  const pendingTasks = tasks.filter(task => task.status === 'A Fazer');
  const inProgressTasks = tasks.filter(task => task.status === 'Em Andamento');

  return (
    <div className="app-container">
      <h1>Gestão de Projetos - WBoard</h1>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="board-container">
          <Column id="column-pending" title="🔴 Pendente" tasks={pendingTasks} />
          <Column id="column-inprogress" title="🟡 Em Andamento" tasks={inProgressTasks} />
        </div>
      </DndContext>
    </div>
  );
}

export default App;