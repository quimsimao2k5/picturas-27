# 📝 Exercício 1 — Carregar e Reproduzir Vídeo
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | {nº do grupo} |
| **Autores** | Francisco Dias (PG63958); Rodrigo Rocha (PG65437); Rodrigo Fernandes (PG64026); Luís Miguel (PG65424); Joaquim Cunha (PG63986) |
| **Data** | 2026-10-05 |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Carregar e Reproduzir Vídeo na Biblioteca do Utilizador |
| **Perfil(s) de utilizador abrangido(s)** | **Utilizador Anônimo e Registado**. O upload e a reprodução de vídeos serve para todos os utilizadores, desde o Anônimo até ao Premium |

**Justificação no contexto do MVP** *(2–3 linhas)*

O carregamento e a reprodução de vídeos são funcionalidades essenciais para o PictuRAS, permitindo que os utilizadores submetam e visualizem conteúdos multimédia diretamente na plataforma. Esta funcionalidade é fundamental para a experiência do utilizador, garantindo que todos os perfis, desde anônimos a registados, possam interagir com os vídeos disponíveis, aumentando a satisfação do utilizador.

---

## 2. Caso de Uso

> Siga o formato dos exemplos de Login e de Vídeo. O exemplo de vídeo é **deliberadamente simples**: o caso de uso da sua equipa deve ser bastante mais complexo (ver a secção final desse exemplo, *Porque é que este exemplo é o mínimo*).

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-002 |
| **Nome** | Carregar e Reproduzir Vídeo |
| **Versão** | v1.0 |
| **Autor** | Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Quim |
| **Data** | 2026-10-07 |
| **Objetivo** | Permitir que o utilizador submeta um ficheiro de vídeo para o projeto e o visualize no leitor web da aplicação |
| **Âmbito** | Módulo de vídeo do PictuRAS |
| **Ator Principal** | Utilizador Anônimo e Registado |
| **Stakeholders e Interesses** | - **Utilizador**: Quer carregar e visualizar os seus vídeos diretamente no leitor da aplicação de forma fluida e sem interrupções<br>- **Proprietário do Sistema**: Pretende controlar o tamanho dos ficheiros submetidos para evitar custos excessivos de armazenamento na nuvem<br>- **Equipa de Desenvolvimento**: Valida a cadeia de *upload* de ficheiros grandes (MinIO) e a entrega por *streaming* no browser |
| **Pré-condições** | - O utilizador tem sessão iniciada<br>- O utilizador acedeu a um projeto (ou à sua biblioteca de vídeos)<br>- O browser do utilizador suporta HTML5 e o leitor web da aplicação. |
| **Trigger** | O utilizador seleciona a opção **Carregar Vídeo** ou arrasta um ficheiro de vídeo para o projeto. Para visualizá-lo, clica sobre este. |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a sua biblioteca de vídeos | Apresenta a lista de vídeos do utilizador |
| 2 | — | Apresenta o botão de upload (**Carregar Vídeo**) |
| 3 | O utilizador seleciona o botão **Carregar Vídeo** e escolhe um ficheiro do seu dispositivo. | Valida a extensão do ficheiro e o limite de tamanho do perfil do utilizador. |
| 4 | — | Efetua o *upload* do ficheiro para o armazenamento e extrai os metadados do vídeo (duração, resolução, *codecs*). |
| 5 | — | Disponibiliza o vídeo na interface da biblioteca de vídeos. |
| 6 | O utilizador clica sobre o vídeo para o reproduzir. | Obtém um URL de acesso seguro (*presigned URL*) e inicia a transmissão do vídeo.|
| 7 | — | O leitor web inicia a reprodução do vídeo, permitindo controlo de *play*, *pause*, *seek* e *volume*. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 - Carregar e Reproduzir Vídeo num Projeto | O utilizador carrega um ficheiro de vídeo para um projeto (da mesma forma que carrega atualmente uma imagem) -> O sistema valida o ficheiro, efetua o *upload* e disponibiliza o vídeo no projeto (Passos 4 e 5). O utilizador clica sobre o vídeo para o reproduzir, obtendo um URL de acesso seguro e iniciando a transmissão do vídeo. |
| FA2 – Reproduzir Vídeo Já Carregado | O vídeo já existe na biblioteca do utilizador ou num projeto → O utilizador salta os passos 1 e 3, clica diretamente no vídeo pretendido e o sistema inicia a reprodução (Passos 6 e 7). |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| Tamanho do ficheiro excede o limite do perfil | No Passo 1, o sistema recusa o *upload*, apresenta a mensagem *"Ficheiro demasiado grande para o seu perfil"* e sugere o *upgrade* para Premium. |
| Codec de vídeo/áudio não suportado pelo browser | No Passo 4, o leitor exibe a mensagem *"O seu navegador não suporta este codec (ex.: H.265)"*. |
| Falha de rede durante o *upload* | No Passo 4, o sistema apresenta a mensagem *"Falha de rede. Por favor, tente novamente."* e permite retomar o *upload*. |
| Falha de rede durante a reprodução | No Passo 7, a ligação falha → O leitor pausa, apresenta o erro *"Erro de transmissão. Verifique a ligação"* e ativa o botão *"Tentar novamente"*. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | O vídeo é carregado e armazenado com sucesso na biblioteca do utilizador ou num projeto e é reproduzido no leitor web com os controlo de reprodução ativos. |
| Garantia Mínima | Se o *upload* ou a reprodução falharem, o sistema apresenta uma mensagem de erro clara, limpa ficheiros temporários incompletos e mantém o estado anterior do projeto, se for o caso. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | Os formatos de vídeo aceites para upload são MP4, MOV e WebM (com codecs de vídeo H.264, H.265, VP8/VP9 e codecs de áudio AAC, HE-AAC e Opus). |
| RN2 | O limite de tamanho por ficheiro é de 50 MB para Utilizadores Anónimos, 200 MB para Utilizadores Registados e sem limite para Utilizadores Premium. |
| RN3 | O acesso ao ficheiro de vídeo para reprodução é feito através de URLs pré-assinadas temporárias geradas pelo MinIO. |
| RN4 | O simples *upload* e reprodução de vídeo não consome a quota diária de operações de *edição* do utilizador registado. |

