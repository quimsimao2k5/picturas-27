# 📝 Fase 1: Suporte a Vídeo no PictuRAS
### Casos de Uso e Especificação de Requisitos do Sistema

---

## 0. Identificação

| **Campo** | **Valor** |
|---|---|
| **Grupo / Equipa** | Grupo 7 |
| **Autores** | Francisco Dias (PG63958); Rodrigo Rocha (PG65437); Rodrigo Fernandes (PG64026); Luís Miguel (PG65424); Joaquim Cunha (PG63986) |
| **Data** | 2026-10-14 |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|---|---|
| **Funcionalidade** | Biblioteca de vídeos |
| **Caso de uso desenvolvido** | Adicionar um vídeo à biblioteca |
| **Perfil(s) de utilizador abrangido(s)** | Utilizador registado e utilizador premium |

### Justificação no contexto do MVP

A biblioteca de vídeos é uma funcionalidade fundamental para suportar as restantes operações de vídeo do PictuRAS, uma vez que permite ao utilizador submeter, armazenar, consultar e posteriormente selecionar vídeos para processamento.

No contexto do MVP, esta funcionalidade permite validar aspetos essenciais do novo suporte a vídeo, nomeadamente o carregamento de ficheiros de maior dimensão, a validação de formatos e codecs, o armazenamento persistente, a associação do vídeo ao respetivo utilizador, o acompanhamento do progresso do carregamento e o tratamento de falhas.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|---|---|
| **ID do Caso de Uso** | UC-VID-002 |
| **Nome** | Adicionar um vídeo à biblioteca |
| **Versão** | v1.0 |
| **Autores** | Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Joaquim Cunha |
| **Data** | 2026-10-14 |
| **Objetivo** | Permitir ao utilizador submeter um ficheiro de vídeo e disponibilizá-lo na sua biblioteca para consulta e posterior processamento. |
| **Âmbito** | Módulo de biblioteca, armazenamento e suporte a vídeo do PictuRAS |
| **Ator Principal** | Utilizador registado ou premium |
| **Stakeholders e Interesses** | **Utilizador:** pretende guardar os seus vídeos e utilizá-los posteriormente nas ferramentas do PictuRAS.<br>**Proprietário do sistema:** pretende controlar o armazenamento utilizado e diferenciar os limites dos perfis.<br>**Equipa de desenvolvimento:** pretende disponibilizar uma fonte persistente de vídeos para as restantes funcionalidades do sistema. |
| **Pré-condições** | - Para seguir o fluxo principal, o utilizador encontra-se autenticado como utilizador registado ou premium.<br>- O utilizador possui acesso à funcionalidade de biblioteca de vídeos. |
| **Trigger** | O utilizador seleciona a opção **Adicionar vídeo**. |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|---|---|---|
| **1** | O utilizador abre a sua biblioteca. | O sistema apresenta os vídeos atualmente disponíveis e a opção **Adicionar vídeo**. |
| **2** | O utilizador seleciona **Adicionar vídeo**. | O sistema apresenta a interface para seleção de um ficheiro. |
| **3** | O utilizador seleciona um ficheiro de vídeo do seu dispositivo. | O sistema identifica o tipo e o tamanho do ficheiro selecionado. |
| **4** | — | O sistema apresenta o nome e o tamanho do ficheiro antes da submissão. |
| **5** | O utilizador confirma a submissão. | O sistema verifica os limites aplicáveis ao perfil do utilizador. |
| **6** | — | O sistema inicia o carregamento (*upload*) do vídeo e apresenta o respetivo progresso. |
| **7** | — | Após concluir o carregamento, o sistema valida o formato, os codecs e a integridade do vídeo. |
| **8** | — | O sistema extrai e regista os metadados necessários, incluindo duração, resolução e tamanho. |
| **9** | — | O sistema associa o vídeo ao utilizador que efetuou a submissão e atribui-lhe um identificador único. |
| **10** | — | O sistema armazena o vídeo e, após a conclusão bem-sucedida das validações, atribui-lhe o estado **Disponível**. |
| **11** | O utilizador consulta a biblioteca. | O sistema apresenta o novo vídeo na biblioteca, juntamente com a informação necessária para o identificar. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|---|---|
| **FA1 — Cancelar antes do carregamento** | Antes de confirmar a submissão, o utilizador decide cancelar → o sistema regressa à biblioteca sem iniciar o carregamento nem criar qualquer vídeo. |
| **FA2 — Cancelar durante o carregamento** | O utilizador solicita o cancelamento enquanto o ficheiro está a ser transferido → o sistema interrompe o carregamento e elimina os dados parciais recebidos. |
| **FA3 — Alterar o ficheiro selecionado** | Antes da confirmação, o utilizador escolhe outro ficheiro → o sistema substitui a seleção anterior e apresenta as informações do novo ficheiro. |
| **FA4 — Nome de ficheiro já existente** | Já existe na biblioteca um vídeo com o mesmo nome → o sistema permite a submissão, atribui ao novo vídeo um identificador distinto e mantém ambos os ficheiros. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|---|---|
| **Utilizador não autenticado** | O utilizador não autenticado tenta iniciar a submissão de um vídeo → o sistema impede o carregamento e redireciona o utilizador para a página de autenticação/registo. |
| **Formato de vídeo não suportado** | O ficheiro não está em formato MP4 ou MOV → o sistema rejeita o ficheiro e informa o utilizador de que o formato não é suportado. |
| **Codec de vídeo não suportado** | O vídeo utiliza um codec de vídeo não suportado → o sistema não disponibiliza o vídeo na biblioteca e informa o utilizador da incompatibilidade. |
| **Codec de áudio não suportado** | O vídeo possui uma faixa de áudio com codec não suportado → o sistema não disponibiliza o vídeo na biblioteca e informa o utilizador da incompatibilidade. |
| **Ficheiro corrompido ou ilegível** | O sistema elimina os dados temporários associados ao carregamento e informa o utilizador de que o vídeo não pôde ser validado. |
| **Tamanho máximo excedido** | O sistema rejeita a submissão e informa o utilizador do limite correspondente ao seu perfil. |
| **Duração máxima excedida** | O sistema rejeita a submissão e informa o utilizador do limite correspondente ao seu perfil. |
| **Limite de armazenamento do perfil atingido** | O sistema rejeita a submissão e informa o utilizador de que não existe espaço suficiente. |
| **Falha de ligação durante o carregamento** | O sistema interrompe o carregamento, elimina os dados temporários e informa o utilizador da falha. |
| **Falha de armazenamento** | O sistema não conclui a submissão, elimina os dados temporários associados e informa o utilizador da falha. |
| **Sessão expirada durante a operação** | O sistema não disponibiliza o vídeo na biblioteca enquanto não estiver garantida a sua associação a um utilizador autenticado. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|---|---|
| **Garantia de Sucesso** | O vídeo encontra-se integralmente armazenado, associado ao utilizador, com identificador único e metadados registados, e é apresentado na respetiva biblioteca com o estado **Disponível**. |
| **Garantia Mínima** | Em caso de falha ou cancelamento, nenhum ficheiro incompleto é apresentado como vídeo disponível e os dados temporários associados ao carregamento são eliminados. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|---|---|
| **RN1** | Apenas utilizadores registados e premium possuem uma biblioteca pessoal de vídeos no MVP. |
| **RN2** | Cada vídeo armazenado deve estar associado ao utilizador que efetuou a submissão. |
| **RN3** | Um utilizador apenas pode consultar e utilizar os vídeos pertencentes à sua própria biblioteca. |
| **RN4** | Os formatos de vídeo suportados para upload no MVP são **MP4 e MOV**. |
| **RN5** | No MVP, o codec de vídeo suportado é H.264. |
| **RN6** | Quando existir faixa de áudio, o codec de áudio suportado no MVP é AAC. |
| **RN7** | O sistema deve validar o vídeo antes de lhe atribuir o estado **Disponível**. |
| **RN8** | Um vídeo incompleto, corrompido ou cuja validação tenha falhado não pode ser apresentado como disponível. |
| **RN9** | Cada vídeo deve possuir um identificador único, independentemente do nome do ficheiro. |
| **RN10** | Os limites máximos de tamanho, duração e armazenamento podem variar consoante o perfil do utilizador e devem ser definidos antes da respetiva implementação. |
| **RN11** | O processamento posterior de um vídeo é contabilizado segundo as regras de quota aplicáveis ao perfil do utilizador. |
| **RN12** | No MVP, a submissão de um vídeo para a biblioteca não consome uma das cinco operações diárias do utilizador registado. |

