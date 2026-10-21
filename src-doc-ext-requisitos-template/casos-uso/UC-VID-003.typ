#import "../template.typ": *

// =============================================================================
//  CASO DE USO — UC-VID-003
// =============================================================================

== UC-VID-003 — Reproduzir Vídeo

=== Cabeçalho

#tab([Caso de uso UC-VID-003 — Reproduzir Vídeo],
  tabela-campos(
    [ID do Caso de Uso], [UC-VID-003],
    [Nome], [Reproduzir Vídeo],
    [Versão], [v2.3],
    [Autor], [Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Joaquim Cunha (PL5-G7)],
    [Data], [2026-10-18],
    [Objetivo], [Permitir que um utilizador autenticado visualize e controle a reprodução de um vídeo no estado Disponível (original ou resultante de processamento Concluído) diretamente no leitor web da aplicação, através de transmissão progressiva, sem necessidade de descarregar a totalidade do ficheiro previamente.],
    [Âmbito], [Módulo de Gestão e Visualização Multimédia do sistema PictuRAS],
    [Ator Principal], [Utilizador Registado / Utilizador Premium],
    [_Stakeholders_ e Interesses], [
      - *Utilizador Registado / Premium*: Pretende reproduzir os seus vídeos originais e processados de forma imediata, fluida, com controlo temporal (seek) rápido e sem consumir a sua quota diária de operações de edição.
      - *Proprietário do Sistema (PictuRAS SaaS)*: Pretende garantir que o acesso aos vídeos é estritamente privado, temporário e alinhado com os limites de cada escalão de subscrição, controlando os custos de largura de banda.
      - *Equipa de Desenvolvimento / Arquitetura*: Pretende desacoplar a entrega de vídeo da API principal através de endereços temporários assinados e transmissão parcial por segmentos.
    ],
    [Pré-condições], [
      - O utilizador encontra-se autenticado no sistema com sessão ativa e perfil Registado ou Premium.
      - Existe pelo menos um vídeo no estado Disponível associado à biblioteca do utilizador (UC-VID-002) ou ao resultado de um pedido de processamento no estado Concluído (UC-VID-001).
      - O navegador (browser) do utilizador suporta reprodução nativa de vídeo web e receção parcial de dados.
    ],
    [_Trigger_], [O utilizador seleciona a ação de reproduzir sobre um vídeo listado na sua biblioteca ou no painel de resultado de processamento.],
  ),
)

=== Fluxo Principal

#tab([UC-VID-003 — Fluxo principal],
  tabela(
    colunas: (1.2cm, 1fr, 1fr),
    [Passo], [Ação do Ator], [Resposta do Sistema],
    [1], [Acede à sua biblioteca de vídeos.], [Apresenta a lista de vídeos do utilizador no estado Disponível com os respetivos metadados (nome, duração, resolução, formato e tamanho) (REQ-VID-PLAY-002).],
    [2], [Seleciona um vídeo no estado Disponível para o reproduzir.], [Valida a titularidade do vídeo (RN4), confirma que o ficheiro existe no armazenamento e que o limite de transmissões simultâneas do perfil não foi excedido (RN1, RN6), e gera um endereço de acesso temporário assinado para leitura do vídeo (RN2, REQ-VID-PLAY-004, REQ-VID-PLAY-005).],
    [3], [—], [Abre a interface do leitor web, inicia a transmissão progressiva por segmentos a partir do início do ficheiro sem o descarregar na totalidade, apresenta o primeiro fotograma, inicia a reprodução audiovisual e ativa os controlos (play/pause, barra de progresso/seek, controlo de volume/mute, velocidade de reprodução e ecrã inteiro) (REQ-VID-PLAY-006, REQ-VID-PLAY-007).],
    [4], [Interage com os controlos de reprodução (pause, play, ajuste de volume, alteração de velocidade ou modo de ecrã inteiro).], [Aplica de imediato a ação solicitada sobre a reprodução em curso, atualizando o indicador de tempo atual face à duração total do vídeo (REQ-VID-PLAY-008 a REQ-VID-PLAY-011, REQ-VID-PLAY-042).],
    [5], [Fecha o leitor web após a reprodução chegar ao fim (ficando o leitor pausado no último fotograma com opção de repetição).], [Liberta os recursos de transmissão ativa no leitor e devolve o utilizador à vista de origem (biblioteca ou painel de resultado), mantendo o vídeo no estado Disponível e a quota diária de operações inalterada (RN3, REQ-VID-PLAY-012, REQ-VID-PLAY-013, REQ-VID-PLAY-028, REQ-VID-PLAY-055).],
  ),
)

=== Fluxos Alternativos

