# 📝 Exercício 1 — Casos de Uso, Requisitos de Sistema e Rastreabilidade
### Fase 1: Suporte a Vídeo no PictuRAS



## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Adicionar um vídeo à biblioteca do utilizador |
| **Perfil(s) de utilizador abrangido(s)** | Utilizador registado e utilizador premium |

### Justificação no contexto do MVP

A existência de uma biblioteca de vídeos constitui uma funcionalidade fundamental para suportar as restantes operações de processamento de vídeo no PictuRAS, uma vez que permite ao utilizador armazenar, consultar e posteriormente selecionar vídeos para processamento.

Esta funcionalidade permite também validar aspetos essenciais do novo suporte a vídeo, nomeadamente o carregamento de ficheiros de maior dimensão, a validação de formatos e codecs, o armazenamento, a associação do vídeo ao respetivo utilizador, o acompanhamento do progresso do carregamento e o tratamento de falhas.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-002 |
| **Nome** | Adicionar um vídeo à biblioteca |
| **Versão** | v1.0 |
| **Autor** | {preencher} |
| **Data** | 2026-10-07 |
| **Objetivo** | Permitir ao utilizador submeter um ficheiro de vídeo e disponibilizá-lo na sua biblioteca para consulta e posterior processamento. |
| **Âmbito** | Módulo de biblioteca, armazenamento e suporte a vídeo do PictuRAS |
| **Ator Principal** | Utilizador registado ou premium |
| **Stakeholders e Interesses** | **Utilizador:** pretende guardar os seus vídeos e utilizá-los posteriormente nas ferramentas do PictuRAS.<br>**Proprietário do sistema:** pretende controlar o armazenamento utilizado e diferenciar os limites dos perfis.<br>**Equipa de desenvolvimento:** pretende disponibilizar uma fonte persistente de vídeos para as restantes funcionalidades do sistema. |
| **Pré-condições** | - O utilizador tem sessão iniciada.<br>- O utilizador possui acesso à funcionalidade de biblioteca de vídeos. |
| **Trigger** | O utilizador abre a biblioteca e seleciona a opção **Adicionar vídeo**. |

---

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a sua biblioteca. | O sistema apresenta os vídeos atualmente disponíveis e a opção **Adicionar vídeo**. |
| 2 | O utilizador seleciona **Adicionar vídeo**. | O sistema apresenta a interface para seleção de um ficheiro. |
| 3 | O utilizador seleciona um ficheiro de vídeo do seu dispositivo. | O sistema identifica o ficheiro e verifica preliminarmente o seu tipo e tamanho. |
| 4 | — | O sistema apresenta o nome e o tamanho do ficheiro antes da submissão. |
| 5 | O utilizador confirma a submissão. | O sistema valida os limites aplicáveis ao perfil do utilizador. |
| 6 | — | O sistema inicia o carregamento (*upload*) do vídeo e apresenta o respetivo progresso. |
| 7 | — | Após concluir o carregamento, o sistema valida o formato, o codec e a integridade do vídeo. |
| 8 | — | O sistema extrai e regista os metadados necessários, incluindo duração, resolução e tamanho. |
| 9 | — | O sistema associa o vídeo ao utilizador que efetuou a submissão e atribui-lhe um identificador único. |
| 10 | — | O sistema armazena o vídeo e altera o seu estado para **Disponível**. |
| 11 | O utilizador consulta a biblioteca. | O sistema apresenta o novo vídeo na biblioteca, juntamente com a informação necessária para o identificar. |

