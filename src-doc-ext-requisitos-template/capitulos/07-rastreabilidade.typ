#import "../template.typ": *

= Rastreabilidade

== Casos de uso → requisitos

#tab([Matriz de rastreabilidade: casos de uso → requisitos],
  tabela(
    colunas: (4.2cm, 1fr, 4.8cm),
    tamanho: 8.5pt,
    [Elemento de origem], [Descrição abreviada], [Requisito(s)],

    // --- UC-VID-001 (Recorte) ---
    [UC-VID-001, Trigger], [Utilizador seleciona vídeo e escolhe "Recortar"], [REQ-VID-TRIM-003],
    [UC-VID-001, Passo 1], [Apresentar biblioteca e quota de operações restantes], [REQ-VID-LIB-002, REQ-VID-TRIM-002, 059],
    [UC-VID-001, Passo 2], [Selecionar vídeo, verificar formato/codec e recortes em curso], [REQ-VID-TRIM-003, 036, 043, 050],
    [UC-VID-001, Passo 3], [Abrir ecrã de recorte com reprodutor e duração total], [REQ-VID-TRIM-004],
    [UC-VID-001, Passo 4], [Definir e validar intervalo temporal (precisão 1s) e mostrar duração], [REQ-VID-TRIM-005, 006, 026, 037, 038, 039, 040],
    [UC-VID-001, Passo 5], [Escolher formato/nome e apresentar resumo do pedido], [REQ-VID-TRIM-007, 008, 009, 010, 011],
    [UC-VID-001, Passo 6], [Confirmar pedido com "Iniciar Recorte"], [REQ-VID-TRIM-012, 057],
    [UC-VID-001, Passo 7], [Validar quota/espaço, reservar 1 operação e registar Em fila], [REQ-VID-TRIM-013, 014, 042, 057, 062],
    [UC-VID-001, Passo 8], [Regressar à biblioteca e iniciar processamento assíncrono], [REQ-VID-TRIM-014, 015, 057, 058],
    [UC-VID-001, Passo 9], [Passar a A processar e atualizar progresso (%)], [REQ-VID-TRIM-016, 017, 053],
    [UC-VID-001, Passo 10], [Consultar estado e progresso do trabalho], [REQ-VID-TRIM-018, 019, 059],
    [UC-VID-001, Passo 11], [Guardar novo vídeo, passar a Concluído e consumir operação], [REQ-VID-TRIM-020, 021, 022, 063],
    [UC-VID-001, Passo 12], [Notificar utilizador do desfecho dentro da aplicação], [REQ-VID-TRIM-023],
    [UC-VID-001, Passo 13], [Abrir, reproduzir e descarregar o vídeo recortado], [REQ-VID-TRIM-024, 025, 059],
    [UC-VID-001, FA1], [Aviso e confirmação para intervalo igual à duração total], [REQ-VID-TRIM-026, 027],
    [UC-VID-001, FA2], [Cancelar pedido Em fila ou A processar], [REQ-VID-TRIM-028, 029, 030, 031, 032, 033, 056],
    [UC-VID-001, FA3], [Sessão terminada/fechada durante o processamento], [REQ-VID-TRIM-034, 035, 058],
    [UC-VID-001, E1], [Rejeição por formato/codec não suportado], [REQ-VID-TRIM-036, 050],
    [UC-VID-001, E2], [Tratamento e desativação para intervalo inválido], [REQ-VID-TRIM-037, 038, 039, 040, 041],
    [UC-VID-001, E3], [Recusa de pedido por quota diária esgotada], [REQ-VID-TRIM-042],
    [UC-VID-001, E4], [Recusa por limite de recortes ativos atingido], [REQ-VID-TRIM-043],
    [UC-VID-001, E5], [Tratamento de falha de processamento (1 repetição e limpeza)], [REQ-VID-TRIM-044, 045, 046, 047, 056],
    [UC-VID-001, E6], [Bloqueio de eliminação do vídeo de origem durante recorte], [REQ-VID-LIB-058],
    [UC-VID-001, E7], [Gestão de limite de armazenamento livre excedido], [REQ-VID-TRIM-062, 063],
    [UC-VID-001, Pós-Sucesso], [Novo vídeo autónomo, original intacto, Concluído e quota consumida], [REQ-VID-TRIM-020, 021, 022, 023, 054, 055],
    [UC-VID-001, Pós-Mínima], [Original intacto, ficheiros limpos, quota devolvida, Falhou/Cancelado], [REQ-VID-TRIM-032, 033, 045, 046, 047, 054, 056, 063],

    // --- UC-VID-002 (Biblioteca) ---
    [UC-VID-002, Passo 1], [Consultar biblioteca, metadados e painel de carregamentos], [REQ-VID-LIB-001, 002, 061],
    [UC-VID-002, Passos 2–3], [Selecionar ficheiro local e apresentar resumo de pré-submissão], [REQ-VID-LIB-003, 004, 005, 006, 041],
    [UC-VID-002, Passos 4–5], [Criar registo A carregar, efetuar upload e atualizar progresso (%)], [REQ-VID-LIB-007, 008, 009, 010, 015, 017, 018, 050],
    [UC-VID-002, Passos 6–7], [Passar a A validar, validar codecs/integridade e extrair metadados], [REQ-VID-LIB-012, 016, 019, 020, 022, 023, 024, 046, 051, 052, 055, 056],
    [UC-VID-002, Passo 8], [Guardar no armazenamento, atualizar quota e passar a Disponível], [REQ-VID-LIB-028, 029, 059],
    [UC-VID-002, FA2], [Cancelar upload durante estado A carregar], [REQ-VID-LIB-012, 013],
    [UC-VID-002, FA5], [Eliminar vídeo Disponível e libertar armazenamento], [REQ-VID-LIB-033, 057, 058],
    [UC-VID-002, E1], [Bloqueio e redirecionamento de utilizadores Anónimos], [REQ-VID-LIB-048, 049],
    [UC-VID-002, E2–E9], [Validação autoritária de limites/codecs e estado Rejeitado], [REQ-VID-LIB-014, 015, 016, 017, 035, 036, 037, 038, 047, 050, 051, 052, 053, 054, 055],

    // --- UC-VID-003 (Reprodução) ---
    [UC-VID-003, Passo 2], [Validar titularidade, limite de streams e emitir presigned URL], [REQ-VID-PLAY-004, 005, 029, 039],
    [UC-VID-003, Passo 3], [Transmissão progressiva (HTTP 206) e ativar leitor/controlos], [REQ-VID-PLAY-006, 007, 008, 042, 046],
    [UC-VID-003, FA2], [Salto temporal (seek) para área fora de buffer local], [REQ-VID-PLAY-010, 043],
    [UC-VID-003, FA3], [Fechar leitor e libertar contagem de streams ativos], [REQ-VID-PLAY-013, 015, 055],
    [UC-VID-003, E2], [Tratamento de quebra de rede com retoma no instante $t$], [REQ-VID-PLAY-017, 018, 019, 020, 036],
    [UC-VID-003, E3], [Renovação transparente ou bloqueio de URL temporário expirado], [REQ-VID-PLAY-021, 027, 037, 053],
  ),
)