### 2.7 Assunções

| **ID** | **Assunção** | **Impacto se for falsa** |
|---|---|---|
| **A1** | Cada utilizador registado ou premium possui uma biblioteca pessoal de vídeos. | Será necessário definir outro mecanismo de organização e propriedade dos vídeos. |
| **A2** | O perfil anónimo não possui armazenamento persistente de vídeos. | Será necessário definir armazenamento temporário e regras de eliminação automática. |
| **A3** | Os codecs inicialmente suportados são H.264 para vídeo e AAC para áudio. | Os requisitos de compatibilidade e os respetivos testes terão de ser alterados. |
| **A4** | O armazenamento de vídeos está sujeito a limites diferentes consoante o perfil. | Os requisitos associados aos limites por perfil terão de ser revistos. |
| **A5** | O sistema consegue determinar duração, resolução e tamanho do vídeo após a submissão. | Será necessário rever os metadados registados e apresentados. |

### 2.8 Questões em Aberto

| **ID** | **Questão em aberto** | **Quem decide / quando** |
|---|---|---|
| **Q1** | Qual é o tamanho máximo permitido para cada vídeo nos perfis registado e premium? | Equipa, antes da implementação da validação do tamanho dos vídeos. |
| **Q2** | Qual é a duração máxima permitida para cada perfil? | Equipa, antes da implementação da validação da duração dos vídeos. |
| **Q3** | Qual é o espaço total de armazenamento disponibilizado a cada perfil? | Equipa, antes da implementação dos limites de armazenamento da biblioteca. |
| **Q4** | Devem ser suportados outros formatos além de MP4 e MOV, como WebM? | Equipa, antes da implementação final da validação de formatos. |
| **Q5** | O perfil anónimo deve poder carregar vídeos para armazenamento temporário? | Equipa, antes da implementação das regras de acesso à biblioteca. |
| **Q6** | Durante quanto tempo deve um vídeo permanecer armazenado na biblioteca? | Equipa, antes da implementação da política de retenção e eliminação de vídeos. |
| **Q7** | O sistema deve permitir ao utilizador eliminar manualmente vídeos da biblioteca? | Equipa, antes da implementação das operações de gestão da biblioteca. |
| **Q8** | Deve existir recuperação automática de um carregamento interrompido ou o utilizador terá de reiniciar a submissão? | Equipa, antes da implementação do mecanismo de upload e recuperação de falhas. |

---

## 3. Utilização de agentes de IA