---

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| **FA1 — Cancelar antes do carregamento** | Antes de confirmar a submissão, o utilizador decide cancelar → o sistema regressa à biblioteca sem iniciar o carregamento nem criar qualquer vídeo. |
| **FA2 — Cancelar durante o carregamento** | O utilizador solicita o cancelamento enquanto o ficheiro está a ser transferido → o sistema interrompe o carregamento e elimina os dados parciais recebidos. |
| **FA3 — Alterar o ficheiro selecionado** | Antes da confirmação, o utilizador escolhe outro ficheiro → o sistema substitui a seleção anterior e apresenta as informações do novo ficheiro. |
| **FA4 — Nome de ficheiro já existente** | Já existe na biblioteca um vídeo com o mesmo nome → o sistema permite a submissão, atribuindo ao novo vídeo um identificador distinto e mantendo ambos os ficheiros. |
| **FA5 — Utilizador premium** | O utilizador possui perfil premium → são aplicados os limites de armazenamento e submissão definidos para este perfil. |

---

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| **Formato de vídeo não suportado** | O sistema rejeita o ficheiro e informa o utilizador de que o formato não é suportado. |
| **Codec não suportado** | O sistema não disponibiliza o vídeo na biblioteca e informa o utilizador da incompatibilidade. |
| **Ficheiro corrompido ou ilegível** | O sistema elimina os dados carregados e informa que o vídeo não pôde ser validado. |
| **Tamanho máximo excedido** | O sistema impede a submissão e informa o utilizador do limite correspondente ao seu perfil. |
| **Duração máxima excedida** | O vídeo não é adicionado à biblioteca e o sistema apresenta o limite aplicável ao perfil. |
| **Limite de armazenamento do perfil atingido** | O sistema impede a submissão e informa o utilizador de que não possui espaço disponível suficiente. |
| **Falha de ligação durante o carregamento** | O sistema altera o estado do carregamento para **Falhou**, elimina os dados parciais e não disponibiliza um vídeo incompleto na biblioteca. |
| **Falha de armazenamento** | O sistema informa o utilizador de que não foi possível concluir a submissão e elimina os dados parciais associados. |
| **Sessão expirada durante a operação** | O sistema não disponibiliza o vídeo na biblioteca até que seja garantida a associação a um utilizador autenticado. |

---

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| **Garantia de Sucesso** | O vídeo encontra-se integralmente armazenado, associado ao utilizador, com identificador único, metadados registados e disponível na respetiva biblioteca para consulta e posterior processamento. |
| **Garantia Mínima** | Em caso de falha ou cancelamento, nenhum ficheiro incompleto é apresentado como vídeo disponível e os dados parciais associados ao carregamento são eliminados. |

---

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| **RN1** | Apenas utilizadores registados e premium possuem uma biblioteca pessoal de vídeos no MVP. |
| **RN2** | Cada vídeo armazenado deve estar associado exatamente ao utilizador que efetuou a submissão. |
| **RN3** | Um utilizador apenas pode visualizar e utilizar os vídeos pertencentes à sua própria biblioteca. |
| **RN4** | No MVP, o formato garantidamente suportado é MP4 com vídeo H.264 e áudio AAC. |
| **RN5** | O sistema deve validar o vídeo antes de o marcar como **Disponível**. |
| **RN6** | Um vídeo incompleto, corrompido ou cuja validação tenha falhado não pode ser apresentado como disponível. |
| **RN7** | A submissão de um vídeo para a biblioteca não é contabilizada como uma das cinco operações diárias de processamento do utilizador registado. |
| **RN8** | O processamento posterior do vídeo é contabilizado separadamente de acordo com a operação utilizada. |
| **RN9** | Cada vídeo deve possuir um identificador único, independentemente do nome do ficheiro. |
| **RN10** | A informação de progresso do carregamento deve ser atualizada pelo menos uma vez a cada 2 segundos enquanto existir transferência de dados. |
| **RN11** | Após a conclusão do carregamento, o sistema deve apresentar ao utilizador o resultado da validação em até 5 segundos para vídeos dentro dos limites definidos para o MVP. |
| **RN12** | Os limites máximos de tamanho, duração e armazenamento variam consoante o perfil e devem ser definidos antes da implementação final. |

---

### 2.7 Assunções