== Decisões de qualidade

#tab([Decisões de qualidade do sistema de vídeo],
  tabela(
    colunas: (1.6cm, 1fr, 4.2cm, 3.2cm),
    [ID], [Decisão de qualidade], [Justificação], [Requisitos],
    [DQ-001], [Transmissão progressiva por segmentos via HTTP Range Requests (206) sobre presigned URLs de S3/MinIO, contornando a memória da API.], [Garante arranque rápido (≤5s) e reduz o consumo de RAM na API Gateway para ≤5MB por pedido.], [REQ-VID-PLAY-006, 034, 035, 044, 045, 046],
    [DQ-002], [Execução assíncrona desacoplada em fila de segundo plano para operações transformadoras (recorte) e eliminação transacional de ficheiros temporários.], [Desbloqueia a navegação do utilizador e garante 0 ficheiros órfãos em disco em caso de cancelamento ou falha.], [REQ-VID-TRIM-056, 057, 058, REQ-VID-LIB-013, 014],
    [DQ-003], [Acesso estrito e temporário a conteúdos de vídeo através de URLs assinadas com TTL ≤ 30 min no MVP e auditoria de tentativas indevidas.], [Impede a partilha prolongada de links, a enumeração de recursos e garante a privacidade entre utilizadores SaaS.], [REQ-VID-PLAY-027, 037, 047, 054, REQ-VID-LIB-032, 033],
    [DQ-004], [Feedback contínuo de progresso (%) com frequência mínima de atualização (≤2s em upload, ≤5s em recorte) e distinção de estados visuais.], [Elimina a incerteza do utilizador durante tarefas demoradas e articula o leitor com a máquina de estados assíncrona.], [REQ-VID-LIB-010, 040, REQ-VID-TRIM-053, REQ-VID-PLAY-033, 040, 043, 052],
    [DQ-005], [Isolamento do motor de processamento multimédia (FFmpeg) através de uma camada adaptadora interna dedicada.], [Assegura a portabilidade da solução e permite substituir ou atualizar o motor externo sem impactar a regra de negócio.], [REQ-VID-TRIM-061],
    [DQ-006], [Padronização da matriz de formatos no MVP: contentores MP4 e MOV com vídeo H.264 e áudio AAC (ou sem áudio).], [Garante compatibilidade de descodificação nativa nos navegadores sem necessidade de transcodificação on-the-fly pesada no MVP.], [REQ-VID-LIB-018, 019, 046, REQ-VID-PLAY-024, 025, REQ-VID-TRIM-050],
  ),
)