#tab([UC-VID-003 — Fluxos alternativos],
  tabela(
    colunas: (4cm, 1fr),
    [Fluxo], [Descrição (passo de origem: condição → comportamento → retorno)],
    [FA1 – Reproduzir resultado de processamento], [Passo 1: O utilizador acede ao painel de resultado de um pedido de recorte concluído com sucesso → O sistema disponibiliza a ação de reprodução sobre o novo vídeo no estado Disponível → Prossegue para o Passo 2 (REQ-VID-PLAY-038).],
    [FA2 – Salto temporal (seek) para região fora de buffer], [Passo 4: O utilizador seleciona um instante temporal na barra de progresso cuja região ainda não foi descarregada → O sistema exibe um indicador de buffering, solicita o segmento correspondente ao servidor através do endereço temporário assinado e retoma a reprodução a partir desse instante (REQ-VID-PLAY-010, REQ-VID-PLAY-043).],
    [FA3 – Fechar o leitor antes do término], [Passos 3 ou 4: O utilizador fecha o leitor web antes de o vídeo chegar ao fim → O sistema cancela os pedidos de transmissão pendentes, liberta a contagem de transmissões ativas e devolve o utilizador à vista de origem (REQ-VID-PLAY-013, REQ-VID-PLAY-015, REQ-VID-PLAY-055).],
    [FA4 – Repetir a reprodução (replay)], [Passo 5: Após atingir o fim do vídeo, o utilizador aciona o botão de repetição → O sistema reinicia a reprodução a partir do instante 00:00 sem fechar o leitor (REQ-VID-PLAY-012).],
  ),
)

=== Exceções

#tab([UC-VID-003 — Exceções],
  tabela(
    colunas: (1fr, 1fr),
    [Condição], [Comportamento do Sistema],
    [E1 – Codec de vídeo ou áudio não suportado pelo navegador], [Passo 3: O leitor web deteta incapacidade de descodificar o fluxo de vídeo ou áudio → Interrompe o carregamento, apresenta a mensagem "O seu navegador não suporta o codec deste vídeo. Utilize um navegador compatível" e mantém o registo inalterado (REQ-VID-PLAY-016).],
    [E2 – Falha de ligação de rede durante a reprodução], [Passos 3 ou 4: Ocorre perda de conectividade e o buffer local esgota-se → Pausa a reprodução, preserva o instante atual $t$, apresenta a mensagem "Erro de transmissão. Verifique a sua ligação à Internet" e disponibiliza o botão "Tentar novamente". Ao ser acionado após restabelecimento da rede, retoma a transmissão exatamente a partir do instante $t$ (REQ-VID-PLAY-017 a REQ-VID-PLAY-020).],
    [E3 – Expiração da credencial de acesso temporário], [Passo 4 (ou durante um seek): O endereço temporário assinado expira → Solicita de forma transparente em segundo plano uma nova credencial. Se a sessão do utilizador continuar válida (E3a), a transmissão continua sem interrupção; se a sessão tiver expirado ou sido revogada (E3b), interrompe a reprodução e solicita nova autenticação (REQ-VID-PLAY-021, REQ-VID-PLAY-027, REQ-VID-PLAY-053).],
    [E4 – Vídeo eliminado ou pedido de processamento não concluído], [Passo 2 (ou durante a reprodução no Passo 4 / FA2, caso o vídeo seja eliminado noutro separador): O vídeo já não existe ou pertence a um pedido Em fila, A processar, Falhou ou Cancelado → Impede a abertura (ou interrompe a reprodução), apresenta a mensagem "O vídeo já não se encontra disponível" (ou indica o estado atual do pedido) e atualiza a listagem (REQ-VID-PLAY-004, REQ-VID-PLAY-022, REQ-VID-PLAY-023, REQ-VID-PLAY-040).],
    [E5 – Tentativa de acesso não autorizado ou por Utilizador Anónimo], [Passos 1 ou 2: Tentativa por utilizador não autenticado, Anónimo ou sobre vídeo pertencente a outro utilizador → Recusa o pedido, regista o evento de segurança em log de auditoria e apresenta a mensagem "A reprodução de vídeo requer uma conta registada" (redirecionando para autenticação) ou "Não tem permissão para aceder a este recurso" (REQ-VID-PLAY-029 a REQ-VID-PLAY-031, REQ-VID-PLAY-054).],
    [E6 – Ficheiro de vídeo corrompido no armazenamento], [Passos 2 ou 3: O ficheiro no armazenamento encontra-se truncado ou com metadados estruturais ilegíveis → Aborta a reprodução e apresenta a mensagem "Não foi possível reproduzir o vídeo por o ficheiro se encontrar corrompido ou incompleto" (REQ-VID-PLAY-033).],
    [E7 – Limite de transmissões simultâneas excedido], [Passo 2: O utilizador tenta iniciar uma nova reprodução quando já atingiu o limite do seu perfil (1 stream para Registado; 3 streams para Premium) → Bloqueia o início da nova transmissão e informa o utilizador de que deve fechar uma reprodução ativa ou atualizar para o perfil Premium (REQ-VID-PLAY-039).],
  ),
)