| **ID** | **Assunção** | **Impacto se for falsa** |
|--------|--------------|--------------------------|
| **A1** | Cada utilizador registado ou premium possui uma biblioteca pessoal de vídeos. | Será necessário definir um mecanismo diferente de organização e propriedade dos vídeos. |
| **A2** | O perfil anónimo não possui armazenamento persistente de vídeos. | Será necessário criar regras de armazenamento temporário e eliminação automática. |
| **A3** | MP4/H.264/AAC será a combinação de formato e codecs inicialmente suportada. | Os requisitos de compatibilidade e os respetivos testes terão de ser alterados. |
| **A4** | O armazenamento de vídeos está sujeito a limites diferentes consoante o perfil. | Deixará de ser necessária parte da validação associada à capacidade de armazenamento. |
| **A5** | Carregar um vídeo não é considerado uma operação de processamento para efeitos da quota diária. | A quota existente terá de ser alterada sempre que ocorrer uma submissão. |
| **A6** | O sistema consegue determinar tamanho, duração, resolução e codecs após a submissão do vídeo. | Será necessário rever os metadados apresentados e as validações efetuadas. |

---

### 2.8 Questões em Aberto

| **ID** | **Questão em aberto** | **Quem decide / quando** |
|--------|-----------------------|--------------------------|
| **Q1** | Qual é o tamanho máximo permitido para cada vídeo nos perfis registado e premium? | Equipa, antes da implementação da funcionalidade de upload e validação de vídeos |
| **Q2** | Qual é a duração máxima permitida para cada perfil? | Equipa, antes da implementação das regras de validação dos vídeos. |
| **Q3** | Qual é o espaço total de armazenamento disponibilizado a cada perfil? | Equipa de infraestrutura, antes da implementação do armazenamento persistente de vídeos. |
| **Q4** | Devem ser suportados formatos adicionais, como MOV ou WebM? | Equipa, antes da implementação da validação de formatos e codecs. |
| **Q5** | O perfil anónimo deve poder carregar vídeos para armazenamento temporário? | Product Owner, antes da implementação das regras de acesso e dos limites associados aos perfis. |
| **Q6** | Durante quanto tempo deve um vídeo permanecer armazenado na biblioteca? | Product Owner e equipa de infraestrutura, antes da implementação da política de retenção e eliminação de vídeos. |
| **Q7** | O sistema deve permitir ao utilizador eliminar manualmente vídeos da biblioteca? | Product Owner, antes da implementação das operações de gestão da biblioteca. |
| **Q8** | Deve existir recuperação automática de um carregamento interrompido ou o utilizador terá de reiniciar a submissão? | Equipa de arquitetura, antes da implementação do mecanismo de upload e recuperação de falhas. |

---

