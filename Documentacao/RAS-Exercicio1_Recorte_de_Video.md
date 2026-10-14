# 📝 Exercício 1 e 2 — Recortar um Intervalo Temporal de um Vídeo
### Casos de Uso e Especificação de Requisitos do Sistema · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | Grupo 7 |
| **Autores** | Francisco Dias (PG63958); Rodrigo Rocha (PG65437); Rodrigo Fernandes (PG64026); Luís Miguel (PG65424); Joaquim da Cunha (PG63986) |
| **Data** | 2026-10-14 |
| **Versão do documento** | v1.2 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Recorte temporal de vídeo |
| **Perfil(s) de utilizador abrangido(s)** | **Utilizador registado**. É o perfil em que o recorte tem de respeitar o mecanismo de operações limitadas já existente (5 operações por dia). O perfil Anónimo, por causa das suas operações limitadas, fica fora do âmbito. O perfil Premium segue o mesmo fluxo do que o Registado, mas sem o limite diário. |

**Justificação no contexto do MVP**

O recorte temporal de vídeo é uma operação que se espera que esteja implementada em qualquer software de edição de vídeo. Permite ao utilizador obter só a parte do vídeo que lhe interessa, num ficheiro mais pequeno, o que acrescenta bastante valor à experiência do utilizador. Sem esta funcionalidade, ficaria por validar o processamento demorado de vídeo (fila, estados, progresso, cancelamento) e a sua articulação com as quotas e a biblioteca, que as restantes funcionalidades de vídeo vão reutilizar.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Recortar um Intervalo Temporal de um Vídeo |
| **Versão** | v1.2 |
| **Autor** | Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Joaquim da Cunha |
| **Data** | 2026-10-14 |
| **Objetivo** | Permite ao utilizador obter um recorte de um vídeo correspondente a um intervalo temporal de um vídeo na sua biblioteca. |
| **Âmbito** | Módulo de vídeo do PictuRAS — ferramenta básica |
| **Ator Principal** | Utilizador Registado |
| **Stakeholders e Interesses** | - **Utilizador**: quer obter a parte do vídeo que lhe interessa<br>- **Proprietário do Sistema**: pretende controlar o custo de processamento e armazenamento do nível gratuito e incentivar a subscrição premium<br>- **Equipa de Desenvolvimento**: valida a cadeia de processamento assíncrono de vídeo |
| **Pré-condições** | - O utilizador tem sessão iniciada<br>- O vídeo já foi submetido com sucesso e está disponível na biblioteca do utilizador |
| **Trigger** | O utilizador seleciona um vídeo e escolhe a opção **Recortar** |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a sua biblioteca de vídeos. | Apresenta a lista de vídeos do utilizador e o número de operações restantes no dia. |
| 2 | O utilizador seleciona um vídeo e escolhe **Recortar**. | Verifica que o formato de vídeo é suportado e que não há outro recorte em curso. |
| 3 | — | Abre o ecrã de recorte com reprodutor e duração total do vídeo. |
| 4 | O utilizador define o instante inicial e final do intervalo que quer recortar. | Valida se o intervalo é válido e mostra a duração do vídeo resultante. |
| 5 | O utilizador escolhe o formato de saída (MP4 ou MOV, por omissão é o original) e, opcionalmente, o nome do novo vídeo. | Mostra o resumo do pedido (vídeo de origem, intervalo, duração resultante, formato e nome). |
| 6 | O utilizador confirma com **Iniciar Recorte**. | — |
| 7 | — | Valida a quota diária, reserva 1 operação e regista o pedido. |
| 8 | — | Coloca o pedido em fila (estado **Em fila**) e retorna o utilizador para a sua biblioteca. |
| 9 | — | Ao iniciar o processamento, passa o estado para **A processar** e apresenta o progresso (%). |
| 10 | O utilizador consulta o estado do pedido se quiser. | Apresenta o estado atual e o progresso. |
| 11 | — | Ao terminar, guarda o resultado como novo vídeo na biblioteca, passa o estado para **Concluído** e consome a operação reservada. |
| 12 | — | Notifica o utilizador que o recorte está concluído. |
| 13 | O utilizador abre o vídeo recortado e pode descarregar. | Reproduz o resultado e disponibiliza o descarregamento. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Intervalo igual à duração total | No passo 4, o utilizador abrange o vídeo inteiro → O sistema avisa que o resultado seria uma cópia do original e pede confirmação. Se o utilizador recusar, regressa ao passo 4. |
| FA2 – Cancelar o pedido | O utilizador escolhe **Cancelar**, enquanto o estado for **Em fila** ou **A processar** → O sistema pede confirmação, interrompe o processo, descarta qualquer resultado obtido até ao momento, devolve a operação à quota, passa o estado para **Cancelado** e regressa à biblioteca. |
| FA3 – Utilizador sai durante o processo | O utilizador fecha a aplicação ou termina a sessão após o passo 6 → O processamento continua. Quando o utilizador regressa, o sistema apresenta uma notificação de conclusão (ou de falha) e o estado atualizado do pedido. |

### 2.4 Exceções