=== Pós-condições

#tabela(
  colunas: (4cm, 1fr),
  [Tipo], [Resultado],
  [Garantia de Sucesso], [O vídeo é transmitido e reproduzido no leitor web com os controlos operacionais; ao fechar o leitor, a transmissão é terminada, o ficheiro original ou processado permanece íntegro e no estado Disponível no armazenamento, e a quota diária de operações do utilizador não sofre qualquer dedução (REQ-VID-PLAY-028, REQ-VID-PLAY-032).],
  [Garantia Mínima], [Caso a reprodução não se inicie ou seja interrompida por falha (rede, codec, expiração de sessão, eliminação do vídeo, corrupção ou falta de permissões), o sistema apresenta uma mensagem de erro explícita sobre a causa, nenhum ficheiro parcial ou corrompido é exposto, os dados do utilizador permanecem consistentes e a quota diária de operações mantém-se intacta (REQ-VID-PLAY-028, REQ-VID-PLAY-032, REQ-VID-PLAY-033, REQ-VID-PLAY-048).],
)

=== Regras de Negócio e Restrições

#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Regra],
  [RN1], [Formatos e Codecs Suportados no MVP: O sistema suporta a reprodução de vídeos nos contentores MP4 e MOV, com codec de vídeo H.264 (AVC) e codec de áudio AAC (ou sem faixa de áudio), alinhado com UC-VID-002.],
  [RN2], [Acesso Seguro e Temporário: O leitor web nunca acede a endereços públicos permanentes de armazenamento; toda a leitura é realizada através de endereços temporários assinados com validade máxima de 30 minutos no MVP e restritos a leitura.],
  [RN3], [Isenção de Quota de Operações: A visualização/reprodução de vídeos (de entrada ou resultados de saída) é considerada uma operação de consulta e não desconta na quota diária de 5 operações do Utilizador Registado.],
  [RN4], [Isolamento e Privacidade de Recursos: Um vídeo só pode ser reproduzido pelo utilizador proprietário da conta que o submeteu ou gerou.],
  [RN5], [Restrição por Escalão de Subscrição: A funcionalidade de reprodução está disponível exclusivamente para os perfis Registado e Premium, estando o perfil Anónimo excluído no MVP.],
  [RN6], [Limites de Transmissões Simultâneas por Perfil:
    - Utilizador Registado: máximo de 1 transmissão (stream) ativa em simultâneo.
    - Utilizador Premium: máximo de 3 transmissões (streams) ativas em simultâneo.
    Uma transmissão é libertada ao fechar o leitor ou por inatividade após 45 s; uma nova reprodução no mesmo navegador substitui de imediato as transmissões anteriores desse navegador.],
  [RN7], [Retenção e Disponibilidade: Os vídeos Disponíveis mantêm-se guardados até eliminação manual. Um vídeo eliminado manualmente deixa de existir no armazenamento e deixa imediatamente de poder ser reproduzido.],
  [RN8], [Articulação com Processamento: A reprodução não é uma ferramenta transformadora encadeável numa pipeline, mas pode ser invocada para pré-visualizar vídeos de entrada ou inspecionar individualmente resultados no estado Concluído.],
)

=== Assunções

#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Assunção],
  [A1], [A camada de armazenamento de objetos (MinIO/S3) suporta nativamente pedidos parciais de leitura (HTTP Range Requests, código 206) e emissão de presigned URLs assinadas.],
  [A2], [Os metadados dos vídeos e o estado dos pedidos de processamento estão registados na base de dados do PictuRAS.],
  [A3], [O carregamento, validação e gestão da biblioteca pertencem a UC-VID-002, e o recorte temporal pertence a UC-VID-001.],
  [A4], [Na Fase 1 (MVP) o servidor transmite o ficheiro tal como está armazenado (MP4/MOV em H.264/AAC), sem recodificação em tempo real nem streaming adaptativo (HLS/DASH).],
  [A5], [Os registos de auditoria de segurança (REQ-VID-PLAY-054) são mantidos de forma persistente pelo módulo que gere a biblioteca de vídeos.],
)

=== Questões em Aberto

#tabela(
  colunas: (1.4cm, 1fr, 5cm),
  [ID], [Questão], [Resolução],
  [Q1], [Como evitar o bloqueio de utilizadores Registados por fecho abrupto do navegador?], [Decidida -> Substituição imediata no mesmo navegador e libertação por inatividade após 45 s (RN6 / REQ-VID-PLAY-055, 056).],
  [Q2], [Como tratar a expiração de URLs temporários em sessões já terminadas?], [Decidida -> Interrupção da reprodução com pedido de nova autenticação em E3b (REQ-VID-PLAY-053).],
)