## 3. Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| **REQ-VID-LIB-001** | O sistema deve permitir ao utilizador registado ou premium aceder à sua biblioteca de vídeos. | F | Deve ter | NOVO | RN1, Passo 1 | Iniciar sessão com cada um dos perfis e verificar que a biblioteca é acessível. |
| **REQ-VID-LIB-002** | O sistema deve apresentar ao utilizador os vídeos disponíveis na sua biblioteca. | F | Deve ter | NOVO | Passo 1 | Aceder a uma conta com vídeos previamente armazenados e verificar que estes são apresentados. |
| **REQ-VID-LIB-003** | O sistema deve disponibilizar na biblioteca a opção **Adicionar vídeo**. | F | Deve ter | NOVO | Passos 1–2 | Abrir a biblioteca e verificar a existência da opção. |
| **REQ-VID-LIB-004** | O sistema deve permitir ao utilizador selecionar um ficheiro de vídeo do seu dispositivo. | F | Deve ter | NOVO | Passo 3 | Selecionar um ficheiro de vídeo e verificar que fica preparado para submissão. |
| **REQ-VID-LIB-005** | O sistema deve apresentar o nome do ficheiro selecionado antes do início do carregamento. | F | Deve ter | NOVO | Passo 4 | Selecionar um vídeo conhecido e comparar o nome apresentado. |
| **REQ-VID-LIB-006** | O sistema deve apresentar o tamanho do ficheiro selecionado antes do início do carregamento. | F | Deve ter | NOVO | Passo 4 | Selecionar um vídeo de tamanho conhecido e comparar o valor apresentado. |
| **REQ-VID-LIB-007** | O sistema deve permitir ao utilizador confirmar a submissão do vídeo selecionado. | F | Deve ter | NOVO | Passo 5 | Selecionar um ficheiro e verificar que é possível confirmar a submissão. |
| **REQ-VID-LIB-008** | O sistema deve realizar o carregamento (*upload*) do ficheiro de vídeo selecionado após a confirmação do utilizador. | F | Deve ter | NOVO | Passos 5–6 | Selecionar um vídeo válido, confirmar e verificar que o ficheiro é transferido para o sistema. |
| **REQ-VID-LIB-009** | O sistema deve apresentar o progresso do carregamento enquanto o ficheiro está a ser transferido. | F | Deve ter | NOVO | Passo 6 | Iniciar um carregamento suficientemente longo e verificar que o progresso é apresentado. |
| **REQ-VID-LIB-010** | O sistema deve atualizar a informação de progresso do carregamento pelo menos uma vez a cada 2 segundos enquanto existir transferência de dados. | NF — Usabilidade | Deveria ter | NOVO | RN10 | Medir os intervalos entre as atualizações durante um carregamento superior a 4 segundos. |
| **REQ-VID-LIB-011** | O sistema deve permitir ao utilizador cancelar a submissão antes de iniciar o carregamento. | F | Deveria ter | NOVO | FA1 | Selecionar um ficheiro, cancelar antes da confirmação e verificar que nenhum carregamento começa. |
| **REQ-VID-LIB-012** | O sistema deve permitir ao utilizador cancelar um carregamento em curso. | F | Deveria ter | NOVO | FA2 | Iniciar um upload, cancelá-lo e verificar que a transferência é interrompida. |
| **REQ-VID-LIB-013** | O sistema deve eliminar os dados parciais de um carregamento cancelado. | NF — Fiabilidade | Deve ter | NOVO | FA2, Garantia mínima | Cancelar um upload e verificar que não permanece um ficheiro incompleto. |
| **REQ-VID-LIB-014** | O sistema deve eliminar os dados parciais de um carregamento que termine com falha. | NF — Fiabilidade | Deve ter | NOVO | Exceção — falha de ligação, Garantia mínima | Interromper deliberadamente a transferência e verificar a inexistência de resultado parcial. |
| **REQ-VID-LIB-015** | O sistema deve rejeitar ficheiros cujo tamanho exceda o limite definido para o perfil do utilizador. | NF — Capacidade/Restrição | Deve ter | NOVO | RN12, Exceção — tamanho excedido | Submeter um ficheiro dentro e outro acima do limite definido e verificar aceitação/rejeição. |
| **REQ-VID-LIB-016** | O sistema deve rejeitar vídeos cuja duração exceda o limite definido para o perfil do utilizador. | NF — Capacidade/Restrição | Deve ter | NOVO | RN12, Exceção — duração excedida | Submeter vídeos dentro e fora do limite definido. |
| **REQ-VID-LIB-017** | O sistema deve impedir uma nova submissão quando o limite de armazenamento do perfil estiver esgotado. | NF — Capacidade/Restrição | Deve ter | NOVO | Exceção — armazenamento esgotado | Preencher o armazenamento disponível e tentar carregar outro vídeo. |
| **REQ-VID-LIB-018** | O sistema deve validar o formato do vídeo após a conclusão do carregamento e antes de o disponibilizar na biblioteca. | F | Deve ter | NOVO | Passo 7, RN4, RN5 | Submeter um formato suportado e outro não suportado e verificar o resultado. |
| **REQ-VID-LIB-019** | O sistema deve validar o codec de vídeo antes de disponibilizar o ficheiro na biblioteca. | F | Deve ter | NOVO | Passo 7, RN4 | Submeter vídeos com codecs suportados e não suportados. |
| **REQ-VID-LIB-020** | O sistema deve verificar se o ficheiro de vídeo carregado é legível e não se encontra corrompido. | F | Deve ter | NOVO | Passo 7, Exceção — vídeo corrompido | Submeter um ficheiro corrompido e verificar a rejeição. |
| **REQ-VID-LIB-021** | O sistema deve impedir que um vídeo cuja validação falhou adquira o estado **Disponível**. | NF — Integridade | Deve ter | NOVO | RN5, RN6 | Forçar uma falha de validação e verificar que o vídeo não aparece como disponível. |
| **REQ-VID-LIB-022** | O sistema deve registar a duração do vídeo validado. | F | Deve ter | NOVO | Passo 8 | Submeter um vídeo de duração conhecida e comparar o valor registado. |
| **REQ-VID-LIB-023** | O sistema deve registar a resolução do vídeo validado. | F | Deve ter | NOVO | Passo 8 | Submeter um vídeo de resolução conhecida e comparar o valor registado. |
| **REQ-VID-LIB-024** | O sistema deve registar o tamanho do vídeo validado. | F | Deve ter | NOVO | Passo 8 | Submeter um vídeo de tamanho conhecido e comparar o valor registado. |
| **REQ-VID-LIB-025** | O sistema deve associar o vídeo carregado ao utilizador autenticado que realizou a submissão. | F | Deve ter | NOVO | Passo 9, RN2 | Submeter um vídeo e verificar que pertence à conta utilizada. |
| **REQ-VID-LIB-026** | O sistema deve atribuir um identificador único a cada vídeo armazenado. | NF — Integridade | Deve ter | NOVO | Passo 9, RN9 | Carregar vários vídeos e verificar que nenhum recebe o mesmo identificador. |
| **REQ-VID-LIB-027** | O sistema deve permitir armazenar dois vídeos com o mesmo nome desde que possuam identificadores diferentes. | F | Deveria ter | NOVO | FA4, RN9 | Submeter duas vezes ficheiros com o mesmo nome e verificar que ambos permanecem disponíveis. |
| **REQ-VID-LIB-028** | O sistema deve armazenar o vídeo após a conclusão bem-sucedida do carregamento e da validação. | F | Deve ter | NOVO | Passo 10, Garantia de sucesso | Submeter um vídeo válido e verificar que permanece armazenado após terminar a sessão e voltar a entrar. |
| **REQ-VID-LIB-029** | O sistema deve atribuir o estado **Disponível** ao vídeo apenas depois de o carregamento, validação e armazenamento terminarem com sucesso. | F | Deve ter | NOVO | Passo 10, RN5, RN6 | Acompanhar a submissão e verificar que o estado só muda para **Disponível** no final. |
| **REQ-VID-LIB-030** | O sistema deve apresentar na biblioteca um vídeo que tenha atingido o estado **Disponível**. | F | Deve ter | NOVO | Passo 11 | Concluir uma submissão válida e verificar que o vídeo aparece na biblioteca. |
| **REQ-VID-LIB-031** | O sistema deve permitir ao utilizador consultar os metadados do vídeo disponíveis na biblioteca. | F | Deveria ter | NOVO | Passos 8 e 11 | Abrir um vídeo armazenado e verificar a apresentação dos metadados registados. |
| **REQ-VID-LIB-032** | O sistema deve impedir um utilizador de consultar vídeos pertencentes à biblioteca de outro utilizador. | NF — Segurança | Deve ter | ALT | RN3 | Tentar aceder ao identificador de um vídeo de outra conta e verificar que o acesso é recusado. |
| **REQ-VID-LIB-033** | O sistema deve impedir um utilizador de utilizar para processamento um vídeo pertencente a outro utilizador. | NF — Segurança | Deve ter | ALT | RN3 | Tentar iniciar uma operação sobre um vídeo de outra conta e verificar a recusa. |
| **REQ-VID-LIB-034** | O sistema não deve contabilizar o carregamento de um vídeo como uma operação da quota diária de processamento do utilizador registado. | F | Deve ter | ALT | RN7 | Verificar a quota antes e depois de um upload e confirmar que não se altera. |
| **REQ-VID-LIB-035** | O sistema deve informar o utilizador quando uma submissão for rejeitada por formato não suportado. | F | Deve ter | NOVO | Exceção — formato | Submeter formato inválido e verificar a apresentação da informação correspondente. |
| **REQ-VID-LIB-036** | O sistema deve informar o utilizador quando uma submissão for rejeitada por codec não suportado. | F | Deve ter | NOVO | Exceção — codec | Submeter codec inválido e verificar a mensagem apresentada. |
| **REQ-VID-LIB-037** | O sistema deve informar o utilizador quando o vídeo exceder os limites aplicáveis ao seu perfil. | F | Deve ter | NOVO | Exceções — tamanho/duração | Ultrapassar um dos limites e verificar que o motivo da rejeição é apresentado. |
| **REQ-VID-LIB-038** | O sistema deve informar o utilizador quando não existir espaço de armazenamento suficiente para adicionar o vídeo. | F | Deve ter | NOVO | Exceção — armazenamento | Simular armazenamento esgotado e verificar a informação apresentada. |
| **REQ-VID-LIB-039** | O sistema deve informar o utilizador quando ocorrer uma falha durante o carregamento. | F | Deve ter | NOVO | Exceção — falha de ligação | Interromper a ligação durante o upload e verificar a apresentação da falha. |
| **REQ-VID-LIB-040** | O sistema deve apresentar o resultado da validação do vídeo em até 5 segundos após a conclusão do carregamento, para vídeos dentro dos limites definidos para o MVP. | NF — Desempenho | Deveria ter | NOVO | RN11 | Medir o tempo entre o final do upload e a apresentação do resultado da validação. |

