# 🤖 WBoard - Bot de Gestão de Projetos para WhatsApp

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-18.x-brightgreen.svg)

Um bot de WhatsApp completo para gestão de equipes e projetos, permitindo criar e gerenciar tarefas, projetos e prazos diretamente do seu celular através de uma interface conversacional e interativa.

---

## 🎯 Sobre o Projeto

O WBoard nasceu da ideia de simplificar a gestão de projetos para pequenas equipes que já utilizam o WhatsApp como principal ferramenta de comunicação. Em vez de alternar entre diferentes aplicativos, o bot centraliza as ações mais comuns de gerenciamento de tarefas (criar, atribuir, atualizar status) diretamente na conversa, agilizando o fluxo de trabalho e mantendo todos na mesma página.

Este repositório contém todo o código-fonte do backend da aplicação, construído em Node.js e conectado a um banco de dados PostgreSQL.

## ✨ Funcionalidades

- **Gestão de Projetos:** Crie e liste projetos para organizar suas tarefas.
- **Ciclo de Vida de Tarefas:** Crie, edite, apague, liste, inicie e conclua tarefas.
- **Colaboração em Equipe:** Atribua tarefas a outros usuários mencionando-os com `@[nome]`.
- **Notificações Automáticas:** Usuários são notificados instantaneamente quando uma nova tarefa lhes é atribuída.
- **Gerenciamento de Prazos:** Defina e visualize prazos para tarefas.
- **Interface Interativa:** Use botões para atualizar o status das tarefas rapidamente, sem precisar digitar novos comandos.
- **Relatórios:** Obtenha um resumo rápido do status geral dos projetos e tarefas.
- **Inteligência de Tempo:** Visualize há quanto tempo uma tarefa está em seu status atual.

## 🛠️ Tecnologias Utilizadas

* **Backend:** Node.js, Express.js
* **Banco de Dados:** PostgreSQL
* **API do WhatsApp:** Meta's Graph API
* **Bibliotecas Principais:**
    * `axios` para requisições HTTP
    * `pg` para a conexão com o PostgreSQL
    * `dotenv` para gerenciamento de variáveis de ambiente
    * `date-fns` e `date-fns-tz` para manipulação de datas e fusos horários

---

## 🚀 Começando

Para rodar este projeto localmente, siga os passos abaixo.

### Pré-requisitos

Você precisará ter o seguinte software instalado na sua máquina:
* [Node.js](https://nodejs.org/) (versão 18.x ou superior)
* [PostgreSQL](https://www.postgresql.org/download/)
* [Git](https://git-scm.com/)
* [ngrok](https://ngrok.com/download) (para o ambiente de desenvolvimento local)

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/seu-usuario/seu-repositorio.git)
    cd seu-repositorio
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure o Banco de Dados:**
    * Crie um banco de dados no PostgreSQL chamado `gestao_whatsapp`.
    * Execute os scripts SQL necessários para criar as tabelas (`usuarios`, `projetos`, `tarefas`).

4.  **Configure as Variáveis de Ambiente:**
    * Crie um arquivo chamado `.env` na raiz do projeto.
    * Copie o conteúdo do exemplo abaixo e preencha com suas credenciais.

    ```
    # Credenciais do WhatsApp (obtidas no Portal da Meta)
    WHATSAPP_TOKEN=
    PHONE_NUMBER_ID=
    VERIFY_TOKEN=um_token_secreto_criado_por_voce

    # Credenciais do Banco de Dados Local
    DB_USER=postgres
    DB_HOST=localhost
    DB_DATABASE=gestao_whatsapp
    DB_PASSWORD=sua_senha_do_postgres
    DB_PORT=5432
    ```

5.  **Configure o App na Meta e o Webhook:**
    * Siga o passo a passo para criar um aplicativo na Meta for Developers, adicionar o produto WhatsApp e configurar o webhook para apontar para sua URL do `ngrok`.

6.  **Execute a Aplicação:**
    * Inicie o túnel `ngrok` em um terminal: `ngrok http 3000`
    * Inicie o servidor em outro terminal: `npm start`

---

## 📖 Comandos do Bot

### Geral
* `/ajuda` - Mostra a lista completa de comandos.
* `/resumo` - Exibe um resumo geral de projetos ativos e tarefas pendentes.
* `/nome [seu nome]` - Define ou atualiza seu nome de exibição no sistema.

### Projetos
* `/novoprojeto [nome do projeto]` - Cria um novo projeto.
* `/projetos` - Lista todos os projetos ativos.

### Tarefas
* `/novatarefa [projeto] - [descrição] @[nome] prazo:[dd/mm/aaaa]`
    * Cria uma nova tarefa. Todos os parâmetros são opcionais, exceto a descrição.
    * Exemplo: `/novatarefa Website - Criar layout @Ana prazo:31/12/2025`
* `/tarefas` - Lista todas as suas tarefas pendentes, agrupadas por projeto.
* `/iniciar [ID]` - Muda o status de uma tarefa para "Em Andamento".
* `/concluir [ID]` - Marca uma tarefa como "Concluída".
* `/editar [ID] [novo título]` - Edita o título de uma tarefa existente.
* `/apagar [ID]` - Apaga uma tarefa permanentemente.

---

##  licença

Distribuído sob a licença MIT.