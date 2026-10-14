# 📝 Exercícios 1 e 2 — Reproduzir Vídeo (Caso de Uso e ERS)
### Levantamento e Especificação de Requisitos · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | Grupo 7 |
| **Autores** | Francisco Dias (PG63958); Rodrigo Rocha (PG65437); Rodrigo Fernandes (PG64026); Luís Miguel (PG65424); Joaquim Cunha (PG63986) |
| **Data** | 2026-10-14 |
| **Versão do documento** | v2.0 (Revisão integral do Caso de Uso + ERS segundo ISO/IEC 25010) |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de Vídeo Escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | **Reproduzir Vídeo na Biblioteca do Utilizador** |
| **Perfis de utilizador abrangidos** | **Utilizador Registado** (ator principal) e **Utilizador Premium** (com limites operacionais superiores). O **Utilizador Anónimo** está excluído desta funcionalidade no MVP (ver RN5). |

**Justificação no contexto do MVP** *(2–3 linhas)*

A reprodução de vídeo no leitor *web* permite aos utilizadores autenticados consultar os vídeos disponíveis na sua biblioteca. A funcionalidade permite validar a transmissão parcial e o controlo de acesso seguro a ficheiros multimédia de grande dimensão.
A reprodução de vídeos já disponíveis permite aos utilizadores autenticados consultar conteúdos multimédia na plataforma. A funcionalidade é limitada aos perfis Registado e Premium, permitindo validar a transmissão, os controlos de reprodução e o tratamento de falhas.


---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | `UC-VID-003` |
| **Nome** | Reproduzir Vídeo |
| **Versão** | v2.0 |
| **Autores** | Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Joaquim Cunha |
| **Data** | 2026-10-14 |
| **Objetivo** | Permitir que um utilizador Registado ou Premium visualize e controle a reprodução de um vídeo disponível na sua biblioteca através do leitor *web* da aplicação. |
| **Âmbito** | Módulo de reprodução de vídeo da biblioteca do utilizador no sistema PictuRAS. |
| **Ator Principal** | **Utilizador Registado** |
| **Stakeholders e Interesses** | - **Utilizador Registado**: Pretende reproduzir os seus vídeos de forma imediata e direta, com controlo temporal (*seek*) e sem consumir a sua quota diária de operações de edição.<br>- **Proprietário do Sistema (PictuRAS SaaS)**: Pretende garantir que o acesso aos vídeos é privado, temporário e alinhado com os limites de cada escalão de subscrição.<br>- **Equipa de Desenvolvimento / Arquitetura**: Pretende garantir a entrega de vídeo através de URLs temporárias assinadas e transmissão parcial. |
| **Pré-condições** | - O utilizador encontra-se autenticado no sistema com sessão ativa e perfil **Registado** ou **Premium**.<br>- Existe pelo menos um registo de vídeo associado à biblioteca do utilizador.<br>- O navegador (*browser*) do utilizador suporta a norma HTML5 e pedidos HTTP parciais. |
| **Trigger** | O utilizador prime o vídeo na biblioteca. |