| **ID** | **Condição** | **Comportamento do Sistema** |
|--------|--------------|------------------------------|
| E1 | Formato ou codec do vídeo de origem não suportado. | Apresenta "Este formato de vídeo não é suportado para recorte", indica os formatos aceites e não abre o ecrã de recorte. Não consome quota. |
| E2 | Intervalo inválido: início >= fim, fim superior à duração do vídeo ou duração do intervalo fora dos limites. | Assinala o erro, indica o motivo e o limite violado e mantém o botão **Iniciar Recorte** desativado. |
| E3 | Quota diária esgotada. | Apresenta "Atingiu o limite de operações diárias", indica a hora a que a quota é reposta e sugere o perfil Premium. Não cria o pedido. |
| E4 | Já existe um recorte do utilizador **Em fila** ou **A processar**. | Apresenta "Já existe um recorte em curso. Aguarde a conclusão" e recusa o pedido. |
| E5 | Falha a meio do processamento (erro do codificador, ficheiro corrompido, falta de recursos...). | Tenta automaticamente uma segunda vez. Se voltar a falhar, passa o estado para **Falhou**, devolve a operação à quota e notifica o utilizador: "Não foi possível concluir o recorte. Tente novamente". |
| E6 | O utilizador tenta eliminar o vídeo de origem enquanto o recorte está **Em fila** ou **A processar**. | Impede a eliminação e informa que o vídeo está a ser utilizado numa operação. A eliminação só é possível depois de o estado passar para **Concluído**, **Falhou** ou **Cancelado**. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | A biblioteca contém um novo vídeo, independente do original, com a duração do intervalo pedido (dentro da tolerância definida), no formato escolhido. O vídeo original mantém-se inalterado. O pedido tem o estado **Concluído**. A operação foi definitivamente contabilizada na quota diária e o utilizador foi notificado. |
| Garantia Mínima | O vídeo original mantém-se inalterado. Não permanece nenhum ficheiro parcial. A operação reservada é devolvida à quota. O pedido fica com o estado **Falhou** ou **Cancelado**. O utilizador é notificado do que aconteceu. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | Os formatos aceites como entrada e como saída do recorte são MP4 e MOV, com codec de vídeo H.264. |
| RN2 | O intervalo selecionado é definido com precisão de 1 segundo, tem duração mínima de 1 segundo e máxima do tempo total do vídeo original. O instante inicial tem de ser anterior ao instante final e o instante do fim não pode exceder a duração do vídeo. |
| RN3 | Cada pedido de recorte conta como 1 operação do limite diário do perfil **Registado**, independentemente da duração do intervalo. A operação é reservada ao submeter o pedido, consumida definitivamente apenas quando o recorte é concluído com sucesso e devolvida se o pedido falhar ou for cancelado. |
| RN4 | Um utilizador **Registado** só pode ter 1 recorte **Em fila** ou **A processar** em simultâneo. |
| RN5 | O vídeo original nunca é alterado. O resultado é sempre guardado como um novo vídeo independente da biblioteca. O nome por omissão é `{nome_original}_recorte_{início}-{fim}`, com os instantes em segundos. O recorte preserva a resolução e a taxa de fotogramas do original, com diferença máxima de 1 segundo face à duração do intervalo pedido no MVP. |
| RN6 | O pedido percorre os estados **Em fila** → **A processar** → **Concluído**, podendo terminar em **Falhou** ou **Cancelado**. O cancelamento só é permitido nos estados **Em fila** e **A processar**. |
| RN7 | A falha a meio do processamento leva a uma nova tentativa automática antes de o pedido ser marcado como **Falhou**. |
| RN8 | Enquanto o pedido estiver no estado **A processar**, o sistema atualiza o progresso apresentado pelo menos de 5 em 5 segundos. |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O vídeo de origem está armazenado e acessível ao serviço no momento do pedido e já foi validado durante o carregamento. |
| A2 | O processamento é assíncrono e o tempo de conclusão depende da duração do intervalo e da carga do sistema. |
| A3 | A notificação de conclusão ou de falha é feita apenas dentro da aplicação. |
| A4 | Cada pedido corta um único intervalo de um único vídeo. |
| A5 | O vídeo recortado fica guardado como um vídeo comum na biblioteca. |
| A6 | O sistema processa em paralelo pedidos de utilizadores diferentes, até um limite de capacidade definido na arquitetura; quando esse limite é atingido, os pedidos aguardam no estado **Em fila**. |
| A7 | Valores adotados pela equipa para o MVP: codec H.264, precisão de entrada de 1 s, tolerância de ± 1 s na duração do vídeo resultante e atualização de progresso de 5 em 5 s. |
| A8 | Os alvos quantitativos e qualitativos de desempenho, fiabilidade, segurança, compatibilidade, manutenibilidade e portabilidade (distinguindo MVP e Produção) seguem as decisões de qualidade `DQ-001` a `DQ-005` registadas na secção 4.3. |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | Que limites e que prioridade na fila deve ter o perfil **Premium**? |
| Q2 | O perfil **Anónimo** deve ter acesso a esta funcionalidade? Se sim, como se articula com o facto de não ter biblioteca persistente? |
| Q3 | Que limites máximos de duração e de dimensão de ficheiro (MB) devem ser impostos por perfil no momento de submissão/carregamento do vídeo? |
| Q4 | Por quanto tempo devem ser conservados os vídeos recortados e o histórico de pedidos falhados ou cancelados? |
| Q5 | Deve permitir-se ao utilizador pré-visualizar o recorte no reprodutor durante o passo 4 antes de confirmar? |
| Q6 | Qual é o limite de espaço de armazenamento na biblioteca por perfil de utilizador e como afeta a criação de novos recortes? |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| Claude | Sugestão de Exceções (Exercício 1) | Revisão manual pela equipa e adaptação ao domínio do PictuRAS. |
| Claude | Sugestão de Regras de Negócio e Assunções (Exercício 1) | Revisão manual; a equipa selecionou e refinou as regras adequadas a esta ferramenta (RN3, RN5 e A6). |
| Gemini | definição de alvos MVP vs. Produção e decisões de qualidade (DQ-001 a DQ-005) | Revisão manual pela equipa de todos os requisitos, alvos mensuráveis, justificações, análise de completude e matriz de rastreabilidade. |

**Grupo / Equipa:** Grupo {nº do grupo} — Francisco Dias (PG63958), Rodrigo Rocha (PG65437), Rodrigo Fernandes (PG64026), Luís Miguel (PG65424), Joaquim da Cunha (PG63986).  
**Declaração de validação:** A equipa revê, compreende e assume integral responsabilidade pelo conteúdo deste dossiê.

---

## ✅ Lista de verificação antes de entregar (Exercício 1)

- [x] Secções 0 a 3 preenchidas e texto de ajuda (`>` e `{…}`) removido.
- [x] Funcionalidade de vídeo escolhida **e justificada** no contexto do MVP.
- [x] Ator principal identificado, com o respetivo perfil.
- [x] Caso de uso com fluxo principal, **≥1 fluxo alternativo** e **≥1 exceção específica de vídeo**.
- [x] Pós-condições com garantia de sucesso **e** garantia mínima.
- [x] Regras de negócio e restrições preenchidas.
- [x] Assunções e questões em aberto registadas.
- [x] Utilização de agentes de IA documentada.