---

## 4. Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|------------------------------|
| **Armazenamento** | Estender | O sistema passa a armazenar ficheiros de vídeo, potencialmente muito maiores do que as imagens atualmente processadas. | REQ-VID-LIB-013, 014, 015, 016, 017, 028 |
| **Biblioteca / gestão de conteúdos** | Estender | O sistema passa a disponibilizar uma biblioteca persistente de vídeos associada a cada utilizador elegível. | REQ-VID-LIB-001, 002, 025, 030, 031 |
| **Perfis de utilização** | Estender | Os perfis registado e premium passam a possuir biblioteca de vídeos, com possibilidade de limites diferentes. | REQ-VID-LIB-001, 015, 016, 017 |
| **Quota de 5 operações/dia** | Manter | O carregamento de um vídeo não é considerado uma operação de processamento e, por isso, não reduz a quota diária existente. | REQ-VID-LIB-034 |
| **Autenticação e autorização** | Estender | O controlo de acesso existente passa também a proteger os vídeos armazenados e impedir acesso/processamento por outros utilizadores. | REQ-VID-LIB-025, 032, 033 |
| **Validação de ficheiros** | Estender | O sistema passa a validar formato, codec, integridade, tamanho e duração dos ficheiros de vídeo. | REQ-VID-LIB-015, 016, 018, 019, 020 |
| **Interface do utilizador** | Estender | A interface passa a incluir opção de upload, progresso do carregamento, mensagens de erro, metadados e estado do vídeo. | REQ-VID-LIB-003, 005, 006, 009, 010, 031, 035, 036, 037, 038, 039 |
| **Ferramentas de processamento** | Estender | Os vídeos armazenados na biblioteca passam a poder ser selecionados como entrada para as funcionalidades de processamento de vídeo. | REQ-VID-LIB-030, 033 |