| **Ferramenta / skill** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|---|---|---|
| **ChatGPT** | Apoio na estruturação do caso de uso da biblioteca de vídeos, identificação de fluxos alternativos e exceções, derivação e refinamento de requisitos, análise de impacto, decisões de qualidade e matriz de rastreabilidade. | A equipa reviu o conteúdo com base no enunciado, no template oficial do Exercício 2 e no guia de derivação de requisitos. As decisões não definidas pelo enunciado foram mantidas como assunções, regras de negócio ou questões em aberto. |

---

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** UC-VID-003 — Adicionar um vídeo à biblioteca  
**Versão do dossiê:** v1.0  
**Baseline do Exercício 1:** v1.0 — REQ-VID-LIB-001 a REQ-VID-LIB-040

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
|---|---|---|---|---|---|---|---|
| REQ-VID-LIB-001 | O sistema deve permitir ao utilizador registado ou premium aceder à sua biblioteca de vídeos. | Deve ter | Mantido | ALT | UC-VID-003, passo 1; RN1 | Garante o acesso dos perfis abrangidos à nova capacidade de vídeo. | Dado um utilizador registado ou premium autenticado, quando acede à biblioteca, então a biblioteca de vídeos é apresentada. |
| REQ-VID-LIB-002 | O sistema deve apresentar ao utilizador os vídeos disponíveis na sua biblioteca. | Deve ter | Mantido | NOVO | UC-VID-003, passo 1 | Permite ao utilizador consultar os vídeos já submetidos. | Dada uma biblioteca com vídeos armazenados, quando o utilizador a abre, então os seus vídeos são apresentados. |
| REQ-VID-LIB-003 | O sistema deve disponibilizar na biblioteca a opção **Adicionar vídeo**. | Deve ter | Mantido | NOVO | UC-VID-003, passos 1–2 | Disponibiliza o ponto de entrada para a submissão de vídeos. | Quando o utilizador abre a biblioteca, então a opção **Adicionar vídeo** é apresentada. |
| REQ-VID-LIB-004 | O sistema deve permitir ao utilizador selecionar um ficheiro de vídeo do seu dispositivo para submissão. | Deve ter | Mantido | NOVO | UC-VID-003, passo 3 | A seleção do ficheiro é necessária para iniciar uma submissão. | Quando o utilizador escolhe **Adicionar vídeo**, então consegue selecionar um ficheiro do dispositivo. |
| REQ-VID-LIB-005 | O sistema deve apresentar o nome do ficheiro selecionado antes da confirmação da submissão. | Deveria ter | Mantido | NOVO | UC-VID-003, passo 4 | Ajuda o utilizador a confirmar que selecionou o ficheiro pretendido. | Dado um ficheiro com nome conhecido, quando é selecionado, então o nome apresentado corresponde ao ficheiro escolhido. |
| REQ-VID-LIB-006 | O sistema deve apresentar o tamanho do ficheiro selecionado antes da confirmação da submissão. | Deveria ter | Mantido | NOVO | UC-VID-003, passos 3–4 | Permite ao utilizador conhecer a dimensão da submissão antes do upload. | Dado um ficheiro de tamanho conhecido, quando é selecionado, então o tamanho apresentado corresponde ao ficheiro escolhido. |
| REQ-VID-LIB-007 | O sistema deve permitir ao utilizador confirmar a submissão do vídeo selecionado. | Deve ter | Mantido | NOVO | UC-VID-003, passo 5 | Evita iniciar o upload sem uma ação explícita do utilizador. | Dado um vídeo selecionado, quando o utilizador confirma a submissão, então o pedido prossegue para validação e upload. |
| REQ-VID-LIB-008 | O sistema deve realizar o carregamento (*upload*) do ficheiro de vídeo após a confirmação da submissão. | Deve ter | Mantido | NOVO | UC-VID-003, passos 5–6 | O upload é necessário para armazenar e posteriormente processar o vídeo. | Dado um pedido válido, quando o utilizador confirma a submissão, então o conteúdo integral do ficheiro é transferido para o sistema. |
| REQ-VID-LIB-009 | O sistema deve apresentar o progresso do carregamento enquanto o ficheiro está a ser transferido. | Deveria ter | Mantido | NOVO | UC-VID-003, passo 6 | Vídeos podem ser grandes; o utilizador precisa de acompanhar o upload. | Durante um upload com duração suficiente, então é apresentada informação de progresso até ao fim da transferência. |
| REQ-VID-LIB-011 | O sistema deve permitir ao utilizador cancelar a submissão antes do início do carregamento. | Deveria ter | Mantido | NOVO | UC-VID-003, FA1 | Permite desistir da operação sem iniciar transferência ou armazenamento. | Dado um ficheiro selecionado, quando o utilizador cancela antes da confirmação, então nenhum upload é iniciado. |
| REQ-VID-LIB-012 | O sistema deve permitir ao utilizador cancelar um carregamento em curso. | Deveria ter | Mantido | NOVO | UC-VID-003, FA2 | Evita obrigar o utilizador a concluir um upload que já não pretende. | Dado um upload em curso, quando o utilizador escolhe cancelar, então a transferência é interrompida. |
| REQ-VID-LIB-015 | O sistema deve rejeitar a submissão de um vídeo cujo tamanho exceda o limite definido para o perfil do utilizador. | Deve ter | Refinado | NOVO | UC-VID-003, passo 5; exceção tamanho máximo; RN10 | Protege a capacidade de armazenamento e permite diferenciar os perfis. | Dado o limite aprovado em Q1, quando é submetido um vídeo acima desse limite, então a submissão é rejeitada antes de o vídeo ficar disponível. |
| REQ-VID-LIB-016 | O sistema deve rejeitar a submissão de um vídeo cuja duração exceda o limite definido para o perfil do utilizador. | Deve ter | Refinado | NOVO | UC-VID-003, passo 5; exceção duração máxima; RN10 | Limita o volume de dados e o custo associado aos vídeos aceites. | Dado o limite aprovado em Q2, quando é submetido um vídeo acima desse limite, então a submissão é rejeitada. |
| REQ-VID-LIB-017 | O sistema deve rejeitar uma nova submissão quando o espaço de armazenamento disponível para o perfil for insuficiente para armazenar o vídeo. | Deve ter | Refinado | NOVO | UC-VID-003, passo 5; exceção armazenamento; RN10 | Impede que a biblioteca ultrapasse a capacidade atribuída ao perfil. | Dado o limite aprovado em Q3, quando o espaço disponível é inferior ao tamanho do vídeo, então a submissão é rejeitada. |
| REQ-VID-LIB-018 | O sistema deve aceitar para upload ficheiros de vídeo nos formatos **MP4 e MOV**. | Deve ter | Refinado | NOVO | UC-VID-003, passo 7; RN4 | Define explicitamente os formatos suportados pelo MVP. | Dado um MP4 válido e um MOV válido, quando são submetidos separadamente, então ambos os formatos são aceites. |
| REQ-VID-LIB-019 | O sistema deve aceitar vídeo codificado em H.264 no MVP. | Deve ter | Mantido | NOVO | UC-VID-003, passo 7; RN5 | Define um codec de vídeo suportado e testável para o MVP. | Dado um ficheiro MP4 ou MOV com vídeo H.264 válido, quando é validado, então o codec é aceite. |
| REQ-VID-LIB-020 | O sistema deve rejeitar um ficheiro de vídeo que esteja corrompido ou não possa ser lido. | Deve ter | Refinado | NOVO | UC-VID-003, passo 7; exceção ficheiro corrompido; RN8 | Impede a entrada na biblioteca de conteúdos que não podem ser utilizados. | Dado um ficheiro corrompido, quando é validado, então é rejeitado e não adquire o estado **Disponível**. |
| REQ-VID-LIB-021 | O sistema deve impedir que um vídeo cuja validação tenha falhado adquira o estado **Disponível**. | Deve ter | Refinado | NOVO | UC-VID-003, passo 7; RN7; RN8 | Garante que apenas vídeos válidos são apresentados como utilizáveis. | Quando qualquer validação obrigatória falha, então o vídeo não recebe o estado **Disponível**. |
| REQ-VID-LIB-022 | O sistema deve registar a duração do vídeo submetido após a sua validação. | Deve ter | Mantido | NOVO | UC-VID-003, passo 8 | A duração é necessária para consulta e aplicação dos limites definidos. | Dado um vídeo de duração conhecida, quando é validado, então a duração registada corresponde ao ficheiro. |
| REQ-VID-LIB-023 | O sistema deve registar a resolução do vídeo submetido após a sua validação. | Deve ter | Mantido | NOVO | UC-VID-003, passo 8 | A resolução é um metadado relevante para identificação e processamento posterior. | Dado um vídeo de resolução conhecida, quando é validado, então a resolução registada corresponde ao ficheiro. |
| REQ-VID-LIB-024 | O sistema deve registar o tamanho do vídeo submetido. | Deve ter | Mantido | NOVO | UC-VID-003, passo 8 | O tamanho é necessário para controlo de armazenamento e consulta dos metadados. | Dado um vídeo de tamanho conhecido, quando é submetido, então o tamanho registado corresponde ao ficheiro. |
| REQ-VID-LIB-025 | O sistema deve associar o vídeo submetido ao utilizador autenticado que realizou a submissão. | Deve ter | Mantido | NOVO | UC-VID-003, passo 9; RN2; pós-condição de sucesso | Estabelece a propriedade do vídeo e permite aplicar as regras de acesso. | Dado um utilizador autenticado, quando submete um vídeo, então o vídeo fica associado à sua conta. |
| REQ-VID-LIB-026 | O sistema deve atribuir um identificador único a cada vídeo armazenado. | Deve ter | Refinado | NOVO | UC-VID-003, passo 9; RN9 | Permite distinguir vídeos mesmo quando têm o mesmo nome de ficheiro. | Quando são armazenados vários vídeos, então nenhum recebe o mesmo identificador. |
| REQ-VID-LIB-027 | O sistema deve permitir armazenar vídeos com o mesmo nome de ficheiro quando estes possuírem identificadores distintos. | Deveria ter | Mantido | NOVO | UC-VID-003, FA4; RN9 | Evita que o nome do ficheiro funcione como identificador único indevido. | Dado dois vídeos com o mesmo nome, quando ambos são submetidos validamente, então os dois permanecem armazenados com IDs diferentes. |
| REQ-VID-LIB-028 | O sistema deve armazenar persistentemente o vídeo após a conclusão bem-sucedida do carregamento e da validação. | Deve ter | Refinado | NOVO | UC-VID-003, passo 10; pós-condição de sucesso | A biblioteca requer persistência para que o vídeo continue disponível em acessos posteriores. | Dado um vídeo válido, quando a submissão termina com sucesso e o utilizador volta a iniciar sessão, então o vídeo continua disponível. |
| REQ-VID-LIB-029 | O sistema deve atribuir o estado **Disponível** apenas a vídeos cujo carregamento, validação e armazenamento tenham terminado com sucesso. | Deve ter | Refinado | NOVO | UC-VID-003, passo 10; RN7; RN8 | O estado deve representar corretamente a disponibilidade real do vídeo. | Quando upload, validação e armazenamento terminam com sucesso, então o estado passa para **Disponível**; caso contrário não passa. |
| REQ-VID-LIB-030 | O sistema deve apresentar na biblioteca os vídeos que tenham adquirido o estado **Disponível**. | Deve ter | Mantido | NOVO | UC-VID-003, passo 11; RN8 | Permite ao utilizador consultar os vídeos prontos para utilização. | Dado um vídeo com estado **Disponível**, quando o utilizador abre a biblioteca, então o vídeo é apresentado. |
| REQ-VID-LIB-031 | O sistema deve permitir ao utilizador consultar os metadados registados de um vídeo da sua biblioteca. | Deveria ter | Mantido | NOVO | UC-VID-003, passos 8 e 11 | Os metadados ajudam o utilizador a identificar e escolher o vídeo correto. | Dado um vídeo armazenado, quando o utilizador consulta os seus detalhes, então são apresentados os metadados registados. |
| REQ-VID-LIB-034 | O sistema não deve contabilizar a submissão de um vídeo para a biblioteca como uma operação da quota diária de cinco operações do utilizador registado. | Deve ter | Refinado | ALT | RN12 | Distingue a submissão/armazenamento das operações de processamento já contabilizadas pelo PictuRAS. | Dado um utilizador registado, quando conclui um upload, então o contador das cinco operações diárias não aumenta. |
| REQ-VID-LIB-035 | O sistema deve informar o utilizador quando o formato do ficheiro submetido não for MP4 nem MOV. | Deve ter | Refinado | NOVO | UC-VID-003, exceção formato; RN4 | Explica ao utilizador por que razão o ficheiro foi rejeitado. | Dado um ficheiro que não seja MP4 nem MOV, quando é submetido, então é apresentada uma indicação de formato não suportado. |
| REQ-VID-LIB-036 | O sistema deve informar o utilizador quando o codec de vídeo submetido não for suportado. | Deve ter | Mantido | NOVO | UC-VID-003, exceção codec de vídeo; RN5 | Permite distinguir uma incompatibilidade de codec de uma incompatibilidade de formato. | Dado um vídeo com codec de vídeo não suportado, quando é validado, então é apresentada a causa da rejeição. |
| REQ-VID-LIB-037 | O sistema deve informar o utilizador quando o tamanho do vídeo exceder o limite aplicável ao seu perfil. | Deve ter | Mantido | NOVO | UC-VID-003, exceção tamanho máximo | Torna explícita a razão pela qual uma submissão excede os limites do perfil. | Dado um vídeo acima do limite aprovado em Q1, quando a submissão é rejeitada, então o motivo apresentado identifica o limite de tamanho. |
| REQ-VID-LIB-038 | O sistema deve informar o utilizador quando não existir espaço de armazenamento suficiente para adicionar o vídeo. | Deve ter | Mantido | NOVO | UC-VID-003, exceção armazenamento | Permite ao utilizador perceber que a rejeição está relacionada com a capacidade disponível. | Quando o espaço disponível é insuficiente, então a submissão é rejeitada e é apresentada essa causa. |
| REQ-VID-LIB-039 | O sistema deve informar o utilizador quando ocorrer uma falha de ligação durante o carregamento. | Deve ter | Mantido | NOVO | UC-VID-003, exceção falha de ligação | Dá feedback explícito quando o upload não termina por um problema de ligação. | Quando a ligação é interrompida durante o upload, então o utilizador recebe uma indicação de falha do carregamento. |
| REQ-VID-LIB-041 | O sistema deve identificar o tipo do ficheiro selecionado antes de iniciar o carregamento. | Deve ter | Novo | NOVO | UC-VID-003, passo 3 | Permite uma primeira verificação antes da transferência integral do ficheiro. | Dado um ficheiro selecionado, quando o sistema o analisa antes do upload, então identifica o seu tipo. |
| REQ-VID-LIB-042 | O sistema deve permitir ao utilizador substituir o ficheiro selecionado por outro antes da confirmação da submissão. | Deveria ter | Novo | NOVO | UC-VID-003, FA3 | Suporta explicitamente o fluxo alternativo de correção da seleção. | Dado um primeiro ficheiro selecionado, quando o utilizador escolhe outro antes de confirmar, então o segundo substitui a seleção inicial. |
| REQ-VID-LIB-044 | O sistema deve informar o utilizador quando ocorrer uma falha durante o armazenamento do vídeo. | Deve ter | Novo | NOVO | UC-VID-003, exceção falha de armazenamento | Distingue falhas de armazenamento de outros erros de submissão. | Quando é provocada uma falha de armazenamento, então o utilizador é informado de que a submissão não foi concluída. |
| REQ-VID-LIB-045 | O sistema deve contabilizar as operações de processamento realizadas posteriormente sobre o vídeo segundo as regras de quota aplicáveis ao perfil do utilizador. | Deve ter | Novo | ALT | RN11 | Mantém a regra de quota existente para operações de processamento posteriores ao upload. | Dado um vídeo já armazenado, quando é executada uma operação de processamento, então essa operação é contabilizada de acordo com o perfil. |
| REQ-VID-LIB-046 | O sistema deve aceitar áudio codificado em AAC quando o vídeo submetido possuir uma faixa de áudio. | Deve ter | Novo | NOVO | UC-VID-003, passo 7; RN6 | Define o codec de áudio suportado pelo MVP para ficheiros com áudio. | Dado um MP4 ou MOV com vídeo H.264 e áudio AAC válido, quando é validado, então a faixa de áudio é aceite. |
| REQ-VID-LIB-047 | O sistema deve informar o utilizador quando a duração do vídeo exceder o limite aplicável ao seu perfil. | Deve ter | Novo | NOVO | UC-VID-003, exceção duração máxima | Torna explícita a razão pela qual um vídeo demasiado longo foi rejeitado. | Dado um vídeo acima do limite aprovado em Q2, quando a submissão é rejeitada, então o motivo apresentado identifica o limite de duração. |
| REQ-VID-LIB-048 | O sistema deve redirecionar um utilizador não autenticado que tente iniciar a submissão de um vídeo para a página de autenticação/registo. | Deveria ter | Novo | ALT | UC-VID-003, exceção utilizador não autenticado | Orienta um utilizador sem sessão para o passo necessário antes de poder submeter vídeos. | Dado um utilizador não autenticado, quando seleciona **Adicionar vídeo**, então é apresentada a página de autenticação/registo. |
| REQ-VID-LIB-049 | O sistema deve impedir um utilizador não autenticado de submeter vídeos para a biblioteca. | Deve ter | Novo | ALT | UC-VID-003, exceção utilizador não autenticado; RN1 | Faz cumprir a regra de acesso definida para a biblioteca do MVP. | Dado um utilizador não autenticado, quando tenta iniciar a submissão, então nenhum carregamento é iniciado. |

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
|---|---|---|---|---|---|---|---|
| REQ-VID-LIB-010 | O sistema deve atualizar a informação de progresso do carregamento pelo menos uma vez a cada 2 segundos enquanto existir transferência de dados. | Usabilidade | Atualização do progresso com intervalo máximo de 2 s. | Atualização do progresso com intervalo máximo de 1 s. | Refinado | DQ-001 | Dado um upload com duração superior a 6 s, quando o progresso é observado, então o intervalo entre atualizações consecutivas não excede 2 s no MVP. |
| REQ-VID-LIB-013 | O sistema deve eliminar os dados parciais resultantes de um carregamento cancelado pelo utilizador. | Fiabilidade | 0 ficheiros parciais persistentes após um cancelamento concluído. | Igual ao MVP: 0 ficheiros parciais persistentes. | Mantido | UC-VID-003, FA2; DQ-002 | Dado um upload em curso, quando é cancelado, então nenhum ficheiro parcial desse pedido permanece armazenado. |
| REQ-VID-LIB-014 | O sistema deve eliminar os dados temporários do vídeo quando uma submissão iniciada termina com falha. | Fiabilidade | 0 ficheiros temporários persistentes após uma submissão falhada. | Igual ao MVP: 0 ficheiros temporários persistentes. | Mantido | UC-VID-003, exceções de falha; DQ-002 | Dada uma falha após o início do upload, quando a submissão termina, então os dados temporários associados são eliminados. |
| REQ-VID-LIB-032 | O sistema deve impedir um utilizador de consultar vídeos pertencentes à biblioteca de outro utilizador. | Segurança | 100% dos pedidos não autorizados de consulta são recusados. | Igual ao MVP: 100% dos pedidos não autorizados são recusados. | Mantido | UC-VID-003, RN3; DQ-003 | Dados dois utilizadores distintos, quando um tenta consultar diretamente um vídeo do outro, então o acesso é recusado. |
| REQ-VID-LIB-033 | O sistema deve impedir um utilizador de utilizar para processamento um vídeo pertencente a outro utilizador. | Segurança | 100% dos pedidos não autorizados de processamento são recusados. | Igual ao MVP: 100% dos pedidos não autorizados são recusados. | Mantido | UC-VID-003, RN3; DQ-003 | Dados dois utilizadores distintos, quando um tenta processar um vídeo do outro, então o pedido é recusado. |
| REQ-VID-LIB-040 | O sistema deve apresentar o resultado da validação em até 5 segundos após a conclusão do carregamento, para vídeos dentro dos limites definidos para o MVP. | Eficiência de Desempenho | Resultado da validação apresentado em ≤ 5 s após o fim do upload. | Resultado da validação apresentado em ≤ 2 s após o fim do upload. | Refinado | DQ-004 | Dado um vídeo dentro dos limites do MVP, quando o upload termina, então o resultado da validação é apresentado em até 5 s. |
| REQ-VID-LIB-043 | O sistema deve impedir que um vídeo seja disponibilizado na biblioteca se a sessão do utilizador expirar antes de ser garantida a associação do vídeo a um utilizador autenticado. | Segurança | 100% dos casos de sessão expirada impedem a publicação do vídeo sem associação válida. | Igual ao MVP: 100% dos casos são bloqueados. | Novo | UC-VID-003, exceção sessão expirada; DQ-005 | Dado um upload cuja sessão expira antes da associação, quando a operação termina, então o vídeo não adquire o estado **Disponível**. |