---

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** UC-VID-001 — Recortar um Intervalo Temporal de um Vídeo  
**Versão do dossiê:** v1.2  
**Baseline do Exercício 1:** v1.1 (REQ-VID-TRIM-001 a REQ-VID-TRIM-056)

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
|--------|---------------|----------------|--------------|--------------|--------------------------------|-----------------|----------------------------------------|
| REQ-VID-TRIM-001 | O sistema deve apresentar, na biblioteca do utilizador registado, a lista dos seus vídeos. | Deve ter | Mantido | ALT | UC-VID-001, Passo 1 | Permite ao utilizador visualizar e selecionar os vídeos disponíveis para iniciar operações sobre eles. | Dado um utilizador com 3 vídeos, quando abre a biblioteca, então vê os 3 vídeos listados. |
| REQ-VID-TRIM-002 | O sistema deve apresentar, na biblioteca, o número de operações diárias que o utilizador ainda pode realizar. | Deveria ter | Mantido | ALT | UC-VID-001, Passo 1, RN3 | Informa previamente o utilizador sobre a sua disponibilidade de quota diária antes de configurar um pedido. | Dado um utilizador com 2 das 5 operações usadas, quando abre a biblioteca, então vê 3 operações restantes. |
| REQ-VID-TRIM-003 | O sistema deve permitir ao utilizador registado selecionar um vídeo da sua biblioteca e escolher a opção Recortar. | Deve ter | Mantido | NOVO | UC-VID-001, Trigger, Passo 2 | Ponto de entrada da funcionalidade de recorte temporal a partir de um vídeo existente na biblioteca. | Dado um vídeo na biblioteca, quando o utilizador o seleciona, então a opção Recortar está disponível e pode ser escolhida. |
| REQ-VID-TRIM-004 | O sistema deve abrir o ecrã de recorte com um reprodutor e a duração total do vídeo selecionado. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 3 | O utilizador precisa de visualizar o conteúdo e conhecer a duração limite para definir o intervalo de corte. | Dado um vídeo MP4 de 60 s, quando o utilizador escolhe Recortar, então o ecrã mostra o reprodutor e a duração de 60 s. |
| REQ-VID-TRIM-005 | O sistema deve permitir ao utilizador definir os instantes inicial e final do intervalo com precisão de 1 segundo. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 4, RN2 | Parametrização essencial da operação de recorte temporal com granularidade adequada ao MVP. | Dado um vídeo de 60 s, quando o utilizador define início em 10 s e fim em 45 s, então o sistema aceita os valores. |
| REQ-VID-TRIM-006 | O sistema deve apresentar a duração do vídeo resultante para o intervalo válido definido. | Deveria ter | Mantido | NOVO | UC-VID-001, Passo 4 | Dá retorno imediato ao utilizador sobre a duração efetiva do excerto que vai ser gerado. | Dado um intervalo de 10 s a 45 s, então o sistema apresenta a duração de 35 s. |
| REQ-VID-TRIM-007 | O sistema deve permitir ao utilizador escolher o formato de saída entre MP4 e MOV. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 5, RN1 | Garante que o resultado é produzido num dos contentores de vídeo suportados na Fase 1. | Dado o passo de escolha do formato, então só as opções MP4 e MOV estão disponíveis. |
| REQ-VID-TRIM-008 | O sistema deve usar o formato do vídeo original como formato de saída por omissão. | Deveria ter | Mantido | NOVO | UC-VID-001, Passo 5 | Simplifica a interação quando o utilizador não pretende converter o contentor do vídeo. | Dado um vídeo MOV, quando o utilizador chega à escolha do formato, então MOV vem pré-selecionado. |
| REQ-VID-TRIM-009 | O sistema deve permitir ao utilizador indicar o nome do novo vídeo. | Deveria ter | Mantido | NOVO | UC-VID-001, Passo 5 | Permite ao utilizador identificar o vídeo recortado de forma personalizada na sua biblioteca. | Dado o nome "meu_corte", quando o recorte conclui, então o novo vídeo aparece na biblioteca com esse nome. |
| REQ-VID-TRIM-010 | O sistema deve atribuir ao novo vídeo, quando o utilizador não indica nome, o nome `{nome_original}_recorte_{início}-{fim}` com os instantes em segundos. | Deveria ter | Mantido | NOVO | UC-VID-001, Passo 5, RN5 | Evita bloqueios por falta de nome e gera um identificador descritivo e previsível na biblioteca. | Dado o vídeo "ferias" recortado de 10 s a 45 s sem nome indicado, então o novo vídeo chama-se "ferias_recorte_10-45". |
| REQ-VID-TRIM-011 | O sistema deve apresentar, antes da confirmação, o resumo do pedido com vídeo de origem, intervalo, duração resultante, formato e nome. | Deveria ter | Mantido | NOVO | UC-VID-001, Passo 5 | Previne erros de submissão e reservas indevidas de quota ao permitir rever os parâmetros. | Dado um pedido configurado, quando o utilizador avança, então o resumo mostra os cinco elementos indicados. |
| REQ-VID-TRIM-012 | O sistema deve permitir ao utilizador confirmar o pedido com a opção Iniciar Recorte. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 6 | Ato explícito de submissão que desencadeia a validação de quota e o processamento assíncrono. | Dado um intervalo válido, quando o utilizador escolhe Iniciar Recorte, então o sistema inicia o registo do pedido. |
| REQ-VID-TRIM-013 | O sistema deve reservar 1 operação da quota diária ao registar o pedido, independentemente da duração do intervalo. | Deve ter | Mantido | ALT | UC-VID-001, Passo 7, RN3 | Impede que o utilizador ultrapasse o limite diário do perfil Registado antes da conclusão do trabalho. | Dado um utilizador com 5 operações, quando submete um recorte de 2 s e depois (após conclusão) outro de 5 min, então cada pedido reduz as operações restantes em 1. |
| REQ-VID-TRIM-014 | O sistema deve registar o pedido com o estado Em fila. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 7, Passo 8, RN6 | Inicia o ciclo de vida assíncrono do pedido de recorte até que haja capacidade de processamento. | Dado um pedido confirmado, então o estado apresentado é Em fila. |
| REQ-VID-TRIM-015 | O sistema deve apresentar a biblioteca ao utilizador depois de registar o pedido. | Deveria ter | Mantido | NOVO | UC-VID-001, Passo 8 | Liberta o utilizador do ecrã de configuração para poder continuar a usar a aplicação durante o processamento. | Dado um pedido registado, então o utilizador é levado à biblioteca e pode usar a aplicação. |
| REQ-VID-TRIM-016 | O sistema deve passar o estado do pedido para A processar quando o processamento se inicia. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 9, RN6 | Distingue pedidos que aguardam vez na fila daqueles cuja execução já começou. | Dado um pedido Em fila, quando o processamento arranca, então o estado passa a A processar. |
| REQ-VID-TRIM-017 | O sistema deve apresentar o progresso (%) do pedido enquanto estiver A processar. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 9 | O processamento de vídeo é demorado; a percentagem informa o utilizador da evolução da operação. | Dado um pedido A processar, então é apresentada uma percentagem entre 0 % e 100 %. |
| REQ-VID-TRIM-018 | O sistema deve permitir ao utilizador consultar o estado do pedido. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 10 | Permite o acompanhamento de operações assíncronas em qualquer momento da sessão. | Dado um pedido existente, quando o utilizador o consulta, então o sistema responde. |
| REQ-VID-TRIM-019 | O sistema deve apresentar o estado atual do pedido e, se estiver A processar, o progresso. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 10, RN6 | Garante transparência sobre a fase exata em que o pedido se encontra quando consultado. | Dado um pedido Em fila, então mostra Em fila; dado um pedido A processar, então mostra A processar e a percentagem. |
| REQ-VID-TRIM-020 | O sistema deve guardar o resultado como novo vídeo da biblioteca, no formato de saída escolhido. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 11, RN5, Pós-condição de sucesso | Assegura a persistência do resultado na biblioteca do utilizador sem sobrescrever o vídeo de origem. | Dado um pedido concluído com formato MOV, então a biblioteca contém um novo vídeo em formato MOV. |
| REQ-VID-TRIM-021 | O sistema deve passar o estado do pedido para Concluído quando o recorte termina com sucesso. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 11, RN6, Pós-condição de sucesso | Assinala o término bem-sucedido do ciclo de vida do pedido e a disponibilidade do resultado. | Dado um recorte terminado com sucesso, então o estado é Concluído. |
| REQ-VID-TRIM-022 | O sistema deve consumir definitivamente a operação reservada quando o pedido passa a Concluído. | Deve ter | Mantido | ALT | UC-VID-001, Passo 11, RN3, Pós-condição de sucesso | Efetiva a contabilização da quota diária apenas quando o serviço entrega o resultado com sucesso. | Dado um pedido Concluído, então a operação mantém-se descontada da quota diária. |
| REQ-VID-TRIM-023 | O sistema deve notificar o utilizador, dentro da aplicação, quando o recorte estiver concluído. | Deveria ter | Mantido | NOVO | UC-VID-001, Passo 12, A3, Pós-condição de sucesso | Evita que o utilizador tenha de consultar repetidamente o estado para saber que o vídeo está pronto. | Dado um pedido que passa a Concluído, então o utilizador recebe uma notificação na aplicação. |
| REQ-VID-TRIM-024 | O sistema deve permitir ao utilizador abrir e reproduzir o vídeo recortado. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 13 | Permite validar imediatamente o resultado do recorte dentro da própria aplicação. | Dado um recorte concluído, quando o utilizador abre o novo vídeo, então este é reproduzido. |
| REQ-VID-TRIM-025 | O sistema deve permitir ao utilizador descarregar o vídeo recortado. | Deveria ter | Mantido | ALT | UC-VID-001, Passo 13 | Estende a capacidade de exportação do PictuRAS para permitir guardar localmente o vídeo resultante. | Dado um recorte concluído, quando o utilizador escolhe descarregar, então é obtido um ficheiro reproduzível. |
| REQ-VID-TRIM-026 | O sistema deve avisar que o resultado seria uma cópia do original e pedir confirmação quando o intervalo abranger a duração total do vídeo. | Poderia ter | Mantido | NOVO | UC-VID-001, FA1, Passo 4 | Previne o gasto acidental de quota e recursos num recorte redundante. | Dado um vídeo de 60 s e um intervalo de 0 s a 60 s, quando o utilizador avança, então surge o aviso e é pedida confirmação. |
| REQ-VID-TRIM-027 | O sistema deve regressar à definição do intervalo quando o utilizador recusar a confirmação do aviso de intervalo igual à duração total. | Poderia ter | Mantido | NOVO | UC-VID-001, FA1 | Permite corrigir o intervalo sem perder o contexto da configuração iniciada. | Dado o aviso de cópia do original, quando o utilizador recusa, então o ecrã de definição do intervalo volta a ser apresentado. |
| REQ-VID-TRIM-028 | O sistema deve permitir ao utilizador cancelar o pedido enquanto o estado for Em fila ou A processar. | Deveria ter | Mantido | NOVO | UC-VID-001, FA2, RN6 | Dá controlo ao utilizador para abortar um pedido submetido por engano ou demasiado demorado. | Dado um pedido A processar, então a opção Cancelar está disponível. |
| REQ-VID-TRIM-029 | O sistema deve impedir o cancelamento de pedidos nos estados Concluído, Falhou e Cancelado. | Deveria ter | Mantido | NOVO | UC-VID-001, FA2, RN6 | Garante a consistência da máquina de estados impedindo transições inválidas a partir de estados terminais. | Dado um pedido Concluído, então a opção Cancelar não está disponível. |
| REQ-VID-TRIM-030 | O sistema deve pedir confirmação ao utilizador antes de cancelar o pedido. | Poderia ter | Mantido | NOVO | UC-VID-001, FA2 | Evita a perda acidental do progresso de processamento já decorrido. | Dado que o utilizador escolhe Cancelar, então é pedida confirmação antes de qualquer alteração ao pedido. |
| REQ-VID-TRIM-031 | O sistema deve interromper o processamento do pedido quando o cancelamento for confirmado. | Deveria ter | Mantido | NOVO | UC-VID-001, FA2 | Liberta imediatamente os recursos computacionais alocados a um trabalho que deixou de ser desejado. | Dado um pedido A processar cancelado, então o processamento deixa de progredir. |
| REQ-VID-TRIM-032 | O sistema deve devolver à quota a operação reservada quando o pedido for cancelado. | Deveria ter | Mantido | ALT | UC-VID-001, FA2, RN3, Garantia Mínima | Não penaliza a quota diária do utilizador quando o recorte não chega a produzir resultado. | Dado um utilizador com 4 operações restantes e um pedido reservado, quando cancela, então voltam a ser 5. |
| REQ-VID-TRIM-033 | O sistema deve passar o estado do pedido para Cancelado após o cancelamento confirmado. | Deveria ter | Mantido | NOVO | UC-VID-001, FA2, RN6, Garantia Mínima | Regista de forma explícita o motivo pelo qual o pedido terminou sem gerar vídeo. | Dado um cancelamento confirmado, então o estado do pedido é Cancelado. |
| REQ-VID-TRIM-034 | O sistema deve manter o processamento em curso quando o utilizador fecha a aplicação ou termina a sessão depois de confirmar o pedido. | Deveria ter | Mantido | NOVO | UC-VID-001, FA3 | Desacopla a execução do trabalho da sessão ativa do cliente, essencial para operações assíncronas. | Dado um pedido A processar, quando o utilizador termina a sessão e volta mais tarde, então o pedido continuou e o recorte está concluído. |
| REQ-VID-TRIM-035 | O sistema deve apresentar ao utilizador, quando este regressa, a notificação de conclusão ou de falha e o estado atualizado do pedido. | Deveria ter | Mantido | NOVO | UC-VID-001, FA3 | Garante que o utilizador toma conhecimento do desfecho dos trabalhos executados em segundo plano. | Dado um pedido concluído durante a ausência do utilizador, quando este inicia sessão, então vê a notificação e o estado Concluído. |
| REQ-VID-TRIM-036 | O sistema deve rejeitar o pedido de recorte de um vídeo com formato ou codec não suportado, apresentando a mensagem "Este formato de vídeo não é suportado para recorte" e os formatos aceites, sem abrir o ecrã de recorte nem consumir operação da quota. | Deve ter | Mantido | NOVO | UC-VID-001, E1, Passo 2, RN1 | Impede falhas tardias de processamento sobre formatos incompatíveis e protege a quota do utilizador. | Dado um vídeo AVI, quando o utilizador escolhe Recortar, então surge a mensagem com MP4 e MOV como formatos aceites, o ecrã de recorte não abre e o número de operações restantes não muda. |
| REQ-VID-TRIM-037 | O sistema deve validar que a duração do intervalo é de, no mínimo, 1 segundo. | Deve ter | Mantido | NOVO | UC-VID-001, E2, Passo 4, RN2 | Impede a geração de ficheiros de vídeo vazios ou com duração nula. | Dado um intervalo de 0 s (início 10 s, fim 10 s), então é inválido; com um intervalo de 1 s (início 10 s, fim 11 s), então é válido. |
| REQ-VID-TRIM-038 | O sistema deve validar que o instante inicial é anterior ao instante final. | Deve ter | Mantido | NOVO | UC-VID-001, E2, Passo 4, RN2 | Garante a coerência cronológica dos limites do intervalo de recorte. | Dado início em 30 s e fim em 20 s, então o intervalo é inválido. |
| REQ-VID-TRIM-039 | O sistema deve validar que o instante final não excede a duração do vídeo. | Deve ter | Mantido | NOVO | UC-VID-001, E2, Passo 4, RN2 | Impede pedidos de recorte fora dos limites temporais do vídeo de origem. | Dado um vídeo de 60 s, então fim em 61 s é inválido e fim em 60 s é válido. |
| REQ-VID-TRIM-040 | O sistema deve manter o botão Iniciar Recorte desativado enquanto o intervalo for inválido. | Deve ter | Mantido | NOVO | UC-VID-001, E2, Passo 4 | Previne a submissão de pedidos inválidos logo na interface de configuração. | Dado um intervalo inválido, então o botão está desativado; quando o intervalo é corrigido, então o botão fica ativo. |
| REQ-VID-TRIM-041 | O sistema deve indicar o motivo e o limite violado quando o intervalo definido for inválido. | Deveria ter | Mantido | NOVO | UC-VID-001, E2 | Orienta o utilizador na correção imediata do parâmetro incorreto. | Dado fim em 61 s num vídeo de 60 s, então o erro indica que o instante final excede 60 s. |
| REQ-VID-TRIM-042 | O sistema deve recusar o pedido, sem o criar, quando o utilizador não tem operações diárias disponíveis, apresentando a mensagem "Atingiu o limite de operações diárias", a hora de reposição da quota e a sugestão do perfil Premium. | Deve ter | Mantido | ALT | UC-VID-001, E3, Passo 7, RN3 | Faz cumprir o modelo de negócio de quotas por perfil e promove a transição para o perfil Premium. | Dado um utilizador com 5 de 5 operações usadas, quando confirma o pedido, então surge a mensagem com a hora de reposição e a sugestão Premium, e nenhum pedido é criado. |
| REQ-VID-TRIM-043 | O sistema deve recusar o pedido de recorte quando o utilizador já tem um recorte Em fila ou A processar, apresentando a mensagem "Já existe um recorte em curso. Aguarde a conclusão". | Deve ter | Mantido | NOVO | UC-VID-001, E4, Passo 2, RN4 | Evita o monopólio da fila de processamento por um único utilizador e simplifica a gestão de quota reservada. | Dado um recorte A processar, quando o mesmo utilizador escolhe Recortar noutro vídeo, então surge a mensagem e nenhum novo pedido é criado. |
| REQ-VID-TRIM-044 | O sistema deve repetir automaticamente uma vez o processamento quando ocorrer uma falha a meio. | Deveria ter | Mantido | NOVO | UC-VID-001, E5, RN7 | Absorve falhas transitórias de infraestrutura ou do motor de vídeo sem incomodar o utilizador. | Dado uma falha simulada na primeira tentativa, então o sistema faz uma segunda tentativa sem intervenção do utilizador. |
| REQ-VID-TRIM-045 | O sistema deve passar o estado do pedido para Falhou quando a segunda tentativa de processamento também falhar. | Deve ter | Mantido | NOVO | UC-VID-001, E5, RN6, RN7, Garantia Mínima | Evita ciclos infinitos de repetição perante erros persistentes e liberta a fila do utilizador. | Dado falhas simuladas nas duas tentativas, então o estado do pedido é Falhou. |
| REQ-VID-TRIM-046 | O sistema deve devolver à quota a operação reservada quando o pedido passar para Falhou. | Deve ter | Mantido | ALT | UC-VID-001, E5, RN3, Garantia Mínima | Garante justiça na contagem de operações caso o sistema não consiga concluir o serviço. | Dado um pedido que falha, então o número de operações restantes volta ao valor anterior ao pedido. |
| REQ-VID-TRIM-047 | O sistema deve notificar o utilizador com a mensagem "Não foi possível concluir o recorte. Tente novamente" quando o pedido passar para Falhou. | Deveria ter | Mantido | NOVO | UC-VID-001, E5, Garantia Mínima | Informa claramente o utilizador sobre o insucesso da operação assíncrona e a possibilidade de repetir. | Dado um pedido Falhou, então o utilizador recebe a mensagem indicada. |
| REQ-VID-TRIM-048 | O sistema deve impedir a eliminação do vídeo de origem enquanto existir um recorte seu Em fila ou A processar, informando que o vídeo está a ser utilizado numa operação. | Deveria ter | Mantido | ALT | UC-VID-001, E6 | Previne erros de leitura por desaparecimento do ficheiro de entrada durante o processamento. | Dado um recorte A processar, quando o utilizador tenta eliminar o vídeo de origem, então a eliminação é impedida e surge a mensagem. |
| REQ-VID-TRIM-049 | O sistema deve permitir eliminar o vídeo de origem quando o seu recorte estiver Concluído, Falhou ou Cancelado. | Deveria ter | Mantido | ALT | UC-VID-001, E6 | Restaura o controlo normal do utilizador sobre a sua biblioteca assim que o vídeo de origem deixa de estar em uso. | Dado um recorte Concluído, quando o utilizador elimina o vídeo de origem, então a eliminação é efetuada. |
| REQ-VID-TRIM-055 | O sistema deve manter o vídeo recortado na biblioteca, independente do original, mesmo depois de o vídeo de origem ser eliminado. | Deve ter | Mantido | NOVO | UC-VID-001, Garantia de Sucesso, RN5 | Assegura que o resultado gerado é um recurso autónomo na biblioteca do utilizador. | Dado um recorte Concluído, quando o vídeo de origem é eliminado, então o vídeo recortado continua na biblioteca e é reproduzível. |

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
|--------|---------------|----------------------------------|--------------|-------------------|--------------|----------------------|----------------------------------------|
| REQ-VID-TRIM-050 | O sistema deve aceitar para recorte vídeos nos formatos MP4 e MOV com codec H.264. | Compatibilidade | Contentores MP4 e MOV com codec H.264 | Contentores MP4, MOV, WebM e MKV com codecs H.264, H.265/HEVC e VP9 | Refinado | UC-VID-001 (Passo 2, E1, RN1), DQ-001 | Dado um vídeo MP4 (H.264) e um MOV (H.264), quando o utilizador escolhe Recortar em cada um, então o ecrã de recorte abre nos dois casos; formato não suportado é rejeitado. |
| REQ-VID-TRIM-051 | O vídeo recortado deve ter a mesma resolução e a mesma taxa de fotogramas do vídeo original. | Adequação Funcional | Obrigatório (mesma resolução e fps do vídeo de origem) | Obrigatório (mesma resolução, fps e preservação de múltiplas faixas de áudio/legendas) | Refinado | UC-VID-001 (RN5, Pós-condição de sucesso) | Dado um vídeo de 1280 × 720 a 30 fps, quando o recorte conclui, então o vídeo resultante tem 1280 × 720 a 30 fps. |
| REQ-VID-TRIM-052 | A duração do vídeo recortado deve diferir da duração do intervalo pedido dentro do limite de tolerância definido. | Adequação Funcional | Diferença máxima de ± 1 s face ao intervalo pedido | Diferença máxima de ± 0,1 s (precisão ao fotograma) | Refinado | UC-VID-001 (RN5, Garantia de Sucesso), DQ-001 | Dado um intervalo de 10 s a 45 s (35 s), quando o recorte conclui no MVP, então a duração do resultado está entre 34 s e 36 s. |
| REQ-VID-TRIM-053 | O sistema deve atualizar o progresso apresentado do pedido em processamento dentro do intervalo máximo estipulado. | Usabilidade | Atualização pelo menos de 5 em 5 segundos | Atualização em tempo real pelo menos de 1 em 1 segundo, com estimativa de tempo restante | Refinado | UC-VID-001 (Passo 9, RN8) | Dado um pedido a processar durante 30 s no MVP, quando o utilizador observa o progresso, então o valor apresentado muda ou é reconfirmado pelo menos 6 vezes. |
| REQ-VID-TRIM-054 | O ficheiro do vídeo original deve manter-se inalterado após o pedido de recorte, em qualquer estado final do pedido. | Fiabilidade | Obrigatório (resumo criptográfico idêntico antes e depois) | Obrigatório (acesso apenas de leitura ao original e armazenamento imutável) | Refinado | UC-VID-001 (RN5, Garantia de Sucesso, Garantia Mínima) | Dado o resumo criptográfico (SHA-256) do original antes do pedido, quando o pedido fica Concluído, Falhou ou Cancelado, então o resumo do original permanece idêntico. |
| REQ-VID-TRIM-056 | O sistema não deve manter nenhum ficheiro parcial de resultado quando o pedido terminar em Falhou ou Cancelado. | Fiabilidade | Limpeza após falha ou cancelamento; zero ficheiros parciais visíveis ou retidos | Limpeza transacional imediata acompanhada de rotina automática de recolha de lixo no armazenamento | Refinado | UC-VID-001 (FA2, E5, Garantia Mínima), DQ-002 | Dado um pedido Falhou e outro Cancelado, quando o estado final é atingido, então a biblioteca e o armazenamento não contêm nenhum ficheiro resultante desses pedidos. |
| REQ-VID-TRIM-057 | O sistema deve responder à confirmação do pedido de recorte, registando-o no estado Em fila, dentro do tempo máximo de resposta definido, independentemente da duração do vídeo. | Eficiência de Desempenho | ≤ 3 segundos | ≤ 1 segundo | Novo | UC-VID-001 (Passos 6, 7, 8), DQ-002 | Dado um vídeo válido na biblioteca, quando o utilizador confirma Iniciar Recorte, então o pedido fica Em fila e a resposta surge em menos de 3 s (medido com vídeos de 10 MB e 200 MB). |
| REQ-VID-TRIM-058 | O sistema deve processar pedidos de recorte de diferentes utilizadores em paralelo, de forma assíncrona e sem bloquear a sessão do utilizador, respeitando o rácio máximo de tempo de processamento. | Eficiência de Desempenho | Até 5 recortes simultâneos de utilizadores distintos; tempo de processamento ≤ 2× a duração do intervalo (720p) | Até 50 recortes simultâneos com escalabilidade horizontal; tempo de processamento ≤ 0,5× a duração do intervalo (1080p) | Novo | UC-VID-001 (Passo 8, FA3, A2, A6), DQ-002 | Dados 3 utilizadores distintos que submetem recortes de 30 s em simultâneo, quando os pedidos entram em processamento, então correm em paralelo sem bloquear a navegação e cada um conclui em ≤ 60 s no MVP. |
| REQ-VID-TRIM-059 | O sistema deve restringir o acesso ao vídeo de origem, ao estado do pedido de recorte e ao vídeo recortado exclusivamente ao utilizador proprietário autenticado. | Segurança | Obrigatório (validação de sessão e proprietário em todos os pedidos) | Obrigatório (validação de proprietário + URLs de reprodução/descarregamento assinados com expiração temporal) | Novo | UC-VID-001 (Passos 1, 10, 13), DQ-003 | Dado um pedido de recorte e o respetivo vídeo resultante do Utilizador A, quando o Utilizador B ou um utilizador não autenticado tenta consultar o pedido ou aceder ao URL do vídeo, então o sistema recusa o acesso com erro de autorização. |
| REQ-VID-TRIM-060 | O sistema deve isolar a ferramenta de recorte de vídeo de modo a que a adição de uma nova ferramenta de vídeo não exija alterações ao código das ferramentas existentes. | Manutenibilidade | Objetivo (acoplamento através de interface interna comum de ferramentas de vídeo) | Obrigatório (arquitetura modular de *plug-ins* ou trabalhadores independentes por ferramenta) | Novo | DQ-004 | Dada a implementação da ferramenta de recorte, quando é registada uma segunda ferramenta de vídeo de teste, então o código do módulo de recorte não sofre nenhuma linha de alteração. |
| REQ-VID-TRIM-061 | O sistema deve isolar a dependência do motor externo de processamento de vídeo (ex.: FFmpeg) através de uma camada adaptadora dedicada. | Portabilidade | Invocação encapsulada num módulo adaptador com configuração externa do binário | Execução isolada em contentores dedicados (Docker) independentes do sistema operativo anfitrião | Novo | DQ-005 | Dado o serviço de recorte, quando se inspeciona a lógica de negócio e de gestão de estados dos pedidos, então não existem chamadas diretas a comandos do sistema ou bibliotecas nativas fora do adaptador de vídeo. |

