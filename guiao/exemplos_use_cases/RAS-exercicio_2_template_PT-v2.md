# 📝 Exercício 2 — Template para Atualização da Secção 4
### Especificação de Requisitos do Sistema · Fase 1: Suporte a Vídeo no PictuRAS

> **Como usar este template**
> - Continue o **mesmo dossiê versionado** do Exercício 1. Mantenha as secções 0 a 3 e complete/substitua a secção 4 com esta estrutura.
> - A funcionalidade, o caso de uso e o perfil escolhidos no Exercício 1 mantêm-se. Este exercício completa a ERS para essa funcionalidade; não é para escolher outra.
> - Preserve os IDs cujo significado não mudou. Atribua IDs novos a requisitos novos ou materialmente diferentes; nunca reutilize um ID eliminado.
> - Atualize as assunções, questões em aberto e a declaração de utilização de IA nas secções já existentes do dossiê.
> - Substitua os textos entre chavetas `{...}` e remova as linhas de ajuda (`>`).

---

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** {UC-VID-nnn — nome}  
**Versão do dossiê:** {e.g., v1.1}  
**Baseline do Exercício 1:** {versão do documento e IDs dos requisitos derivados}

> O catálogo 4.1 é a fonte única dos requisitos desta ERS. A matriz 4.3 rastreia esses IDs até ao caso de uso ou às decisões de qualidade. A tabela 4.2 descreve o impacto no sistema existente.

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

Inclua os requisitos funcionais derivados no Exercício 1 e os acrescentados para completar o serviço **dentro do âmbito escolhido**. Mantenha o ID original quando a intenção não mudou. Identifique a evolução face ao Exercício 1.

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
|--------|---------------|----------------|--------------|--------------|--------------------------------|-----------------|----------------------------------------|
| REQ-VID-{FUNC}-001 | O sistema deve {…}. | {Deve / Deveria / Poderia ter} | {Mantido / Refinado / Novo} | {NOVO / ALT} | {UC-VID-nnn, passo / FA / exceção / RN} | {…} | {Dado… Quando… Então…} |
| {ID existente ou novo} | {…} | {…} | {…} | {…} | {…} | {…} | {…} |

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

Classifique requisitos de qualidade segundo a ISO/IEC 25010. Registe regras de negócio e restrições funcionais na tabela 4.1.1; não as classifique como qualidade sem justificação. Para cada requisito de qualidade, distinga o que o MVP deve cumprir do alvo de produção.

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
|--------|---------------|----------------------------------|--------------|------------------|--------------|----------------------|----------------------------------------|
| REQ-VID-{FUNC}-nnn | O sistema deve {… com condição mensurável}. | {Eficiência de Desempenho / Fiabilidade / …} | {…} | {…} | {Mantido / Refinado / Novo} | {UC-VID-nnn / DQ-nnn} | {Dado… Quando… Então…} |
| {ID novo} | {…} | {…} | {…} | {…} | {…} | {…} | {…} |

> O alvo de produção é uma referência para a evolução futura, não um critério de aprovação do MVP. Use valores verificáveis nos dois alvos sempre que aplicável; justifique quando o alvo for qualitativo ou igual nos dois contextos.

#### 4.1.3 Verificação da completude e dos limites do âmbito

Avalie os tópicos do enunciado relativamente à funcionalidade escolhida. “Não aplicável” ou “fora do âmbito” é aceitável quando justificado; isso não obriga a introduzir funcionalidades alheias ao caso de uso.

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
|-----------------------|---------------|----------------------------|--------------------------------|
| Formato, codec, duração e dimensão do vídeo | {Sim / Não} | {…} | {IDs / N/A} |
| Estado, progresso, cancelamento e resultado | {Sim / Não} | {…} | {IDs / N/A} |
| Falhas durante o processamento | {Sim / Não} | {…} | {IDs / N/A} |
| Persistência e expiração dos ficheiros | {Sim / Não} | {…} | {IDs / N/A} |
| Perfis e contagem de operações | {Sim / Não} | {…} | {IDs / N/A} |
| Encadeamento de ferramentas e processamento em lote | {Sim / Não} | {…} | {IDs / N/A} |

**Evolução:** *Mantido* = requisito preservado; *Refinado* = clarificado ou tornado verificável sem mudar a intenção; *Novo* = acrescentado para completar a ERS. **NOVO/ALT** indica o impacto face ao PictuRAS existente, não a novidade face ao Exercício 1.

### 4.2 Impacto no sistema existente

Atualize a análise do Exercício 1 se algum requisito novo ou refinado a alterar. Inclua requisitos NOVO que interajam com mecanismos existentes.

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
|--------------------------------|-------------------------------------------|--------------------------|--------------------------------|
| {perfil, quota, armazenamento, biblioteca, encadeamento, lote, exportação…} | {…} | {…} | {IDs} |

### 4.3 Matriz de Rastreabilidade Atualizada

Estenda a matriz do Exercício 1. Um requisito funcional deve apontar para um elemento do caso de uso ou regra de negócio. Um requisito de qualidade pode apontar para uma decisão de qualidade `DQ-nnn`, registada na secção 2.7 como assunção/decisão, ou na lista de decisões abaixo. Decisões com impacto funcional devem também ser refletidas no caso de uso ou justificadas como extensão do âmbito.

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
|------------------------|-------------------------|--------------------------------|
| {Passo / FA / exceção / RN / pós-condição / DQ-nnn} | {…} | {IDs} |

**Decisões de qualidade introduzidas nesta aula**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
|--------|--------------------------|-----------------|--------------------------------|
| DQ-001 | {…} | {…} | {IDs} |

**Verificações de cobertura**
- [ ] Cada requisito funcional e não funcional aparece na matriz.
- [ ] Cada requisito tem origem identificada: elemento do caso de uso, regra de negócio ou decisão de qualidade.
- [ ] Todos os elementos relevantes do caso de uso têm requisito associado ou justificação para não terem.
- [ ] Os tópicos excluídos na secção 4.1.3 estão justificados.
- [ ] O impacto no sistema existente está atualizado e ligado aos requisitos relevantes.

---

## ✅ Lista de verificação antes de entregar

- [ ] As secções 0 a 3 do dossiê foram preservadas; as assunções, questões em aberto e utilização de IA foram atualizadas.
- [ ] A funcionalidade, o caso de uso e o perfil do Exercício 1 foram mantidos.
- [ ] Requisitos funcionais estão completos para o âmbito e têm critérios verificáveis.
- [ ] Requisitos de qualidade estão classificados e distinguem os alvos MVP e produção.
- [ ] Os IDs existentes foram preservados quando a intenção não mudou.
- [ ] A análise de completude não alargou o âmbito sem decisão explícita.
- [ ] A matriz de rastreabilidade não tem requisitos órfãos nem elementos relevantes por cobrir.
- [ ] As decisões de qualidade e os respetivos requisitos estão identificados.

---