#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
|---|---|---|---|
| Formato, codec, duração e dimensão do vídeo | Sim | Faz parte diretamente da submissão e validação do vídeo. O MVP aceita MP4 e MOV, com H.264 e AAC; os limites quantitativos de tamanho e duração permanecem em Q1 e Q2 até decisão da equipa. | REQ-VID-LIB-015, 016, 018, 019, 020, 035, 036, 046, 047 |
| Estado, progresso, cancelamento e resultado | Sim | O caso de uso inclui progresso de upload, cancelamento antes/durante o carregamento e o estado final **Disponível**. | REQ-VID-LIB-009, 010, 011, 012, 013, 029, 030 |
| Falhas durante o processamento | Sim, no âmbito da submissão | São tratadas falhas de upload, validação e armazenamento. Falhas de ferramentas de processamento posteriores ficam fora deste caso de uso. | REQ-VID-LIB-014, 020, 021, 039, 044 |
| Persistência e expiração dos ficheiros | Parcialmente | A persistência do vídeo na biblioteca está no âmbito. A política de expiração/retenção permanece em Q6 e ainda não origina um requisito definitivo. | REQ-VID-LIB-028; expiração: N/A enquanto Q6 estiver aberta |
| Perfis e contagem de operações | Sim | A biblioteca é disponibilizada a registados e premium. O upload não consome a quota de cinco operações; o processamento posterior segue as regras do perfil. | REQ-VID-LIB-001, 015, 016, 017, 034, 045, 049 |
| Encadeamento de ferramentas e processamento em lote | Não | Fora do âmbito deste caso de uso, que trata apenas da submissão e disponibilização de um vídeo na biblioteca. | N/A |