#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
|-----------------------|---------------|----------------------------|--------------------------------|
| Formato, codec, duração e dimensão do vídeo | Sim (parcial) | O caso de uso opera sobre vídeos já presentes na biblioteca do utilizador (A1). No recorte valida-se o formato/codec de entrada e saída (MP4 e MOV com H.264) e a duração do intervalo (mínimo 1 s, dentro da duração total). Limites de tamanho (MB) e duração máxima no carregamento inicial pertencem à funcionalidade de submissão de vídeo e estão registados nas questões em aberto (Q3, Q6). | REQ-VID-TRIM-005, 007, 036, 037, 038, 039, 050 |
| Estado, progresso, cancelamento e resultado | Sim | Coberto integralmente pelo ciclo de vida do pedido (`Em fila`, `A processar`, `Concluído`, `Falhou`, `Cancelado`), atualização periódica de progresso em percentagem, possibilidade de cancelamento antes da conclusão e criação de um novo vídeo reproduzível e descarregável na biblioteca. | REQ-VID-TRIM-014, 016, 017, 018, 019, 020, 021, 023, 024, 025, 028, 029, 030, 031, 033, 034, 035, 051, 052, 053, 057, 058 |
| Falhas durante o processamento | Sim | Quando ocorre falha a meio do processamento, o sistema repete automaticamente a execução uma vez (RN7). Se a segunda tentativa falhar, o pedido passa a `Falhou`, a operação reservada é devolvida à quota, os ficheiros parciais são eliminados e o utilizador é notificado. | REQ-VID-TRIM-044, 045, 046, 047, 054, 056 |
| Persistência e expiração dos ficheiros | Sim (parcial) | O vídeo original mantém-se inalterado e protegido contra eliminação enquanto o recorte está ativo (`Em fila` ou `A processar`). O vídeo recortado é persistido como ficheiro independente na biblioteca e os ficheiros parciais de falhas/cancelamentos são removidos. A política de expiração temporal ou quota de armazenamento na biblioteca está pendente de decisão global (Q4, Q6). | REQ-VID-TRIM-020, 048, 049, 054, 055, 056 |
| Perfis e contagem de operações | Sim | Especificado para o perfil Utilizador Registado (limite de 5 operações/dia). Cada recorte conta como 1 operação independentemente da duração: é reservada na confirmação, consumida na conclusão com sucesso e devolvida em caso de falha ou cancelamento, sugerindo-se o perfil Premium quando esgotada. | REQ-VID-TRIM-002, 013, 022, 032, 042, 046 |
| Encadeamento de ferramentas e processamento em lote | Não (fora do âmbito) | Excluídos explicitamente do âmbito deste caso de uso (A4 e A5): cada pedido recorta um único intervalo temporal de um único vídeo. O vídeo resultante fica disponível na biblioteca como qualquer outro vídeo, mas não há suporte a *pipelines* de ferramentas nem a submissão em lote na Fase 1. | N/A |