### 2.7 Assunções

> Em contexto *brownfield*, assunções não documentadas são a principal fonte de retrabalho. Registe-as aqui.

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O servidor de armazenamento (MinIO) suporta *HTTP Range Requests* para permitir avançar/recuar na barra de tempo sem descarregar o vídeo completo. |
| A2 | Ficheiros de vídeo de utilizadores anónimos são temporários e associados apenas à sessão do browser. |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | O leitor deve iniciar a reprodução automaticamente (*autoplay*) assim que o *upload* é concluído? |
| Q2 | Devemos gerar automaticamente uma miniatura (*thumbnail*) no momento em que o *upload* termina? |

---

## 3. Utilização de agentes de IA 
| ***Ferramenta / skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| Gemini Notebook | Estruturação do fluxo principal e fluxos alternativos para o caso de uso. | Revisão manual da sequência de passos, adaptando o fluxo para a distinção entre a biblioteca do utilizador e um projeto. |
| Gemini Notebook | Levantamento de exceções específicas de vídeo e definição de regras de negócio. | Validação técnica das exceções de codecs e ajuste das regras de negócio quanto aos formatos e codecs suportados (MP4, MOV, WebM). |

---

## 4. Esboço de requisitos derivados

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| REQ-VID-{FUNC}-001 | O sistema deve {…} | F | | | | |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|------------------------------|
| {…} | {…} | {…} | {…} |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
| Passo 1 | {…} | REQ-VID-…-001 |