**Evolução:** *Mantido* = requisito preservado; *Refinado* = clarificado ou tornado verificável sem mudar a intenção; *Novo* = acrescentado para completar a ERS. **NOVO/ALT** indica o impacto face ao PictuRAS existente, não a novidade face ao Exercício 1.

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
|---|---|---|---|
| Perfis de utilização | Estender | Os perfis registado e premium passam a ter acesso a uma biblioteca pessoal de vídeos e a limites específicos de vídeo. | REQ-VID-LIB-001, 015, 016, 017, 049 |
| Armazenamento | Estender | O sistema passa a armazenar ficheiros de vídeo, incluindo MP4 e MOV, bem como dados temporários durante o upload. | REQ-VID-LIB-013, 014, 017, 028 |
| Biblioteca / gestão de conteúdos | Estender | A biblioteca passa a suportar vídeos, metadados, identificadores e estado de disponibilidade. | REQ-VID-LIB-002, 025, 026, 028, 029, 030, 031 |
| Limite de 5 operações/dia do perfil registado | Alterar | O upload é explicitamente excluído da quota; as operações de processamento posteriores continuam a ser contabilizadas segundo as regras do perfil. | REQ-VID-LIB-034, 045 |
| Autenticação e autorização | Estender | As regras existentes passam a controlar também submissão, consulta e utilização de vídeos, incluindo sessão expirada. | REQ-VID-LIB-032, 033, 043, 048, 049 |
| Validação de ficheiros | Estender | O sistema passa a validar formatos MP4/MOV, codecs H.264/AAC, integridade, tamanho e duração. | REQ-VID-LIB-015, 016, 018, 019, 020, 021, 035, 036, 046, 047 |
| Interface do utilizador | Estender | A interface passa a incluir seleção de vídeo, confirmação, progresso, cancelamento, mensagens de erro e consulta de metadados. | REQ-VID-LIB-003, 004, 005, 006, 007, 009, 011, 012, 031, 035, 036, 037, 038, 039, 042, 044, 047, 048 |
| Ferramentas de processamento | Manter / preparar integração | Este caso de uso não implementa ferramentas de vídeo, mas os vídeos disponíveis na biblioteca passam a poder ser usados posteriormente como entrada dessas operações. | REQ-VID-LIB-030, 033, 045 |

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
|---|---|---|
| UC-VID-003, passo 1 | Abrir e apresentar a biblioteca | REQ-VID-LIB-001, 002, 003 |
| UC-VID-003, passo 2 | Selecionar **Adicionar vídeo** | REQ-VID-LIB-003, 004 |
| UC-VID-003, passo 3 | Selecionar e identificar ficheiro | REQ-VID-LIB-004, 006, 041 |
| UC-VID-003, passo 4 | Apresentar nome e tamanho | REQ-VID-LIB-005, 006 |
| UC-VID-003, passo 5 | Confirmar submissão e verificar limites | REQ-VID-LIB-007, 015, 016, 017 |
| UC-VID-003, passo 6 | Executar upload e apresentar progresso | REQ-VID-LIB-008, 009, 010 |
| UC-VID-003, passo 7 | Validar formato, codecs e integridade | REQ-VID-LIB-018, 019, 020, 021, 040, 046 |
| UC-VID-003, passo 8 | Registar metadados | REQ-VID-LIB-022, 023, 024, 031 |
| UC-VID-003, passo 9 | Associar ao utilizador e atribuir ID | REQ-VID-LIB-025, 026 |
| UC-VID-003, passo 10 | Armazenar e atribuir estado **Disponível** | REQ-VID-LIB-028, 029 |
| UC-VID-003, passo 11 | Apresentar vídeo na biblioteca | REQ-VID-LIB-030, 031 |
| UC-VID-003, FA1 | Cancelar antes do upload | REQ-VID-LIB-011 |
| UC-VID-003, FA2 | Cancelar durante o upload | REQ-VID-LIB-012, 013 |
| UC-VID-003, FA3 | Alterar ficheiro selecionado | REQ-VID-LIB-042 |
| UC-VID-003, FA4 | Nome de ficheiro repetido | REQ-VID-LIB-026, 027 |
| Exceção — utilizador não autenticado | Impedir upload e redirecionar | REQ-VID-LIB-048, 049 |
| Exceção — formato não suportado | Rejeitar formato diferente de MP4/MOV | REQ-VID-LIB-018, 035 |
| Exceção — codec de vídeo não suportado | Rejeitar e informar | REQ-VID-LIB-019, 036 |
| Exceção — codec de áudio não suportado | Rejeitar e informar | REQ-VID-LIB-046 |
| Exceção — ficheiro corrompido | Não disponibilizar vídeo inválido | REQ-VID-LIB-014, 020, 021 |
| Exceção — tamanho máximo excedido | Rejeitar e informar | REQ-VID-LIB-015, 037 |
| Exceção — duração máxima excedida | Rejeitar e informar | REQ-VID-LIB-016, 047 |
| Exceção — armazenamento insuficiente | Rejeitar e informar | REQ-VID-LIB-017, 038 |
| Exceção — falha de ligação | Limpar dados temporários e informar | REQ-VID-LIB-014, 039 |
| Exceção — falha de armazenamento | Limpar dados temporários e informar | REQ-VID-LIB-014, 044 |
| Exceção — sessão expirada | Não disponibilizar sem associação válida | REQ-VID-LIB-043 |
| RN1 | Biblioteca apenas para registado/premium | REQ-VID-LIB-001, 049 |
| RN2 | Associar vídeo ao proprietário | REQ-VID-LIB-025, 043 |
| RN3 | Restringir acesso ao proprietário | REQ-VID-LIB-032, 033 |
| RN4 | Formatos MP4 e MOV | REQ-VID-LIB-018, 035 |
| RN5 | Codec de vídeo H.264 | REQ-VID-LIB-019, 036 |
| RN6 | Codec de áudio AAC | REQ-VID-LIB-046 |
| RN7 | Validar antes de **Disponível** | REQ-VID-LIB-021, 029 |
| RN8 | Não apresentar vídeo inválido/incompleto | REQ-VID-LIB-020, 021, 029, 030 |
| RN9 | Identificador único | REQ-VID-LIB-026, 027 |
| RN10 | Limites por perfil | REQ-VID-LIB-015, 016, 017 |
| RN11 | Processamento posterior segue quota | REQ-VID-LIB-045 |
| RN12 | Upload não consome quota | REQ-VID-LIB-034 |
| Pós-condição de sucesso | Vídeo armazenado, associado e disponível | REQ-VID-LIB-025, 026, 028, 029, 030 |
| Garantia mínima | Sem ficheiros incompletos após falha/cancelamento | REQ-VID-LIB-013, 014, 021 |
| DQ-001 | Frequência de atualização do progresso | REQ-VID-LIB-010 |
| DQ-002 | Limpeza de dados parciais/temporários | REQ-VID-LIB-013, 014 |
| DQ-003 | Isolamento de acesso entre utilizadores | REQ-VID-LIB-032, 033 |
| DQ-004 | Tempo para apresentar resultado da validação | REQ-VID-LIB-040 |
| DQ-005 | Proteção quando a sessão expira | REQ-VID-LIB-043 |

