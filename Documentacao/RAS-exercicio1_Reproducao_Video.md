# 📝 Exercício 1 — Reprodução de Vídeo
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
| **Funcionalidade** | Reprodução de vídeo num projeto |
| **Perfil(s) de utilizador abrangido(s)** | **Utilizador Anônimo e Registado**. A reprodução de vídeos serve para todos os utilizadores, desde o Anônimo até ao Premium |

**Justificação no contexto do MVP** *(2–3 linhas)*

A reprodução de vídeo é uma funcionalidade essencial para o PictuRAS, permitindo que os utilizadores visualizem conteúdos multimédia diretamente na plataforma. Esta funcionalidade é fundamental para a experiência do utilizador, garantindo que todos os perfis, desde anônimos a registados, possam interagir com os vídeos disponíveis, aumentando a satisfação do utilizador.

---

## 2. Caso de Uso

> Siga o formato dos exemplos de Login e de Vídeo. O exemplo de vídeo é **deliberadamente simples**: o caso de uso da sua equipa deve ser bastante mais complexo (ver a secção final desse exemplo, *Porque é que este exemplo é o mínimo*).

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-002 |
| **Nome** | Reprodução de Vídeo |
| **Versão** | v1.0 |
| **Autor** | Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Quim |
| **Data** | 2026-10-07 |
| **Objetivo** | Reproduzir um vídeo disponível no PictuRAS |
| **Âmbito** | Módulo de vídeo do PictuRAS |
| **Ator Principal** | Utilizador Anônimo e Registado |
| **Stakeholders e Interesses** | - **Utilizador**: Quer visualizar os seus vídeos diretamente no leitor da aplicação de forma fluida e sem interrupções<br>- **Proprietário do Sistema**: Pretende uma funcionalidade de baixo custo computacional<br>- **Equipa de Desenvolvimento**: ??? |
| **Pré-condições** | - O utilizador tem sessão iniciada<br>- O vídeo já foi submetido com sucesso e está disponível na biblioteca de vídeos do utilizador |
| **Trigger** | O utilizador clica no vídeo que deseja reproduzir |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a sua biblioteca de vídeos | Apresenta a lista de vídeos do utilizador |
| 2 | — | Apresenta o botão de upload |
| 3 | O utilizador faz upload de um vídeo | O vídeo é armazenado no servidor caso o formato seja suportado |
| 4 | O utilizador prime um vídeo | Abre a reprodução do vídeo premido |
| 5 | — | Começa a reprodução do vídeo |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Formato de vídeo não suportado | No passo 3, o sistema informa o utilizador que o formato do vídeo não é suportado. O vídeo não é armazenado. |

### 2.4 Exceções

> Inclua **pelo menos uma exceção específica de vídeo** (formato/codec não suportado, duração ou tamanho excedidos, falha a meio do processamento, quota do perfil esgotada, …).

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| {…} | {…} |
| {…} | {…} |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | {estado do sistema quando tudo corre bem} |
| Garantia Mínima | {estado do sistema quando falha} |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | {e.g., utilizador registado limitado a vídeos de duração ≤ X s} |
| RN2 | {…} |

### 2.7 Assunções

> Em contexto *brownfield*, assunções não documentadas são a principal fonte de retrabalho. Registe-as aqui.

| **ID** | **Assunção** |
|--------|--------------|
| A1 | {…} |
| A2 | {…} |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | {…} |
| Q2 | {…} |

---

## 3. Utilização de agentes de IA

> Obrigatório em todas as fases do projeto. A equipa é responsável pelo conteúdo entregue, incluindo o gerado por IA. Se não usou agentes de IA, escreva-o.

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| {e.g., Claude Code} | {e.g., primeira versão dos fluxos alternativos} | {e.g., revisão manual; 2 fluxos descartados por não se aplicarem ao perfil anónimo} |

---

## ✅ Lista de verificação antes de entregar (Exercício 1)

- [ ] Secções 0 a 3 preenchidas e texto de ajuda (`>` e `{…}`) removido.
- [ ] Funcionalidade de vídeo escolhida **e justificada** no contexto do MVP.
- [ ] Ator principal identificado, com o respetivo perfil.
- [ ] Caso de uso com fluxo principal, **≥1 fluxo alternativo** e **≥1 exceção específica de vídeo**.
- [ ] Pós-condições com garantia de sucesso **e** garantia mínima.
- [ ] Regras de negócio e restrições preenchidas.
- [ ] Assunções e questões em aberto registadas.
- [ ] Utilização de agentes de IA documentada.

---
---

## 4. Esboço de requisitos derivados

> ⛔ **Não preencher no Exercício 1.** Esta secção será trabalhada na aula seguinte, a partir do caso de uso das secções 2.1 a 2.8. Fica aqui para que conheçam o passo seguinte — veja a secção com o mesmo nome no exemplo de vídeo.

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
