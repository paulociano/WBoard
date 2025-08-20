// index.js

// Carrega as variáveis de ambiente do arquivo .env
// Esta deve ser a primeira linha do seu arquivo para garantir que as variáveis estejam disponíveis
require('dotenv').config();

// Importação das bibliotecas e dos nossos módulos de serviço
const express = require('express');
const axios = require('axios');
const { parse, isValid, formatDistanceToNow } = require('date-fns');
const { toDate } = require('date-fns-tz');
const { findOrCreateUser, setUserName, findUserByName } = require('./userService');
const { createTask, getTasksByUser, updateTaskStatus, editTaskTitle, deleteTask, getTaskSummary } = require('./taskService');
const { createProject, listProjects, findProjectByName, getActiveProjectCount } = require('./projectService');
const { ptBR } = require('date-fns/locale');
const cors = require('cors');
const apiRoutes = require('./routes/api');

// Inicialização do Express
const app = express();
app.use(express.json());
app.use(cors());
app.use('/api', apiRoutes);

// ----- CONFIGURAÇÃO - Lendo as variáveis do arquivo .env -----
const PORT = process.env.PORT || 3000;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
// -----------------------------------------------------------

/**
 * Função genérica para enviar qualquer tipo de mensagem via API do WhatsApp.
 * @param {string} to - O número de telefone do destinatário.
 * @param {object} messageData - O objeto JSON completo da mensagem a ser enviada.
 */
async function sendMessage(to, messageData) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        ...messageData // Mescla o objeto da mensagem (pode ser text, interactive, etc.)
      },
      { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    console.log(`Mensagem enviada para ${to}`);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
  }
}

/**
 * Rota GET para verificação do Webhook da Meta.
 */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/**
 * Rota POST para receber todas as notificações do WhatsApp.
 */