**Decisões de qualidade introduzidas nesta aula**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
|---|---|---|---|
| **DQ-001** | No MVP, o progresso do upload é atualizado com intervalo máximo de 2 s; em produção, o alvo é 1 s. | Garante feedback regular em transferências demoradas sem tornar o valor do MVP excessivamente exigente. | REQ-VID-LIB-010 |
| **DQ-002** | Uma submissão cancelada ou falhada não pode deixar ficheiros parciais/temporários persistentes. | A integridade do armazenamento não deve depender do sucesso da operação; o alvo é igual no MVP e em produção. | REQ-VID-LIB-013, 014 |
| **DQ-003** | Pedidos de consulta ou processamento de vídeos pertencentes a outro utilizador são recusados em 100% dos casos. | O isolamento entre bibliotecas é uma propriedade de segurança obrigatória e não deve ser relaxada em produção. | REQ-VID-LIB-032, 033 |
| **DQ-004** | No MVP, o resultado da validação é apresentado em até 5 s após o upload; em produção, o alvo é 2 s. | Define um tempo de resposta verificável para a transição entre upload e disponibilidade/erro. | REQ-VID-LIB-040 |
| **DQ-005** | Se a sessão expirar antes da associação válida do vídeo, o vídeo não pode ser disponibilizado. | Evita conteúdos sem proprietário autenticado e mantém a regra de controlo de acesso; o alvo é igual no MVP e em produção. | REQ-VID-LIB-043 |

**Verificações de cobertura**
- [x] Cada requisito funcional e não funcional aparece na matriz.
- [x] Cada requisito tem origem identificada: elemento do caso de uso, regra de negócio ou decisão de qualidade.
- [x] Todos os elementos relevantes do caso de uso têm requisito associado ou justificação para não terem.
- [x] Os tópicos excluídos na secção 4.1.3 estão justificados.
- [x] O impacto no sistema existente está atualizado e ligado aos requisitos relevantes.

---

## ✅ Lista de verificação antes de entregar

- [x] As secções 0 a 3 do dossiê foram preservadas; as assunções, questões em aberto e utilização de IA foram atualizadas.
- [x] A funcionalidade, o caso de uso e o perfil do Exercício 1 foram mantidos.
- [x] Requisitos funcionais estão completos para o âmbito e têm critérios verificáveis.
- [x] Requisitos de qualidade estão classificados e distinguem os alvos MVP e produção.
- [x] Os IDs existentes foram preservados quando a intenção não mudou.
- [x] A análise de completude não alargou o âmbito sem decisão explícita.
- [x] A matriz de rastreabilidade não tem requisitos órfãos nem elementos relevantes por cobrir.
- [x] As decisões de qualidade e os respetivos requisitos estão identificados.
