# 📝 Exercício 1 — Template de Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

> **Como usar este template**
> - **No Exercício 1, preencha apenas as secções 0 a 3.** A secção 4, *Esboço de requisitos derivados*, fica para a aula seguinte — não a preencha agora.
> - Substitua todo o texto em *itálico entre chavetas* `{...}` pelo seu conteúdo e **apague as linhas de ajuda** (as que começam por `>`), incluindo esta.
> - Mantenha as secções e a numeração: a avaliação segue esta estrutura.
> - Não deixe campos por preencher: se não souber, escreva uma **assunção** (secção 2.7) ou uma **questão em aberto** (secção 2.8).
> - Exemplos de referência: `RAS-use_case_example-LOGIN_PT.md` (Login) e `RAS-use_case_example-VIDEO_PT.md` (Gerar Miniatura de um Vídeo). Este template segue a mesma estrutura.

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | {nº do grupo} |
| **Autores** | {nome (nº mecanográfico); nome (nº); …} |
| **Data** | {AAAA-MM-DD} |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | {e.g., Recorte temporal de vídeo (*trim*)} |
| **Perfil(s) de utilizador abrangido(s)** | {anónimo / registado / premium — e porquê} |

**Justificação no contexto do MVP** *(2–3 linhas)*
> Porque é que esta funcionalidade é das primeiras a valer a pena construir? Que valor entrega ao utilizador? Sem ela, que parte do suporte a vídeo fica por validar?

{a sua justificação}

---

## 2. Caso de Uso

> Siga o formato dos exemplos de Login e de Vídeo. O exemplo de vídeo é **deliberadamente simples**: o caso de uso da sua equipa deve ser bastante mais complexo (ver a secção final desse exemplo, *Porque é que este exemplo é o mínimo*).

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-{nnn} |
| **Nome** | {nome do caso de uso} |
| **Versão** | v1.0 |
| **Autor** | {autor} |
| **Data** | {AAAA-MM-DD} |
| **Objetivo** | {o que o ator consegue alcançar} |
| **Âmbito** | {módulo/componente do PictuRAS afetado} |
| **Ator Principal** | {ator + perfil de utilização} |
| **Stakeholders e Interesses** | - **{stakeholder}**: {interesse}<br>- **{stakeholder}**: {interesse} |
| **Pré-condições** | - {…}<br>- {…} |
| **Trigger** | {o que dá início ao caso de uso} |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | {…} | {…} |
| 2 | {…} | — |
| 3 | — | {…} |
| … | | |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – {nome} | {condição → comportamento} |
| FA2 – {nome} | {…} |

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
