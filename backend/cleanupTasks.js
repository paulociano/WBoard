// backend/cleanupTasks.js
require('dotenv').config({ path: './.env' }); // Garante que as variáveis de ambiente sejam carregadas
const db = require('./db');

async function deleteOldCompletedTasks() {
  console.log('Iniciando o trabalho de limpeza de tarefas antigas...');

  try {
    const result = await db.query(
      // Apaga tarefas cujo status é 'Concluído' E a data de alteração foi há mais de 1 dia
      `DELETE FROM tarefas WHERE status = 'Concluído' AND status_alterado_em < NOW() - INTERVAL '1 day' RETURNING id`
    );

    if (result.rowCount > 0) {
      console.log(`Sucesso! ${result.rowCount} tarefa(s) concluída(s) há mais de 24h foram apagadas.`);
    } else {
      console.log('Nenhuma tarefa antiga para apagar.');
    }

  } catch (error) {
    console.error('Ocorreu um erro durante a limpeza das tarefas:', error);
  } finally {
    // É crucial fechar a conexão com o banco para que o script possa terminar
    await db.pool.end();
    console.log('Trabalho de limpeza finalizado. Conexão com o banco encerrada.');
  }
}

// Executa a função
deleteOldCompletedTasks();