app.post('/webhook', async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  // PRIMEIRO: Processa cliques em botões interativos
  if (message && message.type === 'interactive' && message.interactive.type === 'button_reply') {
      const from = message.from;
      const buttonId = message.interactive.button_reply.id;
      
      console.log(`Clique de botão recebido de ${from}: ${buttonId}`);

      const [action, taskIdStr] = buttonId.split(':');
      const taskId = parseInt(taskIdStr);

      if (action === 'start_task') {
          await updateTaskStatus(taskId, 'Em Andamento');
          await sendMessage(from, { text: { body: `🟡 Tarefa *${taskId}* iniciada!` } });
      } else if (action === 'complete_task') {
          await updateTaskStatus(taskId, 'Concluído');
          await sendMessage(from, { text: { body: `🟢 Tarefa *${taskId}* concluída!` } });
      }
      
      return res.sendStatus(200); // Encerra o processamento aqui
  }

  // SEGUNDO: Processa mensagens de texto
  if (message && message.text) {
    const from = message.from;
    const text = message.text.body.trim();

    console.log(`Mensagem recebida de ${from}: "${text}"`);

    try {
      const user = await findOrCreateUser(from);
      const command = text.toLowerCase();

      // --- INTERPRETADOR DE COMANDOS DE TEXTO ---

      if (command === '/ajuda') {
        const ajudaMsg = "Comandos disponíveis:\n\n*Geral:*\n`/nome [seu nome]`\n`/resumo`\n\n*Projetos:*\n`/novoprojeto [nome]`\n`/projetos`\n\n*Tarefas:*\n`/novatarefa [proj] - [desc] @[nome] prazo:[dd/mm/aaaa]`\n`/tarefas [proj]`\n`/iniciar [ID]`\n`/concluir [ID]`\n`/editar [ID] [novo texto]`\n`/apagar [ID]`";
        await sendMessage(from, { text: { body: ajudaMsg } });

      } else if (command === '/resumo') {
        const projectCount = await getActiveProjectCount();
        const taskSummary = await getTaskSummary();

        let resposta = `📊 *Resumo Geral do Worqboard*\n\n`;
        resposta += `🏢 *Projetos Ativos:* ${projectCount}\n\n`;
        
        if (taskSummary.length > 0) {
            resposta += `*Tarefas Pendentes:*\n`;
            taskSummary.forEach(summary => {
                let statusEmoji = '🔴';
                if (summary.status === 'Em Andamento') statusEmoji = '🟡';
                resposta += `${statusEmoji} ${summary.status}: *${summary.count}*\n`;
            });
        } else {
            resposta += `🎉 Nenhuma tarefa pendente no momento!`;
        }
        await sendMessage(from, { text: { body: resposta } });

      } else if (command.startsWith('/nome ')) {
        const nome = text.substring('/nome '.length).trim();
        if (nome) {
          const usuarioAtualizado = await setUserName(user.id, nome);
          await sendMessage(from, { text: { body: `✅ Seu nome foi definido como: *${usuarioAtualizado.nome}*` } });
        } else {
          await sendMessage(from, { text: { body: '⚠️ Formato inválido. Use: `/nome [seu nome]`' } });
        }

      } else if (command.startsWith('/novoprojeto ')) {
        const nomeProjeto = text.substring('/novoprojeto '.length).trim();
        if (nomeProjeto) {
          const novoProjeto = await createProject(nomeProjeto);
          await sendMessage(from, { text: { body: `🏢 Projeto "*${novoProjeto.nome}*" criado com sucesso com o ID: ${novoProjeto.id}` } });
        } else {
          await sendMessage(from, { text: { body: '⚠️ Formato inválido. Use: `/novoprojeto [nome do projeto]`' } });
        }

      } else if (command === '/projetos') {
        const projetos = await listProjects();
        if (projetos.length > 0) {
          let resposta = '🏢 *Projetos Ativos:*\n\n';
          projetos.forEach(projeto => {
            resposta += `*ID:* ${projeto.id} - ${projeto.nome}\n`;
          });
          await sendMessage(from, { text: { body: resposta } });
        } else {
          await sendMessage(from, { text: { body: 'ℹ️ Nenhum projeto ativo encontrado. Crie um com `/novoprojeto`!' } });
        }
      
      } else if (command.startsWith('/novatarefa ')) {
        let content = text.substring('/novatarefa '.length).trim();
        const author = user;
        let responsible = author;
        let prazoFinal = null;

        if (content.toLowerCase().includes('prazo:')) {
            const parts = content.split(/prazo:/i);
            content = parts[0].trim();
            const prazoStr = parts[1].trim();
            const parsedDate = parse(prazoStr, 'dd/MM/yyyy', new Date());
            if (isValid(parsedDate)) {
                prazoFinal = toDate(parsedDate, { timeZone: 'America/Sao_Paulo' });
            } else {
                await sendMessage(from, { text: { body: `⚠️ Formato de data inválido. Use *dd/mm/aaaa*.` } });
                return res.sendStatus(200);
            }
        }

        if (content.includes('@')) {
            const parts = content.split('@');
            content = parts[0].trim();
            const responsibleName = parts[1].trim();
            const foundUser = await findUserByName(responsibleName);
            if (foundUser) {
                responsible = foundUser;
            } else {
                await sendMessage(from, { text: { body: `❌ Usuário "*${responsibleName}*" não encontrado para atribuição.` } });
                return res.sendStatus(200);
            }
        }

        let taskTitle, projectName;
        if (content.includes(' - ')) {
            const parts = content.split(' - ');
            projectName = parts[0].trim();
            taskTitle = parts.slice(1).join(' - ').trim();
        } else {
            taskTitle = content;
            projectName = null;
        }

        if (!taskTitle) {
            await sendMessage(from, { text: { body: "⚠️ Descrição da tarefa faltando." } });
            return res.sendStatus(200);
        }

        let projectId = null;
        if (projectName) {
            const project = await findProjectByName(projectName);
            if (project) {
                projectId = project.id;
            } else {
                await sendMessage(from, { text: { body: `❌ Projeto "*${projectName}*" não encontrado.` } });
                return res.sendStatus(200);
            }
        }

        const newTask = await createTask(taskTitle, responsible.id, projectId, prazoFinal);

        let confirmationMessage = `✅ Tarefa criada e atribuída a *${responsible.nome || responsible.numero_whatsapp}*!\n\n*ID:* ${newTask.id}\n*Tarefa:* ${newTask.titulo}`;
        if (projectName) confirmationMessage += `\n*Projeto:* ${projectName}`;
        if (newTask.prazo_final) confirmationMessage += `\n*Prazo:* ${new Date(newTask.prazo_final).toLocaleDateString('pt-BR')}`;
        await sendMessage(author.numero_whatsapp, { text: { body: confirmationMessage } });

        if (author.id !== responsible.id) {
            let notificationMessage = `🔔 Você recebeu uma nova tarefa de *${author.nome || author.numero_whatsapp}*!\n\n*ID:* ${newTask.id}\n*Tarefa:* ${newTask.titulo}`;
            if (projectName) notificationMessage += `\n*Projeto:* ${projectName}`;
            if (newTask.prazo_final) notificationMessage += `\n*Prazo:* ${new Date(newTask.prazo_final).toLocaleDateString('pt-BR')}`;
            await sendMessage(responsible.numero_whatsapp, { text: { body: notificationMessage } });
        }
      
          } else if (command.startsWith('/tarefas')) { // Simplificamos o comando
            const tarefas = await getTasksByUser(user.id);

            if (tarefas.length > 0) {
                let resposta = '📋 *Suas tarefas pendentes, agrupadas por projeto:*\n\n';
                let projetoAtual = null;

                for (const tarefa of tarefas) {
                    const nomeProjeto = tarefa.nome_projeto || 'Sem Projeto';

                    // Se o projeto da tarefa atual for diferente do anterior, cria um novo cabeçalho
                    if (nomeProjeto !== projetoAtual) {
                        projetoAtual = nomeProjeto;
                        resposta += `*🏢 Projeto: ${projetoAtual}*\n`;
                    }

                    // Lógica de Emojis
                    let statusEmoji = '🔴';
                    if (tarefa.status === 'Em Andamento') statusEmoji = '🟡';

                    // Lógica de Tempo no Status
                    let tempoNoStatus = '';
                    if (tarefa.status_alterado_em) {
                      const tempoAtras = formatDistanceToNow(new Date(tarefa.status_alterado_em), { addSuffix: true, locale: ptBR });
                      tempoNoStatus = `(${tempoAtras.replace('aproximadamente ','')})`;
                    }

                    // Lógica do Prazo
                    let prazoTexto = '';
                    if (tarefa.prazo_final) {
                        const prazoFormatado = new Date(tarefa.prazo_final).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                        prazoTexto = ` | 🗓️ ${prazoFormatado}`;
                    }

                    // Lógica do Responsável
                    const nomeResponsavel = tarefa.nome_responsavel || 'Não definido';

                    // Monta a linha da tarefa
                    resposta += `${statusEmoji} *${tarefa.id}:* ${tarefa.titulo} - *@${nomeResponsavel}* ${tempoNoStatus}${prazoTexto}\n`;
                }

                // Envia a lista de texto formatada
                await sendMessage(from, { text: { body: resposta } });

                // Envia os botões interativos separadamente, após a lista
                await sendMessage(from, { text: { body: '👇 Use os botões abaixo para interagir com as tarefas:' } });
                for (const tarefa of tarefas) {
                    const interactiveMessage = {
                        type: 'interactive',
                        interactive: {
                            type: 'button',
                            body: { text: `*ID ${tarefa.id}:* ${tarefa.titulo}` },
                            action: {
                                buttons: [
                                    { type: 'reply', reply: { id: `complete_task:${tarefa.id}`, title: '🟢 Concluir' } },
                                    { type: 'reply', reply: { id: `start_task:${tarefa.id}`, title: '▶️ Iniciar' } }
                                ]
                            }
                        }
                    };
                    await sendMessage(from, interactiveMessage);
                    await new Promise(resolve => setTimeout(resolve, 250));
                }
            } else {
                await sendMessage(from, { text: { body: '🎉 Nenhuma tarefa pendente encontrada!' } });
            }

        } else if (command.startsWith('/iniciar ')) {
        const taskId = parseInt(command.substring('/iniciar '.length));
        if (!isNaN(taskId)) {
          const tarefaAtualizada = await updateTaskStatus(taskId, 'Em Andamento');
          if (tarefaAtualizada) {
            await sendMessage(from, { text: { body: `🟡 Tarefa *${tarefaAtualizada.id}* iniciada! Status: Em Andamento.` } });
          } else {
            await sendMessage(from, { text: { body: `⚠️ Tarefa com ID *${taskId}* não encontrada.` } });
          }
        } else {
          await sendMessage(from, { text: { body: '❌ Formato inválido. Use: `/iniciar [número do ID]`' } });
        }

      } else if (command.startsWith('/concluir ')) {
        const taskId = parseInt(command.substring('/concluir '.length));
        if (!isNaN(taskId)) {
          const tarefaAtualizada = await updateTaskStatus(taskId, 'Concluído');
          if (tarefaAtualizada) {
            await sendMessage(from, { text: { body: `🟢 Tarefa *${tarefaAtualizada.id}* marcada como Concluída!` } });
          } else {
            await sendMessage(from, { text: { body: `⚠️ Tarefa com ID *${taskId}* não encontrada.` } });
          }
        } else {
          await sendMessage(from, { text: { body: '❌ Formato inválido. Use: `/concluir [número do ID]`' } });
        }

      } else if (command.startsWith('/editar ')) {
        const parts = text.substring('/editar '.length).trim().split(' ');
        const taskId = parseInt(parts[0]);
        const newTitle = parts.slice(1).join(' ');
        if (!isNaN(taskId) && newTitle) {
            const tarefaEditada = await editTaskTitle(taskId, newTitle);
            if (tarefaEditada) {
                await sendMessage(from, { text: { body: `📝 Tarefa *${taskId}* editada com sucesso!` } });
            } else {
                await sendMessage(from, { text: { body: `⚠️ Tarefa com ID *${taskId}* não encontrada.` } });
            }
        } else {
            await sendMessage(from, { text: { body: '❌ Formato inválido. Use: `/editar [ID] [novo título]`' } });
        }

      } else if (command.startsWith('/apagar ')) {
        const taskId = parseInt(command.substring('/apagar '.length));
        if (!isNaN(taskId)) {
            const tarefaApagada = await deleteTask(taskId);
            if (tarefaApagada) {
                await sendMessage(from, { text: { body: `🗑️ Tarefa "*${tarefaApagada.titulo}*" foi apagada com sucesso.` } });
            } else {
                await sendMessage(from, { text: { body: `⚠️ Tarefa com ID *${taskId}* não encontrada.` } });
            }
        } else {
            await sendMessage(from, { text: { body: '❌ Formato inválido. Use: `/apagar [ID]`' } });
        }

      } else {
        await sendMessage(from, { text: { body: "Desculpe, não entendi. Digite */ajuda* para ver a lista de comandos." } });
      }
    } catch (error) {
      console.error("Erro no processamento da mensagem:", error);
      await sendMessage(from, { text: { body: "Ocorreu um erro ao processar sua solicitação. Tente novamente." } });
    }
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}. Aguardando notificações do WhatsApp...`);
});