**Evolução:** *Mantido* = requisito preservado; *Refinado* = clarificado ou tornado verificável sem mudar a intenção; *Novo* = acrescentado para completar a ERS. **NOVO/ALT** indica o impacto face ao PictuRAS existente, não a novidade face ao Exercício 1.

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
|--------------------------------|-------------------------------------------|--------------------------|--------------------------------|
| Limite de 5 operações/dia (perfil Registado) | Estender | Um recorte de vídeo conta como 1 operação, independentemente da duração. A operação passa a ter semântica de reserva ao submeter, consumo definitivo ao concluir e devolução se o pedido falhar ou for cancelado. | REQ-VID-TRIM-002, 013, 022, 032, 042, 046 |
| Perfis Anónimo e Premium | Manter | Neste caso de uso o recorte está definido para o perfil Registado (com sugestão de upgrade para Premium quando a quota esgota). O acesso do Anónimo e os limites do Premium mantêm-se em aberto (Q1, Q2, Q6). | REQ-VID-TRIM-042 |
| Biblioteca do utilizador e controlo de acesso | Estender | Passa a listar e reproduzir vídeos, a guardar o vídeo recortado como novo recurso independente, a impedir a eliminação do vídeo de origem durante o recorte e a garantir que apenas o proprietário autenticado acede aos vídeos e pedidos. | REQ-VID-TRIM-001, 020, 024, 048, 049, 055, 059 |
| Exportação / descarregamento | Estender | O mecanismo de exportação passa a permitir descarregar ficheiros de vídeo recortados nos formatos MP4 e MOV, restrito ao respetivo proprietário. | REQ-VID-TRIM-025, 059 |
| Armazenamento | Estender | Cada recorte concluído ocupa espaço adicional como ficheiro independente, mantendo o original intacto. Exige limpeza automática de ficheiros temporários/parciais em caso de falha ou cancelamento. | REQ-VID-TRIM-020, 054, 055, 056 |
| Processamento de pedidos e arquitetura de ferramentas | Estender | Introduz fila de trabalhos assíncronos (1 ativo por utilizador, execução paralela entre utilizadores distintos), máquina de estados, acompanhamento de progresso, repetição automática, cancelamento, desacoplamento modular de ferramentas de vídeo e isolamento do motor externo (ex.: FFmpeg). | REQ-VID-TRIM-014, 016, 017, 028, 031, 034, 043, 044, 053, 057, 058, 060, 061 |
| Encadeamento de ferramentas | Manter | Fora do âmbito desta funcionalidade (A5). O vídeo recortado é guardado na biblioteca, sem execução encadeada automática com outras ferramentas. | — |
| Processamento em lote | Manter | Fora do âmbito desta funcionalidade (A4). Cada pedido opera sobre um único vídeo e um único intervalo. | — |

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
|------------------------|-------------------------|--------------------------------|
| Trigger | Utilizador seleciona vídeo e escolhe Recortar | REQ-VID-TRIM-003 |
| Passo 1 | Apresentar vídeos da biblioteca e operações restantes | REQ-VID-TRIM-001, 002, 059 |
| Passo 2 | Selecionar vídeo e verificar formato e recorte em curso | REQ-VID-TRIM-003, 036, 043, 050 |
| Passo 3 | Abrir ecrã de recorte com reprodutor e duração | REQ-VID-TRIM-004 |
| Passo 4 | Definir e validar intervalo e apresentar duração resultante | REQ-VID-TRIM-005, 006, 026, 037, 038, 039, 040 |
| Passo 5 | Escolher formato e nome; apresentar resumo do pedido | REQ-VID-TRIM-007, 008, 009, 010, 011 |
| Passo 6 | Confirmar o pedido com Iniciar Recorte | REQ-VID-TRIM-012, 057 |
| Passo 7 | Validar quota, reservar operação e registar pedido Em fila | REQ-VID-TRIM-013, 014, 042, 057 |
| Passo 8 | Colocar pedido em fila, regressar à biblioteca e processar de forma assíncrona | REQ-VID-TRIM-014, 015, 057, 058 |
| Passo 9 | Passar estado para A processar e atualizar progresso (%) | REQ-VID-TRIM-016, 017, 053 |
| Passo 10 | Consultar estado atual e progresso do pedido | REQ-VID-TRIM-018, 019, 059 |
| Passo 11 | Guardar novo vídeo, passar a Concluído e consumir operação | REQ-VID-TRIM-020, 021, 022 |
| Passo 12 | Notificar utilizador da conclusão na aplicação | REQ-VID-TRIM-023 |
| Passo 13 | Abrir, reproduzir e descarregar o vídeo recortado | REQ-VID-TRIM-024, 025, 059 |
| FA1 | Intervalo igual à duração total do vídeo | REQ-VID-TRIM-026, 027 |
| FA2 | Cancelar o pedido Em fila ou A processar | REQ-VID-TRIM-028, 029, 030, 031, 032, 033, 056 |
| FA3 | Utilizador sai da aplicação durante o processamento | REQ-VID-TRIM-034, 035, 058 |
| E1 | Formato ou codec de vídeo não suportado | REQ-VID-TRIM-036, 050 |
| E2 | Intervalo de recorte inválido | REQ-VID-TRIM-037, 038, 039, 040, 041 |
| E3 | Quota diária de operações esgotada | REQ-VID-TRIM-042 |
| E4 | Utilizador já tem um recorte em curso | REQ-VID-TRIM-043 |
| E5 | Falha a meio do processamento do vídeo | REQ-VID-TRIM-044, 045, 046, 047, 056 |
| E6 | Tentativa de eliminação do vídeo de origem durante o processamento | REQ-VID-TRIM-048, 049 |
| RN1 | Formatos aceites e de saída: MP4 e MOV (codec H.264) | REQ-VID-TRIM-007, 036, 050 |
| RN2 | Regras de validade e precisão (1 s) do intervalo | REQ-VID-TRIM-005, 037, 038, 039 |
| RN3 | Gestão de quota: reservar, consumir na conclusão, devolver na falha/cancelamento | REQ-VID-TRIM-002, 013, 022, 032, 042, 046 |
| RN4 | Limite de 1 recorte ativo (Em fila ou A processar) por utilizador | REQ-VID-TRIM-043 |
| RN5 | Original inalterado, vídeo independente, nome por omissão, resolução/fps e tolerância de duração | REQ-VID-TRIM-010, 020, 051, 052, 054, 055 |
| RN6 | Máquina de estados do pedido e regras de cancelamento | REQ-VID-TRIM-014, 016, 019, 021, 028, 029, 033, 045 |
| RN7 | Uma repetição automática em caso de falha de processamento | REQ-VID-TRIM-044, 045 |
| RN8 | Atualização do progresso pelo menos de 5 em 5 segundos | REQ-VID-TRIM-053 |
| Pós-condição de sucesso (Garantia de Sucesso) | Novo vídeo independente com resolução/duração corretas, original intacto, Concluído, quota consumida e notificação | REQ-VID-TRIM-020, 021, 022, 023, 051, 052, 054, 055 |
| Pós-condição mínima (Garantia Mínima) | Original intacto, sem ficheiros parciais, quota devolvida, estado Falhou/Cancelado e notificação | REQ-VID-TRIM-032, 033, 045, 046, 047, 054, 056 |
| A2, A3, A6, A7, A8 | Processamento assíncrono, notificações internas, paralelismo entre utilizadores e parâmetros de qualidade | REQ-VID-TRIM-023, 050, 052, 053, 058 |
| DQ-001 | Restrição de codecs e tolerância de corte no MVP vs. Produção | REQ-VID-TRIM-050, 052 |
| DQ-002 | Desempenho na submissão, concorrência assíncrona e limpeza de recursos | REQ-VID-TRIM-056, 057, 058 |
| DQ-003 | Controlo de acesso estrito aos vídeos e pedidos por proprietário | REQ-VID-TRIM-059 |
| DQ-004 | Desacoplamento modular para futuras ferramentas de vídeo | REQ-VID-TRIM-060 |
| DQ-005 | Isolamento do motor externo de processamento de vídeo (FFmpeg) | REQ-VID-TRIM-061 |