---

## 5. Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
| **Passo 1** | Abrir e apresentar biblioteca | REQ-VID-LIB-001, REQ-VID-LIB-002, REQ-VID-LIB-003 |
| **Passo 2** | Escolher Adicionar vídeo | REQ-VID-LIB-003 |
| **Passo 3** | Selecionar ficheiro | REQ-VID-LIB-004 |
| **Passo 4** | Apresentar nome e tamanho | REQ-VID-LIB-005, REQ-VID-LIB-006 |
| **Passo 5** | Confirmar submissão e validar limites | REQ-VID-LIB-007, REQ-VID-LIB-015, REQ-VID-LIB-016, REQ-VID-LIB-017 |
| **Passo 6** | Fazer upload e apresentar progresso | REQ-VID-LIB-008, REQ-VID-LIB-009, REQ-VID-LIB-010 |
| **Passo 7** | Validar formato, codec e integridade | REQ-VID-LIB-018, REQ-VID-LIB-019, REQ-VID-LIB-020, REQ-VID-LIB-021, REQ-VID-LIB-040 |
| **Passo 8** | Registar metadados | REQ-VID-LIB-022, REQ-VID-LIB-023, REQ-VID-LIB-024 |
| **Passo 9** | Associar utilizador e atribuir ID | REQ-VID-LIB-025, REQ-VID-LIB-026 |
| **Passo 10** | Armazenar e marcar como Disponível | REQ-VID-LIB-028, REQ-VID-LIB-029 |
| **Passo 11** | Apresentar vídeo e metadados na biblioteca | REQ-VID-LIB-030, REQ-VID-LIB-031 |
| **FA1** | Cancelar antes do upload | REQ-VID-LIB-011 |
| **FA2** | Cancelar upload | REQ-VID-LIB-012, REQ-VID-LIB-013 |
| **FA3** | Alterar ficheiro selecionado | REQ-VID-LIB-004, REQ-VID-LIB-005, REQ-VID-LIB-006 |
| **FA4** | Nome duplicado | REQ-VID-LIB-026, REQ-VID-LIB-027 |
| **FA5** | Perfil premium | REQ-VID-LIB-015, REQ-VID-LIB-016, REQ-VID-LIB-017 |
| **Exceção — formato não suportado** | Rejeitar e informar | REQ-VID-LIB-018, REQ-VID-LIB-035 |
| **Exceção — codec não suportado** | Rejeitar e informar | REQ-VID-LIB-019, REQ-VID-LIB-036 |
| **Exceção — vídeo corrompido** | Rejeitar vídeo inválido | REQ-VID-LIB-020, REQ-VID-LIB-021 |
| **Exceção — tamanho excedido** | Rejeitar por limite | REQ-VID-LIB-015, REQ-VID-LIB-037 |
| **Exceção — duração excedida** | Rejeitar por limite | REQ-VID-LIB-016, REQ-VID-LIB-037 |
| **Exceção — armazenamento esgotado** | Impedir submissão | REQ-VID-LIB-017, REQ-VID-LIB-038 |
| **Exceção — falha de ligação** | Eliminar parcial e informar | REQ-VID-LIB-014, REQ-VID-LIB-039 |
| **Exceção — falha de armazenamento** | Não disponibilizar ficheiro incompleto | REQ-VID-LIB-014, REQ-VID-LIB-021 |
| **RN1** | Biblioteca para registado/premium | REQ-VID-LIB-001 |
| **RN2** | Associar vídeo ao proprietário | REQ-VID-LIB-025 |
| **RN3** | Restringir acesso ao proprietário | REQ-VID-LIB-032, REQ-VID-LIB-033 |
| **RN4** | Formato e codecs suportados | REQ-VID-LIB-018, REQ-VID-LIB-019 |
| **RN5** | Validar antes de Disponível | REQ-VID-LIB-021, REQ-VID-LIB-029 |
| **RN6** | Não apresentar vídeos inválidos | REQ-VID-LIB-021, REQ-VID-LIB-030 |
| **RN7** | Upload não consome quota | REQ-VID-LIB-034 |
| **RN8** | Processamento posterior separado | REQ-VID-LIB-034 |
| **RN9** | Identificador único | REQ-VID-LIB-026, REQ-VID-LIB-027 |
| **RN10** | Atualização de progresso ≤ 2 s | REQ-VID-LIB-010 |
| **RN11** | Resultado da validação ≤ 5 s | REQ-VID-LIB-040 |
| **RN12** | Limites por perfil | REQ-VID-LIB-015, REQ-VID-LIB-016, REQ-VID-LIB-017 |
| **Garantia de Sucesso** | Vídeo armazenado e disponível | REQ-VID-LIB-025, REQ-VID-LIB-026, REQ-VID-LIB-028, REQ-VID-LIB-029, REQ-VID-LIB-030 |
| **Garantia Mínima** | Não manter ficheiros incompletos | REQ-VID-LIB-013, REQ-VID-LIB-014, REQ-VID-LIB-021 |