== Realização e verificação dos requisitos

#tab([Realização e verificação dos requisitos da extensão de vídeo],
  tabela(
    colunas: (3.2cm, 3.4cm, 2.2cm, 2.4cm, 1fr),
    tamanho: 8.5pt,
    [Requisito], [Componente(s)], [Estado], [Teste(s)], [Resultado / observações],

    [REQ-VID-LIB-001 a 031], 
    [Frontend, API Gateway, Video-Library-MS, MinIO], 
    [Implementado], 
    [TST-LIB-01 a 08], 
    [Passa. Ingestão, validação de metadados/codecs e gestão de biblioteca funcionais conforme os limites dos perfis.],

    [REQ-VID-LIB-032, 033, 048, 049], 
    [API Gateway, Video-Library-MS], 
    [Implementado], 
    [TST-SEC-01, 02], 
    [Passa. Acessos cruzados entre utilizadores e acessos de perfis Anónimos recusados com código 403/401.],

    [REQ-VID-TRIM-002, 013, 022, 032, 042, 046], 
    [Video-Tool-Trim-MS, Users-MS], 
    [Implementado], 
    [TST-TRIM-03, 04], 
    [Passa. Ciclo de vida transacional da quota diária (reserva, consumo e devolução em falha/cancelamento) validado.],

    [REQ-VID-TRIM-003 a 025], 
    [Frontend, API Gateway, Video-Tool-Trim-MS, RabbitMQ, FFmpeg-Worker], 
    [Implementado], 
    [TST-TRIM-01, 02], 
    [Passa. Processamento assíncrono de recorte concluído com sucesso e geração de novo vídeo autónomo na biblioteca.],

    [REQ-VID-TRIM-028 a 033], 
    [Frontend, Video-Tool-Trim-MS, RabbitMQ], 
    [Implementado], 
    [TST-TRIM-05], 
    [Passa. Interrupção imediata do worker, devolução de quota e remoção de dados parciais após cancelamento confirmado.],

    [REQ-VID-TRIM-044, 045, 056], 
    [Video-Tool-Trim-MS, FFmpeg-Worker], 
    [Implementado], 
    [TST-TRIM-06], 
    [Passa. Executada exatamente 1 repetição automática transparente após falha induzida e limpeza total de ficheiros temporários.],

    [REQ-VID-PLAY-004 a 013, 042], 
    [Frontend (VideoPlayer), API Gateway, MinIO], 
    [Implementado], 
    [TST-PLAY-01, 02], 
    [Passa. Transmissão por HTTP Range Requests (206) funcional com controlo de velocidade (0.5x–2x) e ecrã inteiro.],

    [REQ-VID-PLAY-021, 037, 053], 
    [API Gateway, MinIO], 
    [Implementado], 
    [TST-PLAY-03], 
    [Passa. URLs temporárias expiradas ao fim de 30 min e renovação transparente em sessões ativas confirmada.],

    [REQ-VID-PLAY-039, 055, 056], 
    [API Gateway, Video-Player-MS], 
    [Implementado], 
    [TST-PLAY-04], 
    [Passa. Limite de streams simultâneos (1 Registado; 3 Premium) cumprido e libertação automática após 45 s de inatividade.],
  ),
)