### 2.2 Fluxo Principal (Cenário de Sucesso)

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| **1** | O utilizador acede à sua biblioteca de vídeos. | O sistema apresenta a lista de vídeos do utilizador com os respetivos metadados básicos (nome, duração, resolução, formato e estado de disponibilidade). |
| **2** | O utilizador prime um vídeo disponível (no estado *"Concluído/Pronto"*) para o reproduzir. | O sistema valida a titularidade do vídeo (RN4), confirma que o ficheiro físico existe no armazenamento e está apto para reprodução (RN1, RN6), e gera um endereço de acesso temporário e criptograficamente assinado (RN2). |
| **3** | — | O sistema abre a interface do leitor *web*, inicia a transmissão progressiva (*streaming* por blocos de bytes) a partir do início do ficheiro sem o descarregar na totalidade, apresenta o primeiro fotograma, inicia a reprodução audiovisual e ativa os controlos (*play/pause*, barra de progresso/*seek* e controlo de volume/*mute*). |
| **4** | O utilizador interage com os controlos de reprodução (*pause*, *play* e ajuste de volume). | O sistema aplica de imediato a ação solicitada sobre a reprodução em curso, atualizando o indicador de tempo atual face à duração total do vídeo. |
| **5** | O utilizador fecha o leitor *web* após a reprodução chegar ao fim. | O sistema liberta os recursos de transmissão ativa, devolve o utilizador à biblioteca e mantém o vídeo e a quota de operações inalterados. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| **FA1 – Avançar ou Recuar na Barra de Tempo (*Seek* para Instante Não Carregado)** | No Passo 4, o utilizador desloca o cursor da barra de tempo para um instante $t$ que ainda não se encontra na memória local (*buffer*) do leitor → O sistema exibe um indicador visual de carregamento (*buffering*), solicita ao servidor de armazenamento o segmento de bytes correspondente ao instante $t$ e retoma a reprodução a partir desse instante, regressando ao Passo 4. |
| **FA2 – Fechar o Leitor Antes do Fim da Reprodução** | No Passo 4, o utilizador clica no botão de fechar o leitor antes de o vídeo atingir o final → O sistema cancela de imediato os pedidos de rede de transmissão pendentes, liberta o *buffer* do leitor e executa o Passo 5. |
| **FA3 – Repetir a Reprodução (*Replay*) Após o Término** | No Passo 5, quando o vídeo atinge o último fotograma, em vez de fechar o leitor, o utilizador clica no botão *"Repetir" / Play* → O sistema reposiciona a reprodução no instante `00:00` (reutilizando o *buffer* ou a credencial temporária válida) e regressa ao Passo 4. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| **E1 – Codec de vídeo ou áudio não suportado pelo navegador** | No Passo 3, o leitor *web* deteta incapacidade de descodificar o fluxo de vídeo ou áudio (ex.: vídeo codificado em H.265/HEVC num navegador sem suporte nativo) → O sistema interrompe o carregamento, apresenta no leitor a mensagem *"O seu navegador não suporta o codec deste vídeo (ex.: H.265). Utilize um navegador compatível ou converta o ficheiro"* e mantém o registo inalterado. |
| **E2 – Falha de ligação de rede durante a reprodução** | Nos Passos 3 ou 4, ocorre perda de conectividade e o *buffer* local esgota-se → O sistema pausa a reprodução, preserva o instante atual $t$, apresenta a mensagem *"Erro de transmissão. Verifique a sua ligação à Internet"* e disponibiliza o botão *"Tentar novamente"*. Quando o utilizador clica no botão após restabelecimento da rede, o sistema retoma a transmissão exatamente a partir do instante $t$. |
| **E3 – Expiração da credencial de acesso temporário durante a reprodução** | No Passo 4 (ou durante um *seek* em FA2), a URL temporária expira → O sistema solicita de forma transparente em segundo plano uma nova credencial temporária ao servidor aplicacional:<ul><li>**E3a (Renovação bem-sucedida)**: A transmissão continua sem interrupção visível para o utilizador.</li><li>**E3b (Sessão do utilizador expirada ou revogada)**: O sistema interrompe a reprodução e redireciona/informa o utilizador de que deve autenticar-se novamente.</li></ul> |
| **E5 – Tentativa de acesso não autorizado ou por Utilizador Anónimo** | No Passo 1 ou 2, um utilizador com perfil Anónimo tenta aceder à funcionalidade, ou um utilizador autenticado tenta aceder ao identificador de um vídeo pertencente a terceiros → O sistema recusa o pedido, regista o evento de segurança e apresenta a mensagem de acesso restrito (*"A reprodução de vídeo requer uma conta registada"* ou *"Não tem permissão para aceder a este recurso"*). |
| **E6 – Ficheiro de vídeo corrompido no armazenamento** | Nos Passos 2 ou 3, o contentor do vídeo encontra-se truncado ou com cabeçalhos (*moov atom* / metadados) ilegíveis → O sistema aborta a reprodução e apresenta a mensagem *"Não foi possível reproduzir o vídeo por o ficheiro se encontrar corrompido ou incompleto"*. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| **Garantia de Sucesso** | O vídeo é transmitido e reproduzido no leitor *web* com os controlos operacionais; ao fechar o leitor, a transmissão é terminada, o vídeo permanece íntegro e inalterado no armazenamento, e a quota diária de operações do utilizador não sofre qualquer dedução. |
| **Garantia Mínima** | Caso a reprodução não se inicie ou seja interrompida por falha (rede, codec, expiraçãoou corrupção), o sistema apresenta uma mensagem de erro explícita sobre a causa, nenhum ficheiro parcial ou corrompido é exposto, os dados do utilizador permanecem consistentes e a quota diária de operações mantém-se intacta. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra de Negócio / Restrição** |
|--------|----------------------------------|
| **RN1** | **Formatos, Codecs e Parâmetros Suportados**: O sistema suporta a reprodução de vídeos nos contentores **MP4** e **MOV**, com codecs de vídeo **H.264 (AVC)**, **H.265 (HEVC)**, **VP8** e **VP9**, e codecs de áudio **AAC**, **HE-AAC** e **Opus**, até uma taxa máxima de **60 fps**, dependendo a descodificação do suporte nativo do navegador do cliente. |
| **RN2** | **Acesso Seguro e Temporário**: O leitor *web* nunca acede diretamente a pastas públicas de armazenamento; toda a leitura de fluxos de vídeo é realizada através de URLs pré-assinadas temporárias com validade máxima de **30 minutos** e restritas a operações de leitura (`GET`/`HEAD`). |
| **RN3** | **Isenção de Quota de Operações**: A reprodução de vídeo é uma operação de consulta e não desconta na quota diária de 5 operações do Utilizador Registado. |
| **RN4** | **Isolamento e Privacidade de Recursos**: Um vídeo só pode ser reproduzido pelo utilizador proprietário da conta. |
| **RN5** | **Restrição por Escalão de Subscrição (Elegibilidade)**: A funcionalidade de biblioteca e reprodução de vídeo está disponível exclusivamente para os perfis **Registado** e **Premium**, funcionando como incentivo de conversão do perfil **Anónimo** para conta registada. |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| **A1** | **Infraestrutura de Armazenamento (*Brownfield*)**: Assume-se que a camada de armazenamento de objetos do PictuRAS (baseada em **MinIO** / compatível com S3) suporta nativamente *HTTP Range Requests* (`206 Partial Content`) e geração de *presigned URLs*. |
| **A4** | **Ausência de Transcodificação *On-the-Fly* no MVP**: Na Fase 1 (MVP), o servidor transmite o ficheiro de vídeo tal como está armazenado (*progressive download* via HTTP Range), sem recodificação em tempo real nem *streaming* adaptativo (HLS/DASH), os quais ficam reservados para evolução arquitetural na Fase 2. |
| **A5** | **Métricas de Referência para Validação do MVP**: Para efeitos de verificação dos requisitos não funcionais na Fase 1, assume-se uma ligação de referência do cliente de **10 Mbit/s** estável e vídeos MP4 (H.264) com o átomo `moov` posicionado no início do ficheiro (*faststart*). |
| **A6** | **Recuperação de Estado no Cliente**: O componente de reprodução no navegador mantém em memória o instante temporal atual (`currentTime`), permitindo pedir o segmento exato de bytes ao retomar após falha de rede (`E2`) ou renovação de credencial (`E3`). |

### 2.8 Questões em Aberto

| **ID** | **Questão em Aberto** | **Impacto na Arquitetura / Produto** |
|--------|-----------------------|--------------------------------------|
| **Q3** | Deverá ser permitido ao Utilizador Anónimo, numa iteração futura, pré-visualizar pequenos vídeos (ex.: $\le 15\text{ s}$, $\le 20\text{ MB}$) numa sessão efémera para captação de clientes (*freemium*), à semelhança do que acontece hoje com imagens pequenas? | Impacta a regra de negócio `RN5` e a gestão de armazenamento temporário para sessões não autenticadas. |

---

## 3. Utilização de Agentes de IA

| **Ferramenta / Skill** | **Tarefa Apoiada** | **Validação Realizada pela Equipa** |
|------------------------|--------------------|-------------------------------------|
| **Gemini** | Estruturação inicial do fluxo principal e fluxos alternativos para o caso de uso; revisão crítica da versão v2.0 e alinhamento com a norma ISO/IEC 25010 (Exercício 2). | Revisão manual da sequência de passos, separação entre conceitos de domínio e detalhes de infraestrutura (MinIO), definição das metas MVP vs. Produção e validação da rastreabilidade bidirecional. |
| **Gemini Notebook** | Levantamento de exceções específicas de vídeo e definição de regras de negócio iniciais. | Validação técnica das exceções de codecs/rede e ajuste das regras de negócio quanto aos formatos, codecs (MP4, MOV) e limites por perfil (Registado vs. Premium). |
| **Claude** | Revisão do caso de uso para o âmbito exclusivo de reprodução de vídeo e derivação inicial da secção 4 (requisitos, impacto no sistema existente e matriz de rastreabilidade). | Verificação cruzada de todos os 37 requisitos gerados face aos passos, exceções e regras de negócio do `UC-VID-002`, correção de critérios de aceitação ambíguos e eliminação de requisitos órfãos. |

---

## 4. Especificação de Requisitos do Sistema (ERS) e Derivação

> **Nota de Versionamento (Aula 01 $\rightarrow$ Aula 02)**: Os requisitos foram normalizados segundo o formato *"O sistema deve [ação] [objeto] [condição/restrição]"* e classificados entre Requisitos Funcionais e Requisitos Não Funcionais segundo a norma **ISO/IEC 25010**.

### 4.1 Requisitos Funcionais (RF)

| **ID** | **Descrição do Requisito** | **Prior.** | **Novo/Alt** | **Origem (UC / Decisão)** | **Justificação** | **Critério de Aceitação (Como Verificar)** |
|--------|----------------------------|------------|--------------|---------------------------|------------------|--------------------------------------------|
| `REQ-VID-PLAY-001` | O sistema deve permitir a reprodução de vídeos na plataforma aos utilizadores autenticados com perfil Registado ou Premium. | Deve ter | Alt | UC-VID-002 · Ator principal; RN5 | Alinha o acesso às funcionalidades de vídeo com os perfis autenticados do modelo SaaS. | Dado um utilizador Registado e um Premium com vídeos válidos, quando selecionam a opção de reproduzir, então o leitor inicia a reprodução em ambos os perfis. |
| `REQ-VID-PLAY-002` | O sistema deve apresentar ao utilizador autenticado a lista dos vídeos existentes na sua biblioteca pessoal, incluindo título, duração, resolução e estado. | Deve ter | Novo | UC-VID-002 · Passo 1 | Permite ao utilizador identificar e escolher o vídeo que pretende visualizar. | Dado um utilizador com 3 vídeos na biblioteca, quando abre a biblioteca de vídeos, então são listados exatamente esses 3 vídeos com os respetivos metadados. |
| `REQ-VID-PLAY-003` | O sistema deve permitir ao utilizador selecionar um vídeo listado na biblioteca para iniciar a sua reprodução no leitor *web*. | Deve ter | Novo | UC-VID-002 · Passo 2 | Constitui o ponto de entrada principal da interação de visualização. | Dada a lista de vídeos apresentada, quando o utilizador clica sobre um vídeo no estado *"Pronto"*, então o sistema abre o leitor *web* para esse vídeo. |
| `REQ-VID-PLAY-004` | O sistema deve verificar a existência do ficheiro de vídeo no armazenamento e o estado *"Pronto/Concluído"* no momento em que o utilizador o seleciona. | Deve ter | Novo | UC-VID-002 · Passo 2; E4 | Evita abrir o leitor para vídeos indisponíveis. | Dado um vídeo inexistente ou indisponível, quando o utilizador o selecionar, então a abertura do leitor deve ser bloqueada. |
| `REQ-VID-PLAY-005` | O sistema deve gerar um endereço de acesso temporário e criptograficamente assinado (*presigned URL*) sempre que um utilizador autorizado seleciona um vídeo válido para reprodução. | Deve ter | Novo | UC-VID-002 · Passo 2; RN2 | Permite ao leitor ler diretamente do armazenamento de objetos sem expor credenciais permanentes nem sobrecarregar o *backend*. | Dado um vídeo válido selecionado pelo seu proprietário, quando o pedido de reprodução é aceite, então é devolvida uma URL assinada contendo parâmetros de assinatura e expiração temporal. |
| `REQ-VID-PLAY-006` | O sistema deve transmitir o fluxo de vídeo para o leitor *web* de forma progressiva por blocos de bytes (*HTTP Range Requests*), sem exigir o descarregamento completo do ficheiro antes de iniciar a reprodução. | Deve ter | Novo | UC-VID-002 · Passo 3; A1 | Ficheiros de vídeo são demasiado grandes para descarregamento integral prévio; essencial para baixa latência inicial. | Dado um vídeo de 100 MB, quando o utilizador inicia a reprodução, então o servidor responde com código `206 Partial Content` e a reprodução arranca com apenas uma fração do ficheiro transferida. |
| `REQ-VID-PLAY-007` | O sistema deve apresentar e iniciar a reprodução audiovisual do vídeo no leitor *web* assim que o *buffer* inicial de transmissão esteja preenchido. | Deve ter | Novo | UC-VID-002 · Passo 3 | Garante feedback audiovisual imediato ao utilizador após a seleção. | Dado um vídeo válido selecionado, quando os primeiros blocos de dados são recebidos pelo leitor, então a imagem e o áudio são reproduzidos no ecrã. |
| `REQ-VID-PLAY-008` | O sistema deve permitir ao utilizador pausar a reprodução de um vídeo em curso a qualquer instante. | Deve ter | Novo | UC-VID-002 · Passo 4 | Controlo essencial para inspeção visual de fotogramas específicos no PictuRAS. | Dado um vídeo em reprodução no instante $t$, quando o utilizador aciona *pause*, então a imagem e o som param imediatamente e o leitor mantém-se fixo no fotograma do instante $t$. |
| `REQ-VID-PLAY-009` | O sistema deve permitir ao utilizador retomar a reprodução de um vídeo previamente pausado a partir do exato instante em que se encontrava. | Deve ter | Novo | UC-VID-002 · Passo 4 | Garante continuidade na visualização sem perda de posição temporal. | Dado um vídeo pausado no instante `01:15`, quando o utilizador aciona *play*, então a reprodução recomeça a partir de `01:15`. |
| `REQ-VID-PLAY-010` | O sistema deve permitir ao utilizador avançar ou recuar para qualquer instante temporal do vídeo através da barra de progresso (*seek*), solicitando o respetivo segmento de bytes caso ainda não esteja em *buffer*. | Deve ter | Novo | UC-VID-002 · Passo 4; FA2; A1 | Permite navegar rapidamente em vídeos longos sem esperar pelo carregamento sequencial até esse ponto. | Dado um vídeo de 3 minutos no instante `00:05`, quando o utilizador clica no instante `02:30` da barra de tempo, então o leitor efetua um pedido parcial para essa posição e reproduz a partir de `02:30`. |
| `REQ-VID-PLAY-011` | O sistema deve permitir ao utilizador ajustar o nível de volume do áudio e silenciar/ativar o som (*mute/unmute*) durante a reprodução. | Deveria ter | Novo | UC-VID-002 · Passo 4 | Controlo padrão de comodidade na reprodução multimédia. | Dado um vídeo com áudio em reprodução, quando o utilizador altera o cursor de volume para 50% ou ativa *mute*, então a intensidade sonora do leitor reflete imediatamente a alteração. |
| `REQ-VID-PLAY-012` | O sistema deve terminar a reprodução quando o vídeo atinge o último fotograma, mantendo o leitor aberto no final com a opção de repetir a visualização (*replay*). | Deve ter | Novo | UC-VID-002 · Passo 5; FA4 | Evita fechos abruptos que impeçam o utilizador de observar a parte final do vídeo. | Dado um vídeo de 10 s em reprodução, quando atinge os 10 s, então a reprodução pausa no último fotograma sem erro e disponibiliza o controlo de repetir. |
| `REQ-VID-PLAY-013` | O sistema deve permitir ao utilizador fechar o leitor *web* a qualquer momento e regressar à biblioteca. | Deve ter | Novo | UC-VID-002 · Passo 5; FA3 | Preserva o contexto de navegação do utilizador na aplicação. | Dado um vídeo aberto a partir da biblioteca, quando o utilizador clica em fechar o leitor, então o leitor encerra e a biblioteca é apresentada. |
| `REQ-VID-PLAY-015` | O sistema deve cancelar a transmissão de rede ativa e libertar o *buffer* do leitor sempre que o utilizador fecha o leitor antes do término do vídeo. | Deveria ter | Novo | UC-VID-002 · FA3 | Evita desperdício de largura de banda e memória no cliente e no servidor. | Dado um vídeo em reprodução e carregamento a meio, quando o utilizador fecha o leitor, então deixam de existir pedidos HTTP de transmissão ativos para esse vídeo no navegador. |
| `REQ-VID-PLAY-016` | O sistema deve apresentar a mensagem *"O seu navegador não suporta o codec deste vídeo (ex.: H.265)"* sempre que o navegador não consiga descodificar o fluxo de vídeo ou áudio. | Deve ter | Novo | UC-VID-002 · E1; A4 | Informa claramente o utilizador quando a limitação reside no suporte de codecs do seu navegador. | Dado um vídeo codificado com um codec não suportado pelo navegador de teste, quando o utilizador tenta reproduzi-lo, então a reprodução não inicia e a mensagem explícita é exibida. |
| `REQ-VID-PLAY-017` | O sistema deve pausar automaticamente a reprodução e preservar o instante temporal atual quando a ligação de rede falha e o *buffer* local se esgota. | Deve ter | Novo | UC-VID-002 · E2 | Impede que o leitor perca a posição de visualização durante quebras de rede. | Dado um vídeo em reprodução no instante $t$, quando a ligação de rede é cortada e o *buffer* termina, então o leitor entra em pausa mantendo o cursor no instante $t$. |
| `REQ-VID-PLAY-018` | O sistema deve apresentar a mensagem *"Erro de transmissão. Verifique a sua ligação à Internet"* quando a reprodução é interrompida por falha de conectividade. | Deve ter | Novo | UC-VID-002 · E2 | Comunica de forma inequívoca a origem da interrupção ao utilizador. | Dada uma reprodução interrompida por corte de rede, quando a falha é detetada pelo leitor, então a mensagem de erro de transmissão é apresentada no ecrã do leitor. |
| `REQ-VID-PLAY-019` | O sistema deve disponibilizar um botão *"Tentar novamente"* no leitor *web* sempre que ocorra uma interrupção por falha de transmissão de rede. | Deve ter | Novo | UC-VID-002 · E2 | Dá ao utilizador controlo direto para recuperar da falha sem recarregar a página. | Dada a apresentação da mensagem de erro de transmissão por falha de rede, então o botão *"Tentar novamente"* encontra-se visível e clicável no leitor. |
| `REQ-VID-PLAY-020` | O sistema deve retomar a transmissão e a reprodução do vídeo a partir do instante em que foi interrompida quando o utilizador aciona o botão *"Tentar novamente"* após restabelecimento da ligação. | Deveria ter | Novo | UC-VID-002 · E2; A6 | Evita que o utilizador tenha de procurar manualmente o ponto onde estava antes da falha de rede. | Dada uma reprodução interrompida aos `00:45` por falha de rede e a ligação restabelecida, quando o utilizador clica em *"Tentar novamente"*, então a reprodução recomeça a partir de `00:45`. |
| `REQ-VID-PLAY-021` | O sistema deve renovar automaticamente em segundo plano o endereço de acesso temporário quando este expira durante uma sessão de reprodução ativa de um utilizador autenticado. | Deveria ter | Novo | UC-VID-002 · E3a; RN2 | Garante que pausas prolongadas ou vídeos longos não falhem abruptamente a meio da visualização devido à expiração da URL temporária. | Dado um acesso temporário com validade configurada para 1 min em ambiente de teste, quando expira durante a reprodução ou num *seek* aos 2 min com sessão ativa, então o sistema obtém nova URL e a reprodução prossegue sem erro. |
| `REQ-VID-PLAY-022` | O sistema deve apresentar a mensagem *"O vídeo já não se encontra disponível"* caso o utilizador selecione um vídeo cujo ficheiro físico tenha sido eliminado ou expirado. | Deve ter | Novo | UC-VID-002 · E4; RN7 | Trata de forma controlada estados de dessincronização entre a vista aberta e o armazenamento. | Dado um vídeo cujo ficheiro foi removido/expirou após o carregamento da lista, quando o utilizador clica para o reproduzir, então a mensagem de indisponibilidade é apresentada. |
| `REQ-VID-PLAY-023` | O sistema deve atualizar a lista de vídeos removendo ou marcando como expirado o registo do vídeo cuja indisponibilidade foi detetada. | Deveria ter | Novo | UC-VID-002 · E4 | Evita que o utilizador volte a clicar num item inexistente na mesma sessão. | Dada a deteção de vídeo indisponível em `E4`, quando o utilizador fecha o aviso, então o vídeo já não aparece como selecionável na lista. |
| `REQ-VID-PLAY-024` | O sistema deve suportar a reprodução de ficheiros de vídeo encapsulados nos contentores **MP4** e **MOV**. | Deve ter | Novo | UC-VID-002 · RN1 | Cobre os formatos de contentor multimédia padrão da indústria e da *web*. | Dados três ficheiros válidos (`.mp4`, `.mov`) com codecs suportados, quando selecionados, todos são reproduzidos com sucesso no leitor. |
| `REQ-VID-PLAY-025` | O sistema deve suportar a transmissão e reprodução de fluxos de vídeo codificados em **H.264 (AVC)**, **H.265 (HEVC)**, **VP8** e **VP9**, nos navegadores compatíveis com o respetivo codec. | Deve ter | Novo | UC-VID-002 · RN1; A4 | Assegura compatibilidade com os codecs de captura e edição mais comuns. | Dado um vídeo de teste para cada codec num navegador com suporte nativo para o mesmo, quando selecionado, a imagem é descodificada e apresentada corretamente. |
| `REQ-VID-PLAY-026` | O sistema deve suportar a transmissão e reprodução de faixas de áudio codificadas em **AAC**, **HE-AAC** e **Opus**, nos navegadores compatíveis. | Deve ter | Novo | UC-VID-002 · RN1; A4 | Garante a reprodução correta da componente sonora associada aos contentores MP4 e MOV. | Dado um vídeo com cada um dos três codecs de áudio, quando reproduzido num navegador compatível, o som é emitido sem distorção ou erro. |
| `REQ-VID-PLAY-027` | O sistema de armazenamento deve recusar qualquer pedido de leitura de vídeo efetuado através de um endereço de acesso temporário cujo prazo de validade tenha expirado. | Deve ter | Novo | UC-VID-002 · RN2; E3 | Impede que links partilhados ou intercetados continuem a dar acesso ao ficheiro indefinidamente. | Dada uma URL pré-assinada expirada, quando é efetuado um pedido HTTP `GET` diretamente para essa URL, então o servidor devolve código de erro `403 Forbidden`. |
| `REQ-VID-PLAY-029` | O sistema deve restringir a geração de endereços de transmissão e a reprodução de um vídeo exclusivamente ao utilizador proprietário desse vídeo. | Deve ter | Novo | UC-VID-002 · RN4; E5 | Garante a confidencialidade e o isolamento de dados entre contas no ambiente *multi-tenant*. | Dado um vídeo pertencente ao Utilizador A, quando o Utilizador B tenta solicitar a sua reprodução via interface ou API, então o sistema recusa com código `403 Forbidden`. |
| `REQ-VID-PLAY-030` | O sistema deve bloquear o acesso à biblioteca e à funcionalidade de reprodução de vídeo a utilizadores com perfil Anónimo. | Deve ter | Novo | UC-VID-002 · RN5; E5 | Sustenta o modelo de negócio de captação de registos e controla os custos de transferência de dados. | Dado um utilizador não autenticado (Anónimo), quando tenta aceder ao módulo de reprodução de vídeo, então o sistema impede o acesso e não gera qualquer URL de transmissão. |
| `REQ-VID-PLAY-031` | O sistema deve apresentar ao Utilizador Anónimo uma mensagem informativa indicando que a reprodução de vídeos requer a criação ou autenticação numa conta registada. | Deve ter | Novo | UC-VID-002 · E5; RN5 | Esclarece a restrição de perfil e promove a conversão para Utilizador Registado. | Dado um utilizador Anónimo que tenta aceder à funcionalidade de vídeo, então é exibida a mensagem informativa com opção de acesso ao ecrã de Login/Registo. |
| `REQ-VID-PLAY-032` | O sistema deve preservar o ficheiro de vídeo e os seus metadados totalmente inalterados no armazenamento durante e após a reprodução, independentemente de esta terminar com sucesso ou com falha. | Deve ter | Novo | UC-VID-002 · Pós-condições | A operação de reprodução tem de ser estritamente idempotente e de leitura (*read-only*). | Dado um vídeo com *hash* SHA-256 conhecido, após uma reprodução completa e uma reprodução interrompida por erro, o *hash* e os metadados do ficheiro no armazenamento permanecem idênticos. |
| `REQ-VID-PLAY-033` | O sistema deve apresentar ao utilizador uma mensagem de erro específica e compreensível sempre que a reprodução não possa iniciar ou seja abortada (distinguindo codec incompatível, falha de rede, vídeo indisponível, ficheiro corrompido ou limite de perfil). | Deve ter | Novo | UC-VID-002 · Pós-condição (Garantia Mínima); E1–E7 | Evita falhas silenciosas ou mensagens genéricas que impeçam o utilizador de compreender o problema. | Dada a injeção de cada uma das condições de exceção (`E1` a `E7`), quando a exceção ocorre, então o sistema exibe a mensagem correspondente à causa específica. |
| `REQ-VID-PLAY-043` | O sistema deve apresentar um indicador visual de carregamento (*buffering*) e a percentagem/barra de *buffer* transferido sempre que o leitor aguarde dados para iniciar a reprodução ou concluir um salto temporal (*seek*). | Deve ter | Novo | UC-VID-002 · Passo 3; FA2; Decisão de Usabilidade (Aula 02) | Em ficheiros de vídeo grandes, o carregamento não é instantâneo; o utilizador precisa de distinguir entre carregamento normal e bloqueio da aplicação. | Dado um salto na barra de tempo para uma zona não carregada numa ligação de 10 Mbit/s, enquanto os bytes são recebidos, é exibido um indicador de *buffering* no leitor. |

---

### 4.2 Requisitos Não Funcionais (RNF — Classificados segundo a ISO/IEC 25010)

> Conforme exigido no **Exercício 2**, cada requisito não funcional distingue explicitamente o **Alvo MVP (Fase 1)** — exequível na validação funcional inicial — do **Alvo Produção (Fase 2)** — meta para a fase de *refactoring* e maturidade arquitetural.

| **ID** | **Descrição do Requisito** | **Característica ISO/IEC 25010** *(Subcaracterística)* | **Origem (UC / Decisão)** | **Alvo MVP (Fase 1)** | **Alvo Produção (Fase 2)** | **Critério de Aceitação (Como Verificar)** |
|--------|----------------------------|--------------------------------------------------------|---------------------------|-----------------------|----------------------------|--------------------------------------------|
| `REQ-VID-PLAY-034` | O sistema deve iniciar a reprodução do vídeo (apresentação do primeiro fotograma após seleção) dentro do tempo limite estipulado, numa ligação de referência de 10 Mbit/s. | **Eficiência de Desempenho** *(Comportamento Temporal)* | UC-VID-002 · Passo 3; A5; DQ1 | $\le 5\text{ s}$ (para vídeos até 200 MB) | $\le 1,5\text{ s}$ (independentemente da dimensão, via CDN/HLS) | Medição do tempo desde o clique no vídeo até ao evento `playing` do leitor HTML5 num ficheiro de 200 MB a 10 Mbit/s, em 5 execuções consecutivas. |
| `REQ-VID-PLAY-035` | O sistema deve retomar a reprodução após o utilizador selecionar outro instante na barra de tempo (*seek* para região fora de *buffer*) dentro do tempo limite estipulado, numa ligação de 10 Mbit/s. | **Eficiência de Desempenho** *(Comportamento Temporal)* | UC-VID-002 · Passo 4; FA2; A5; DQ1 | $\le 3\text{ s}$ | $\le 1\text{ s}$ | Medição do intervalo entre os eventos `seeking` e `seeked`/`playing` num vídeo de 200 MB a 10 Mbit/s, em 5 saltos temporais distintos. |
| `REQ-VID-PLAY-036` | O sistema deve detetar a interrupção de transmissão por falha de rede e apresentar a respetiva mensagem de erro e opção de retoma dentro do tempo limite estipulado após o esgotamento do *buffer*. | **Fiabilidade / Usabilidade** *(Tolerância a Falhas / Operabilidade)* | UC-VID-002 · E2; A5; DQ2 | $\le 10\text{ s}$ (com retoma manual via botão) | $\le 3\text{ s}$ (com *retry* automático com *exponential backoff*) | Corte simulado de rede (DevTools *Offline*) durante a reprodução; medição do tempo desde a paragem do vídeo até à exibição do alerta de erro. |
| `REQ-VID-PLAY-037` | O sistema deve limitar o tempo de vida (*TTL*) de cada endereço temporário pré-assinado (*presigned URL*) de acesso ao ficheiro de vídeo. | **Segurança** *(Confidencialidade / Autenticidade)* | UC-VID-002 · RN2; A5; DQ3 | **30 minutos** | **5 minutos** (com renovação automática de *tokens* de curta duração) | Inspeção do parâmetro `X-Amz-Expires` na URL gerada ($\le 1800\text{ s}$ no MVP) e verificação de que um pedido após esse prazo devolve `403 Forbidden`. |
| `REQ-VID-PLAY-044` | O serviço aplicacional (*backend*) deve processar o pedido de reprodução (validação de permissões e geração da URL pré-assinada) e responder ao cliente dentro do tempo limite estipulado. | **Eficiência de Desempenho** *(Comportamento Temporal)* | UC-VID-002 · Passo 2; DQ1 | $\le 500\text{ ms}$ (p95) | $\le 100\text{ ms}$ (p95) | Teste ao *endpoint* de pedido de reprodução com 20 pedidos sequenciais; o percentil 95 do tempo de resposta da API deve ser inferior a 500 ms no MVP. |
| `REQ-VID-PLAY-045` | O sistema deve suportar múltiplas sessões de transmissão de vídeo concorrentes sem degradação superior a 20% na latência de início de reprodução. | **Eficiência de Desempenho** *(Capacidade)* | DQ1 (Capacidade de *Streaming*) | **10 *streams* simultâneos** | **200 *streams* simultâneos** | Teste de carga com 10 clientes simultâneos a solicitar *byte-ranges* de vídeos de 100 MB; todas as sessões iniciam em $\le 5\text{ s}$ sem erros `5xx`. |
| `REQ-VID-PLAY-046` | A transmissão dos bytes de vídeo deve ocorrer diretamente entre o armazenamento de objetos (MinIO/S3) e o navegador do utilizador (ou *gateway* dedicado), sem carregar o ficheiro completo em memória RAM no servidor aplicacional. | **Eficiência de Desempenho** *(Utilização de Recursos)* | UC-VID-002 · Passo 3; RN2; DQ1 | Consumo de RAM da API principal $\le 5\text{ MB}$ por pedido de reprodução | Isolamento total via CDN / *Edge Streaming* (0 MB de tráfego de vídeo na API) | Monitorização da memória do contentor da API durante a reprodução simultânea de 5 vídeos de 500 MB; o consumo de memória da API mantém-se estável. |
| `REQ-VID-PLAY-047` | As URLs de acesso aos vídeos devem ser criptograficamente assinadas (HMAC-SHA256) e utilizar identificadores únicos não sequenciais (UUIDv4), impedindo a enumeração ou adivinhação de URLs de outros utilizadores. | **Segurança** *(Confidencialidade / Integridade)* | UC-VID-002 · RN2, RN4; DQ3 | Obrigatório (UUIDv4 + Assinatura S3/MinIO) | Obrigatório + restrição de IP/Sessão e cabeçalhos CORS estritos | Tentativa de adulteração de 1 carácter na URL ou no parâmetro de assinatura; o armazenamento rejeita imediatamente com código `403 Forbidden`. |
| `REQ-VID-PLAY-048` | Uma falha na transmissão ou fecho inesperado do navegador durante a reprodução deve manter o sistema num estado consistente, sem bloquear o ficheiro para futuras reproduções ou ferramentas de edição. | **Fiabilidade** *(Recuperabilidade / Disponibilidade)* | UC-VID-002 · Pós-condição (Garantia Mínima); DQ2 | Obrigatório (estado consistente imediato) | Obrigatório + telemetria automática de falhas de reprodução | Encerramento abrupto do separador a meio de um *stream*; abertura imediata de nova sessão e confirmação de que o vídeo reproduz e pode ser editado sem bloqueios (*locks*). |
| `REQ-VID-PLAY-049` | O leitor *web* deve funcionar sem necessidade de *plugins* externos nos principais navegadores modernos que suportem HTML5 Media Source / `<video>`. | **Compatibilidade / Portabilidade** *(Coexistência / Adaptabilidade)* | UC-VID-002 · Pré-condições; RN1; DQ5 | Últimas 2 versões de **Chrome** e **Firefox** (Desktop) | Chrome, Firefox, Safari e Edge (Desktop e Mobile, com *fallback* de codec automático) | Execução do cenário principal (`UC-VID-002`) para um vídeo MP4 (H.264/AAC) no Chrome e no Firefox sem erros de consola. |
| `REQ-VID-PLAY-051` | A camada de geração de URLs temporárias e transmissão deve abstrair o serviço de armazenamento de objetos através do protocolo S3 standard e contentores Docker isolados. | **Portabilidade** *(Substituibilidade / Instalabilidade)* | A1; DQ7 (Isolamento de Dependências Externas) | Armazenamento isolado em contentor Docker (MinIO) | Substituível entre MinIO local e AWS S3 / GCS apenas por variáveis de ambiente | Alteração do *endpoint* e credenciais S3 nas variáveis de ambiente sem recompilar o código aplicacional; a geração de URLs e reprodução continuam funcionais. |
| `REQ-VID-PLAY-052` | O leitor *web* deve atualizar o progresso temporal (tempo atual, duração total e barra de *buffer*) de forma contínua e apresentar estados visuais distintos para *"A carregar"*, *"Em reprodução"*, *"Em pausa"* e *"Erro"*. | **Usabilidade** *(Reconhecibilidade de Adequação / Operabilidade)* | UC-VID-002 · Passos 3 e 4; E1–E6; DQ4 | Atualização da barra $\ge 1\text{ Hz}$ e mensagens textuais claras | Controlos acessíveis por teclado (WCAG 2.1 AA) e pré-visualização de *thumbnails* na barra de *seek* | Inspeção visual e teste funcional dos 4 estados do leitor durante o ciclo de vida completo de uma reprodução e de uma falha injetada. |

---

### 4.3 Registo de Decisões de Qualidade (Aula 02)

Para fundamentar a rastreabilidade dos novos Requisitos Não Funcionais e Funcionais de Serviço introduzidos na ERS, registam-se as seguintes decisões arquiteturais e de qualidade tomadas pela equipa:

* **DQ1 (Desempenho e Capacidade de *Streaming*)**: Adotar transmissão progressiva via *HTTP Range Requests* (`206 Partial Content`) diretamente a partir do armazenamento de objetos através de *presigned URLs*, evitando que o fluxo binário do vídeo atravesse o servidor de aplicação e fixando metas diferenciadas entre o MVP (progressive download) e a Produção (CDN/HLS).
* **DQ2 (Fiabilidade e Tolerância a Falhas)**: Garantir que qualquer interrupção de rede ou expiração de token preserva o instante atual (`currentTime`) no cliente e mantém o vídeo livre de *locks* no armazenamento.
* **DQ3 (Segurança e Controlo de Acesso)**: Isolar o acesso aos vídeos por utilizador proprietário (`RN4`) e limitar as URLs pré-assinadas a 30 minutos no MVP (5 minutos em Produção), com identificadores UUIDv4 não enumeráveis.
* **DQ5 (Compatibilidade de Formatos e Browsers)**: Suportar MP4 e MOV no MVP recorrendo ao descodificador nativo HTML5 do navegador (Chrome/Firefox), diferindo a transcodificação automática em servidor para a Fase 2.
* **DQ7 (Portabilidade da Infraestrutura)**: Isolar o armazenamento de objetos em contentor dedicado (MinIO) acedido exclusivamente via API compatível com o standard S3.

---

### 4.4 Impacto no Sistema Existente (Análise *Brownfield*)

| **Elemento Existente Afetado** | **Impacto** | **Descrição Detalhada do Impacto** | **Requisitos Relacionados** |
|--------------------------------|-------------|------------------------------------|------------------------------|
| **Perfis de Utilização** *(Anónimo, Registado, Premium)* | **Estender** | A reprodução de vídeo fica disponível para os perfis **Registado** e **Premium**, introduzindo limites diferenciados de tamanho, duração, resolução e transmissões simultâneas (`RN6`). O perfil **Anónimo** continua sem acesso a vídeo (`RN5`). | `REQ-VID-PLAY-001`, `029`, `030`, `031`, `039` |

---

### 4.5 Matriz de Rastreabilidade Bidirecional Atualizada

| **Origem (Elemento do Caso de Uso / Decisão)** | **Descrição Abreviada** | **Requisitos Funcionais (RF)** | **Requisitos Não Funcionais (RNF)** |
|------------------------------------------------|-------------------------|--------------------------------|-------------------------------------|
| **Ator Principal & RN5** | Elegibilidade dos perfis Registado/Premium e exclusão do Anónimo | `REQ-VID-PLAY-001`, `030`, `031` | — |
| **Pré-condições** | Sessão ativa, vídeo registado e suporte do navegador HTML5 | `REQ-VID-PLAY-001`, `004` | `REQ-VID-PLAY-049` |
| **Passo 1** | Abrir a biblioteca e apresentar lista de vídeos com metadados e estado | `REQ-VID-PLAY-002` | — |
| **Passo 2** | Selecionar vídeo, validar existência/estado/limites e gerar URL temporária | `REQ-VID-PLAY-003`, `004`, `005`, `039` | `REQ-VID-PLAY-037`, `044`, `047` |
| **Passo 3** | Iniciar transmissão parcial (*streaming*), *buffering* e reprodução no leitor | `REQ-VID-PLAY-006`, `007`, `043` | `REQ-VID-PLAY-034`, `045`, `046`, `052` |
| **Passo 4** | Interagir com controlos (*pause*, *play*, *seek*, *volume*) | `REQ-VID-PLAY-008`, `009`, `010`, `011`, `042` | `REQ-VID-PLAY-035`, `052` |
| **Passo 5** | Fim da reprodução ou fecho do leitor e regresso à vista de origem | `REQ-VID-PLAY-012`, `013` | — |
| **FA2** | *Seek* para instante fora de *buffer* com indicador de carregamento | `REQ-VID-PLAY-010`, `043` | `REQ-VID-PLAY-035` |
| **FA3** | Fechar o leitor antes do fim e interromper transmissão de rede | `REQ-VID-PLAY-013`, `015` | `REQ-VID-PLAY-046` |
| **FA4** | Repetir a reprodução (*replay*) após atingir o último fotograma | `REQ-VID-PLAY-012` | — |
| **E1** | Codec de vídeo ou áudio não suportado pelo navegador | `REQ-VID-PLAY-016`, `033` | `REQ-VID-PLAY-049`, `052` |
| **E2** | Falha de ligação de rede durante a reprodução e retoma no instante $t$ | `REQ-VID-PLAY-017`, `018`, `019`, `020`, `033` | `REQ-VID-PLAY-036`, `052` |
| **E3 (E3a / E3b)** | Expiração do acesso temporário durante a reprodução e renovação | `REQ-VID-PLAY-021`, `027` | `REQ-VID-PLAY-037` |
| **E5** | Tentativa de acesso por Utilizador Anónimo ou utilizador não proprietário | `REQ-VID-PLAY-029`, `030`, `031`, `033` | `REQ-VID-PLAY-047` |
| **E6** | Ficheiro de vídeo corrompido ou ilegível | `REQ-VID-PLAY-033` | `REQ-VID-PLAY-048` |
| **E7** | Limite de transmissões simultâneas excedido para o perfil | `REQ-VID-PLAY-033`, `039` | `REQ-VID-PLAY-045` |
| **RN1** | Formatos (MP4, MOV) e codecs de vídeo/áudio suportados | `REQ-VID-PLAY-024`, `025`, `026` | `REQ-VID-PLAY-049` |
| **RN2** | Acesso seguro por URL pré-assinada temporária | `REQ-VID-PLAY-005`, `021`, `027` | `REQ-VID-PLAY-037`, `046`, `047`, `051` |
| **RN3** | Reprodução isenta de consumo da quota diária de operações | `REQ-VID-PLAY-028` | — |
| **RN4** | Privacidade: reprodução restrita ao utilizador proprietário | `REQ-VID-PLAY-029` | `REQ-VID-PLAY-047` |
| **RN6** | Limites de tamanho, duração, resolução e *streams* por perfil | `REQ-VID-PLAY-039` | `REQ-VID-PLAY-045` |
| **Pós-condições** | Garantia de Sucesso e Garantia Mínima (integridade, quota e erros claros) | `REQ-VID-PLAY-028`, `032`, `033` | `REQ-VID-PLAY-048` |