**Decisões de qualidade introduzidas nesta aula**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
|--------|--------------------------|-----------------|--------------------------------|
| DQ-001 | Restringir o MVP aos contentores MP4/MOV (H.264) com tolerância de corte de ± 1 s, diferindo o suporte a múltiplos codecs (HEVC, VP9) e corte exato ao fotograma (± 0,1 s) para produção. | Viabiliza a validação funcional rápida na Fase 1 sem exigir recodificação pesada ao fotograma nem configuração de múltiplos codecs. | REQ-VID-TRIM-050, 052 |
| DQ-002 | Garantir aceitação rápida do pedido (≤ 3 s no MVP), processamento assíncrono paralelo entre diferentes utilizadores e remoção total de ficheiros parciais em falhas/cancelamentos. | Evita o bloqueio da interface durante operações longas, assegura capacidade multiutilizador mínima na Fase 1 e impede o esgotamento do armazenamento com artefactos corrompidos. | REQ-VID-TRIM-056, 057, 058 |
| DQ-003 | Restringir a leitura, reprodução, consulta de estado e descarregamento de vídeos exclusivamente ao utilizador autenticado que os detém, evoluindo para URLs assinados em produção. | Protege a privacidade dos conteúdos submetidos e gerados na biblioteca pessoal de cada utilizador. | REQ-VID-TRIM-059 |
| DQ-004 | Estruturar a ferramenta de recorte segundo um contrato comum de ferramentas de vídeo para permitir acrescentar novas ferramentas sem modificar as existentes. | O PictuRAS já suporta múltiplas ferramentas de imagem; preparar a extensibilidade evita dívida técnica na adição de futuras operações sobre vídeo na Fase 2. | REQ-VID-TRIM-060 |
| DQ-005 | Encapsular a invocação de binários externos de processamento de vídeo (ex.: FFmpeg) num componente adaptador isolado. | Desacopla as regras de negócio do PictuRAS da ferramenta de linha de comandos subjacente e facilita a contentorização futura. | REQ-VID-TRIM-061 |

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

---