---

## 6. Assunções e Questões em Aberto

### Assunções

| **ID** | **Assunção** | **Impacto se for falsa** |
|--------|--------------|--------------------------|
| **A1** | Cada utilizador registado ou premium possui uma biblioteca pessoal de vídeos. | Será necessário definir um mecanismo diferente de organização e propriedade dos vídeos. |
| **A2** | O perfil anónimo não possui armazenamento persistente de vídeos. | Será necessário criar regras de armazenamento temporário e eliminação automática. |
| **A3** | MP4/H.264/AAC será a combinação de formato e codecs inicialmente suportada. | Os requisitos de compatibilidade e os respetivos testes terão de ser alterados. |
| **A4** | O armazenamento de vídeos está sujeito a limites diferentes consoante o perfil. | Deixará de ser necessária parte da validação associada à capacidade de armazenamento. |
| **A5** | Carregar um vídeo não é considerado uma operação de processamento para efeitos da quota diária. | A quota existente terá de ser alterada sempre que ocorrer uma submissão. |
| **A6** | O sistema consegue determinar tamanho, duração, resolução e codecs após a submissão do vídeo. | Será necessário rever os metadados apresentados e as validações efetuadas. |

### Questões em Aberto

| **ID** | **Questão em aberto** | **Quem decide / quando** |
|--------|-----------------------|--------------------------|
| **Q1** | Qual é o tamanho máximo permitido para cada vídeo nos perfis registado e premium? | Product Owner/equipa, antes do refinamento final. |
| **Q2** | Qual é a duração máxima permitida para cada perfil? | Product Owner/equipa. |
| **Q3** | Qual é o espaço total de armazenamento disponibilizado a cada perfil? | Product Owner/equipa de infraestrutura. |
| **Q4** | Devem ser suportados formatos adicionais, como MOV ou WebM? | Equipa/Product Owner. |
| **Q5** | O perfil anónimo deve poder carregar vídeos para armazenamento temporário? | Product Owner. |
| **Q6** | Durante quanto tempo deve um vídeo permanecer armazenado na biblioteca? | Product Owner/equipa de infraestrutura. |
| **Q7** | O sistema deve permitir ao utilizador eliminar manualmente vídeos da biblioteca? | Product Owner. |
| **Q8** | Deve existir recuperação automática de um carregamento interrompido ou o utilizador terá de reiniciar a submissão? | Equipa de arquitetura. |

---

## 7. Utilização de agentes de IA

| **Ferramenta / skill** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| **ChatGPT** | Apoio na estruturação do caso de uso da biblioteca de vídeos, identificação dos fluxos principal e alternativos, exceções, regras de negócio, derivação inicial dos requisitos, análise do impacto no sistema existente e construção da matriz de rastreabilidade. | O conteúdo foi revisto pela equipa tendo como referência o enunciado, o template, o exemplo de caso de uso fornecido pelo docente e o guia de derivação de requisitos. As decisões não determinadas explicitamente pelo enunciado foram registadas como assunções ou questões em aberto para posterior validação. |

