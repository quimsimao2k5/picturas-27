#import "../template.typ": *

// UC-VID-003 — gerado a partir de Documentacao/RAS-exercicio1_Reproducao_Video.md (versão v2.3)

== UC-VID-003 — Reproduzir Vídeo

=== Cabeçalho

#tab([Caso de uso UC-VID-003 — Reproduzir Vídeo],
  tabela-campos(
    [ID do Caso de Uso], [#raw("UC-VID-003");],
    [Nome], [Reproduzir Vídeo],
    [Versão], [v2.3],
    [Autores], [Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Joaquim Cunha],
    [Data], [2026-10-18],
    [Objetivo], [Permitir que um utilizador autenticado visualize e controle a reprodução de um vídeo no estado #strong[Disponível]; (original ou resultante de processamento #strong[Concluído];) diretamente no leitor #emph[web]; da aplicação, através de transmissão progressiva, sem necessidade de descarregar a totalidade do ficheiro previamente.],
    [Âmbito], [Módulo de Gestão e Visualização Multimédia do sistema PictuRAS (#emph[brownfield];). Abrange a reprodução de vídeos da biblioteca (#raw("UC-VID-002");) ou resultados de processamento (#raw("UC-VID-001");); exclui o carregamento inicial e a execução de algoritmos de edição.],
    [Ator Principal], [#strong[Utilizador Registado]; (aplicando-se o mesmo fluxo comportamental ao #strong[Utilizador Premium];, diferindo apenas no limite de transmissões simultâneas definido em RN6; o #strong[Utilizador Anónimo]; não tem acesso, conforme RN5).],
    [_Stakeholders_ e Interesses], [
- #strong[Utilizador Registado / Premium];: Pretende reproduzir os seus vídeos originais e processados de forma imediata, fluida, com controlo temporal (#emph[seek];) rápido e sem consumir a sua quota diária de operações de edição.
- #strong[Proprietário do Sistema (PictuRAS SaaS)];: Pretende garantir que o acesso aos vídeos é estritamente privado, temporário e alinhado com os limites de cada escalão de subscrição, controlando os custos de largura de banda.
- #strong[Equipa de Desenvolvimento / Arquitetura];: Pretende desacoplar a entrega de vídeo da API principal através de endereços temporários assinados e transmissão parcial por segmentos, garantindo escalabilidade para a Fase 2.
],
    [Pré-condições], [
- O utilizador encontra-se autenticado no sistema com sessão ativa e perfil #strong[Registado]; ou #strong[Premium];.
- Existe pelo menos um vídeo no estado #strong[Disponível]; associado à biblioteca do utilizador (#raw("UC-VID-002");) ou ao resultado de um pedido de processamento no estado #strong[Concluído]; (#raw("UC-VID-001");).
- O navegador (#emph[browser];) do utilizador suporta reprodução nativa de vídeo #emph[web]; e receção parcial de dados.
],
    [_Trigger_], [O utilizador seleciona a ação de reproduzir sobre um vídeo listado na sua biblioteca ou no painel de resultado de processamento.],
  ),
)

=== Fluxo Principal

#tab([UC-VID-003 — Fluxo principal],
  tabela(
    colunas: (1.2cm, 1fr, 1fr),
    [Passo], [Ação do Ator], [Resposta do Sistema],
    [#strong[1];], [O utilizador acede à sua biblioteca de vídeos.], [O sistema apresenta a lista de vídeos do utilizador no estado #strong[Disponível]; com os respetivos metadados (nome, duração, resolução, formato e tamanho).],
    [#strong[2];], [O utilizador seleciona um vídeo no estado #strong[Disponível]; para o reproduzir.], [O sistema valida a titularidade do vídeo (RN4), confirma que o ficheiro existe no armazenamento no estado #strong[Disponível]; e que o limite de transmissões simultâneas do perfil não foi excedido (RN1, RN6), e gera um endereço de acesso temporário assinado para leitura do vídeo (RN2).],
    [#strong[3];], [—], [O sistema abre a interface do leitor #emph[web];, inicia a transmissão progressiva por segmentos a partir do início do ficheiro sem o descarregar na totalidade, apresenta o primeiro fotograma, inicia a reprodução audiovisual e ativa os controlos (#emph[play/pause];, barra de progresso/#emph[seek];, controlo de volume/#emph[mute];, velocidade de reprodução e ecrã inteiro).],
    [#strong[4];], [O utilizador interage com os controlos de reprodução (#emph[pause];, #emph[play];, ajuste de volume, alteração de velocidade ou modo de ecrã inteiro).], [O sistema aplica de imediato a ação solicitada sobre a reprodução em curso, atualizando o indicador de tempo atual face à duração total do vídeo.],
    [#strong[5];], [O utilizador fecha o leitor #emph[web]; após a reprodução chegar ao fim (ficando o leitor pausado no último fotograma com opção de repetição).], [O sistema liberta os recursos de transmissão ativa no leitor e devolve o utilizador à vista de origem (biblioteca ou painel de resultado), mantendo o vídeo no estado #strong[Disponível]; e a quota diária de operações inalterada (RN3).],
  ),
)

=== Fluxos Alternativos

#tab([UC-VID-003 — Fluxos alternativos],
  tabela(
    colunas: (3.2cm, 1fr),
    [Fluxo], [Descrição],
    [#strong[FA1 – Reproduzir o Vídeo Resultante de um Pedido de Processamento];], [No Passo 1, em vez de aceder à biblioteca geral, o utilizador encontra-se no ecrã de um pedido de processamento cujo estado passou a #strong[Concluído]; (estando o vídeo resultante #strong[Disponível]; na biblioteca) e seleciona a opção de reproduzir o vídeo → O fluxo prossegue a partir do Passo 2 do fluxo principal.],
    [#strong[FA2 – Avançar ou Recuar na Barra de Tempo (#emph[Seek]; para Instante Não Carregado)];], [No Passo 4, o utilizador desloca o cursor da barra de tempo para um instante #raw("t"); que ainda não se encontra na memória local (#emph[buffer];) do leitor → O sistema exibe um indicador visual de carregamento (#emph[buffering];), solicita o segmento de dados correspondente ao instante #raw("t"); e retoma a reprodução a partir desse instante, regressando ao Passo 4.],
    [#strong[FA3 – Fechar o Leitor Antes do Fim da Reprodução];], [No Passo 4, o utilizador aciona a opção de fechar o leitor antes de o vídeo atingir o final → O sistema cancela de imediato os pedidos de transmissão pendentes, liberta o #emph[buffer]; do leitor e executa o Passo 5.],
    [#strong[FA4 – Repetir a Reprodução (#emph[Replay];) Após o Término];], [No Passo 5, quando o vídeo atinge o último fotograma, em vez de fechar o leitor, o utilizador seleciona o botão #emph["Repetir" / Play]; → O sistema reposiciona a reprodução no instante #raw("00:00"); (reutilizando o #emph[buffer]; ou o endereço de acesso temporário válido) e regressa ao Passo 4.],
  ),
)

=== Exceções

#tab([UC-VID-003 — Exceções],
  tabela(
    colunas: (4.5cm, 1fr),
    [Condição], [Comportamento do Sistema],
    [#strong[E1 – Codec de vídeo ou áudio não suportado pelo navegador];], [No Passo 3, o leitor #emph[web]; deteta incapacidade de descodificar o fluxo de vídeo ou áudio → O sistema interrompe o carregamento, apresenta no leitor a mensagem #emph["O seu navegador não suporta o codec deste vídeo. Utilize um navegador compatível"]; e mantém o registo inalterado. #emph[(Nota: no MVP a biblioteca apenas aceita MP4/MOV com H.264/AAC, pelo que E1 constitui uma verificação defensiva que se torna diretamente alcançável na Fase 2 com a aceitação de novos codecs prevista em #raw("UC-VID-002/DQ-006");).];],
    [#strong[E2 – Falha de ligação de rede durante a reprodução];], [Nos Passos 3 ou 4, ocorre perda de conectividade e o #emph[buffer]; local esgota-se → O sistema pausa a reprodução, preserva o instante atual #raw("t");, apresenta a mensagem #emph["Erro de transmissão. Verifique a sua ligação à Internet"]; e disponibiliza o botão #emph["Tentar novamente"];. Quando o utilizador aciona o botão após restabelecimento da rede, o sistema retoma a transmissão exatamente a partir do instante #raw("t");.],
    [#strong[E3 – Expiração da credencial de acesso temporário durante a reprodução];], [No Passo 4 (ou durante um #emph[seek]; em FA2), o endereço de acesso temporário expira → O sistema solicita de forma transparente em segundo plano uma nova credencial temporária ao servidor aplicacional:
- #strong[E3a (Renovação bem-sucedida)];: A transmissão continua sem interrupção visível para o utilizador.
- #strong[E3b (Sessão do utilizador expirada ou revogada)];: O sistema interrompe a reprodução e informa/redireciona o utilizador para se autenticar novamente.
],
    [#strong[E4 – Vídeo eliminado ou pedido de processamento ainda não concluído];], [No Passo 2 (ou durante a reprodução no Passo 4 / FA2, caso o vídeo seja eliminado manualmente noutro separador e o leitor solicite um novo segmento fora do #emph[buffer];), o sistema verifica que o vídeo já não existe (foi eliminado segundo RN7), não se encontra no estado #strong[Disponível]; ou pertence a um pedido de processamento nos estados #strong[Em fila];, #strong[A processar];, #strong[Falhou]; ou #strong[Cancelado]; → O sistema impede a abertura do leitor (ou interrompe a reprodução ativa), apresenta uma mensagem específica à causa (#emph["O vídeo já não se encontra disponível"]; — atualizando a lista para remover o item eliminado — ou indicando o estado atual do pedido: #strong[Em fila];, #strong[A processar];, #strong[Falhou]; ou #strong[Cancelado];), e regressa ao Passo 1.],
    [#strong[E5 – Tentativa de acesso não autorizado ou por Utilizador Anónimo];], [No Passo 1 ou 2, um utilizador não autenticado ou com perfil #strong[Anónimo]; tenta aceder à funcionalidade, ou um utilizador autenticado tenta reproduzir um vídeo pertencente a outro utilizador → O sistema recusa o pedido, regista o evento de segurança e apresenta a mensagem de acesso restrito (#emph["A reprodução de vídeo requer uma conta registada"]; — redirecionando para autenticação/registo — ou #emph["Não tem permissão para aceder a este recurso"];).],
    [#strong[E6 – Ficheiro de vídeo corrompido no armazenamento];], [Nos Passos 2 ou 3, o ficheiro de vídeo no armazenamento encontra-se truncado ou com metadados estruturais ilegíveis → O sistema aborta a reprodução e apresenta a mensagem #emph["Não foi possível reproduzir o vídeo por o ficheiro se encontrar corrompido ou incompleto"];.],
    [#strong[E7 – Limite de transmissões simultâneas excedido];], [No Passo 2, o utilizador tenta iniciar uma nova reprodução quando já atingiu o número máximo de transmissões (#emph[streams];) simultâneas permitidas pelo seu perfil (RN6: 1 para Registado; 3 para Premium) → O sistema bloqueia o início da nova transmissão e informa o utilizador de que deve fechar uma reprodução ativa ou atualizar para o perfil Premium.],
  ),
)

=== Pós-condições

#tab([UC-VID-003 — Pós-condições],
  tabela(
    colunas: (3cm, 1fr),
    [Tipo], [Resultado],
    [#strong[Garantia de Sucesso];], [O vídeo é transmitido e reproduzido no leitor #emph[web]; com os controlos operacionais; ao fechar o leitor, a transmissão é terminada, o ficheiro original ou processado permanece íntegro e no estado #strong[Disponível]; no armazenamento, e a quota diária de operações do utilizador não sofre qualquer dedução.],
    [#strong[Garantia Mínima];], [Caso a reprodução não se inicie ou seja interrompida por falha (rede, codec, expiração de sessão, eliminação do vídeo, corrupção ou falta de permissões), o sistema apresenta uma mensagem de erro explícita sobre a causa, nenhum ficheiro parcial ou corrompido é exposto, os dados do utilizador permanecem consistentes e a quota diária de operações mantém-se intacta.],
  ),
)

=== Regras de Negócio e Restrições

#tab([UC-VID-003 — Regras de negócio e restrições],
  tabela(
    colunas: (1.2cm, 1fr),
    [ID], [Regra de Negócio / Restrição],
    [#strong[RN1];], [#strong[Formatos, Codecs e Parâmetros Suportados];: No MVP, o sistema suporta a reprodução de vídeos nos contentores #strong[MP4]; e #strong[MOV];, com codec de vídeo #strong[H.264 (AVC)]; e codec de áudio #strong[AAC]; (ou sem faixa de áudio), em alinhamento com #raw("UC-VID-002"); (#raw("RN4");–#raw("RN6");). O suporte a contentores #strong[WebM]; e #strong[MKV];, codecs de vídeo #strong[H.265 (HEVC)];, #strong[VP8]; e #strong[VP9];, e codecs de áudio #strong[HE-AAC]; e #strong[Opus]; fica reservado para Produção (Fase 2, #raw("DQ5"); e #raw("UC-VID-002/DQ-006");).],
    [#strong[RN2];], [#strong[Acesso Seguro e Temporário];: O leitor #emph[web]; nunca acede diretamente a endereços públicos permanentes de armazenamento; toda a leitura de fluxos de vídeo é realizada através de credenciais/endereços de acesso temporário assinados com validade máxima de #strong[30 minutos]; no MVP (5 minutos em Produção) e restritos a operações de leitura.],
    [#strong[RN3];], [#strong[Isenção de Quota de Operações];: A visualização/reprodução de vídeos (sejam de entrada ou resultados de saída) é considerada uma operação de consulta e #strong[não desconta]; na quota diária de 5 operações do Utilizador Registado (#raw("UC-VID-002, RN12");).],
    [#strong[RN4];], [#strong[Isolamento e Privacidade de Recursos];: Um vídeo (submetido ou resultante de processamento) só pode ser reproduzido pelo utilizador proprietário da conta que o submeteu ou gerou (#raw("UC-VID-002, RN3");).],
    [#strong[RN5];], [#strong[Restrição por Escalão de Subscrição (Elegibilidade)];: A funcionalidade de biblioteca e reprodução de vídeo está disponível exclusivamente para os perfis #strong[Registado]; e #strong[Premium];, estando o perfil #strong[Anónimo]; excluído no MVP (#raw("UC-VID-002, RN1");).],
    [#strong[RN6];], [#strong[Limites de Transmissões Simultâneas por Perfil];: O número máximo de transmissões (#emph[streams];) de vídeo ativas em simultâneo depende do perfil do utilizador:
- #strong[Utilizador Registado];: máximo de #strong[1 transmissão (#emph[stream];) ativa em simultâneo];.
- #strong[Utilizador Premium];: máximo de #strong[3 transmissões (#emph[streams];) ativas em simultâneo];.#emph[(Nota: os limites de tamanho por vídeo, duração, resolução e espaço total de armazenamento pertencem e são validados na submissão para a biblioteca em #raw("UC-VID-002, RN10");).];
Uma transmissão considera-se ativa desde a abertura do leitor até ao seu fecho. Se o leitor deixar de sinalizar atividade (ex.: fecho abrupto do navegador), a transmissão é libertada automaticamente após #strong[45 s];; uma nova reprodução iniciada no mesmo navegador substitui de imediato as transmissões anteriores desse navegador.
],
    [#strong[RN7];], [#strong[Retenção e Disponibilidade dos Vídeos];: Em conformidade com #raw("UC-VID-002"); (#raw("RN13"); e #raw("A6");), os vídeos no estado #strong[Disponível]; na biblioteca (incluindo os resultados gerados por ferramentas de processamento como #raw("UC-VID-001");) permanecem guardados enquanto a conta estiver ativa, até serem eliminados manualmente pelo utilizador (#raw("UC-VID-002, FA5");). Um vídeo eliminado manualmente deixa de existir no armazenamento e deixa imediatamente de poder ser reproduzido.],
    [#strong[RN8];], [#strong[Articulação com Encadeamento de Ferramentas (#emph[Pipeline];) e Processamento em Lote (#emph[Batch];)];: A reprodução de vídeo não é uma ferramenta transformadora encadeável numa #emph[pipeline]; nem executável em lote; contudo, pode ser invocada individualmente pelo utilizador para pré-visualizar um vídeo #strong[Disponível]; de entrada antes de executar uma ferramenta/sequência ou para inspecionar individualmente cada vídeo de saída após o respetivo pedido de processamento atingir o estado #strong[Concluído];.],
  ),
)

=== Assunções

#tab([UC-VID-003 — Assunções],
  tabela(
    colunas: (1.2cm, 1.6fr, 1fr),
    [ID], [Assunção], [Impacto se for falsa],
    [#strong[A1];], [#strong[Infraestrutura de Armazenamento (#emph[Brownfield];)];: Assume-se que a camada de armazenamento de objetos do PictuRAS (baseada em SeaweedFS, compatível com a API S3, em contentor Docker isolado) suporta nativamente pedidos parciais de leitura (#emph[HTTP Range Requests];, código #raw("206 Partial Content");) e emissão de #emph[presigned URLs]; assinadas com tempo de vida limitado.], [Será necessário introduzir um serviço #emph[proxy]; de #emph[streaming]; na camada aplicacional para servir segmentos de bytes e validar assinaturas.],
    [#strong[A2];], [#strong[Persistência Associada a Contas];: Os metadados dos vídeos (ID, proprietário, referência no armazenamento, formato, codec, duração, tamanho, resolução e estado #strong[A carregar]; / #strong[A validar]; / #strong[Disponível]; / #strong[Rejeitado];) e o estado dos pedidos de processamento (#strong[Em fila]; / #strong[A processar]; / #strong[Concluído]; / #strong[Falhou]; / #strong[Cancelado];) estão registados na base de dados do PictuRAS.], [O serviço de reprodução não conseguirá validar o estado nem os metadados antes de abrir o leitor.],
    [#strong[A3];], [#strong[Separação de Casos de Uso];: O carregamento (#emph[upload];), a validação técnica, a consulta e a eliminação manual de vídeos na biblioteca pertencem a #raw("UC-VID-002");, e o recorte temporal de vídeo pertence a #raw("UC-VID-001");, assumindo-se neste #raw("UC-VID-003"); que o vídeo já foi previamente registado no sistema.], [Caso a ingestão ou eliminação mudem de regras, os pré-requisitos de disponibilidade terão de ser ajustados.],
    [#strong[A4];], [#strong[Ausência de Transcodificação #emph[On-the-Fly]; no MVP e Alcançabilidade de E1];: Na Fase 1 (MVP), o servidor transmite o ficheiro de vídeo tal como está armazenado (MP4/MOV em H.264/AAC), sem recodificação em tempo real nem #emph[streaming]; adaptativo (HLS/DASH). Como todos os vídeos #strong[Disponíveis]; no MVP já foram validados em #raw("UC-VID-002"); como H.264/AAC, a exceção #raw("E1"); funciona como verificação defensiva no MVP e torna-se diretamente alcançável na Fase 2 quando a biblioteca aceitar codecs adicionais (#raw("UC-VID-002/DQ-006");, como H.265, VP9 ou Opus).], [Se for exigida transcodificação em tempo real no MVP, será necessário dimensionar #emph[workers]; de vídeo adicionais.],
    [#strong[A5];], [#strong[Decisão da equipa (Valores Numéricos de Reprodução e Metas de Qualidade)];: Foram fixados pela equipa os seguintes parâmetros: limite de #strong[1 #emph[stream]; simultâneo]; (Registado) e #strong[3 #emph[streams]; simultâneos]; (Premium); validade da credencial temporária de #strong[30 min no MVP]; e #strong[5 min em Produção];; velocidades de reprodução de #strong[0,5x, 1x, 1,5x e 2x];; sinalização de atividade do leitor a cada #strong[15 s]; e libertação automática de transmissões inativas após #strong[45 s]; (#raw("RN6");); ligação de referência de #strong[10 Mbit/s]; com vídeo de teste até #strong[100 MB]; (limite máximo do perfil Registado em #raw("UC-VID-002/RN10");); arranque da reprodução #strong[≤ 5 s no MVP]; (≤ 1,5 s em Produção); #emph[seek]; fora de #emph[buffer]; #strong[≤ 3 s no MVP]; (≤ 1 s em Produção); deteção de falha de rede #strong[≤ 10 s no MVP]; (≤ 3 s em Produção); resposta do pedido de reprodução #strong[≤ 500 ms p95 no MVP]; (≤ 100 ms em Produção); capacidade concorrente de #strong[10 #emph[streams]; no MVP]; (200 em Produção) com consumo de RAM na API #strong[≤ 5 MB/pedido no MVP];; e atualização visual do leitor #strong[≥ 1 Hz];.], [Caso o cliente ou docente defina outras metas quantitativas, bastará ajustar os limiares de configuração e os testes não funcionais.],
    [#strong[A6];], [#strong[Recuperação de Estado no Cliente];: O componente de reprodução no navegador mantém em memória o instante temporal atual (#raw("currentTime");), permitindo solicitar o segmento exato de dados ao retomar após falha de rede (#raw("E2");) ou renovação de credencial (#raw("E3a");).], [Em caso de falha de rede, a reprodução teria de recomeçar do instante #raw("00:00");.],
    [#strong[A7];], [#strong[Decisão da equipa (v2.3):]; os registos de auditoria de segurança (#raw("REQ-VID-PLAY-054");) são guardados de forma persistente pelo módulo que gere a biblioteca de vídeos; as tentativas recusadas antes de identificar o utilizador (sem sessão autenticada) ficam registadas no ponto de entrada da aplicação.], [Se for exigido um repositório central de auditoria, os registos terão de ser reencaminhados para esse repositório.],
  ),
)

=== Questões em Aberto

#tab([UC-VID-003 — Questões em aberto],
  tabela(
    colunas: (1.2cm, 1.6fr, 1fr),
    [ID], [Questão em Aberto], [Impacto na Arquitetura / Produto],
    [#strong[Q1];], [Na Fase 2 (Produção), quando a biblioteca passar a aceitar contentores WebM/MKV e codecs H.265, VP8, VP9, HE-AAC e Opus (#raw("UC-VID-002/DQ-006");), o sistema deverá realizar transcodificação automática em segundo plano para H.264/AAC de modo a evitar a exceção #raw("E1"); em navegadores sem suporte nativo?], [Determina a necessidade de #emph[workers]; de normalização/transcodificação no pipeline de ingestão da Fase 2.],
    [#strong[Q2];], [Na visualização de resultados de processamento em lote (#emph[batch]; de vários vídeos), o utilizador poderá reproduzir os vídeos diretamente a partir da vista de resultados antes de descarregar o pacote final, ou terá de os abrir individualmente na biblioteca?], [Afeta o desenho da interface de resultados de lote e a emissão de credenciais temporárias de leitura.],
    [#strong[Q3];], [Deverá ser permitido ao Utilizador Anónimo, numa versão futura fora do MVP, pré-visualizar pequenos vídeos (ex.: ≤ 15 s, ≤ 20 MB) numa sessão efémera para captação de clientes (#emph[freemium];), à semelhança do que acontece com imagens?], [Impacta a regra de negócio #raw("RN5"); e a política de armazenamento temporário para sessões não autenticadas.],
  ),
)
