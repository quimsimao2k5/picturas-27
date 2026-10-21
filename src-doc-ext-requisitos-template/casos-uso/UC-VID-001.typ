#import "../template.typ": *

// =============================================================================
//  CASO DE USO — UC-VID-001
// =============================================================================

== UC-VID-001 — Recortar um Intervalo Temporal de um Vídeo

=== Cabeçalho

#tab([Caso de uso UC-VID-001 — Recortar um Intervalo Temporal de um Vídeo],
  tabela-campos(
    [ID do Caso de Uso], [UC-VID-001],
    [Nome], [Recortar um Intervalo Temporal de um Vídeo],
    [Versão], [v1.4],
    [Autor], [Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Joaquim Cunha (PL5-G7)],
    [Data], [2026-10-18],
    [Objetivo], [Permitir ao utilizador isolar e extrair um segmento temporal de um vídeo existente na sua biblioteca, gerando um novo vídeo autónomo sem modificar o original.],
    [Âmbito], [Módulo de Ferramentas e Processamento de Vídeo do PictuRAS],
    [Ator Principal], [Utilizador Registado / Utilizador Premium],
    [_Stakeholders_ e Interesses], [
      - *Utilizador Registado / Premium*: Pretende extrair excertos relevantes de vídeos da sua biblioteca de forma assíncrona e rápida, obtendo um novo vídeo independente.
      - *Proprietário do Sistema (PictuRAS SaaS)*: Pretende gerir de forma justa o consumo de recursos computacionais e a quota de operações diárias por perfil.
      - *Equipa de Desenvolvimento / Operações*: Pretende garantir o isolamento das tarefas de processamento assíncrono (FFmpeg em fila) e a limpeza de ficheiros temporários em caso de falha.
    ],
    [Pré-condições], [
      - O utilizador encontra-se autenticado na plataforma.
      - Existe pelo menos um vídeo no estado Disponível na biblioteca do utilizador.
      - O utilizador possui quota diária de operações disponível (se for Utilizador Registado) e espaço de armazenamento suficiente na biblioteca.
    ],
    [_Trigger_], [O utilizador seleciona um vídeo na sua biblioteca e escolhe a opção "Recortar".],
  ),
)

=== Fluxo Principal

#tab([UC-VID-001 — Fluxo principal],
  tabela(
    colunas: (1.2cm, 1fr, 1fr),
    [Passo], [Ação do Ator], [Resposta do Sistema],

    [1],
    [O utilizador abre a sua biblioteca de vídeos.],
    [Apresenta a lista de vídeos do utilizador e o número de operações restantes no dia.],

    [2],
    [O utilizador seleciona um vídeo e escolhe *Recortar*.],
    [Verifica que o formato de vídeo é suportado e que não há outro recorte em curso.],

    [3],
    [—],
    [Abre o ecrã de recorte com reprodutor e duração total do vídeo.],

    [4],
    [O utilizador define o instante inicial e final do intervalo que quer recortar.],
    [Valida se o intervalo é válido e mostra a duração do vídeo resultante.],

    [5],
    [O utilizador escolhe o formato de saída (MP4 ou MOV, por omissão é o original) e, opcionalmente, o nome do novo vídeo.],
    [Mostra o resumo do pedido (vídeo de origem, intervalo, duração resultante, formato e nome).],

    [6],
    [O utilizador confirma com *Iniciar Recorte*.],
    [—],

    [7],
    [—],
    [Valida a quota diária, reserva 1 operação e regista o pedido.],

    [8],
    [—],
    [Coloca o pedido em fila (estado *Em fila*) e retorna o utilizador para a sua biblioteca.],

    [9],
    [—],
    [Ao iniciar o processamento, passa o estado para *A processar* e apresenta o progresso (%).],

    [10],
    [O utilizador consulta o estado do pedido se quiser.],
    [Apresenta o estado atual e o progresso.],

    [11],
    [—],
    [Ao terminar, guarda o resultado como novo vídeo na biblioteca, passa o estado para *Concluído* e consome a operação reservada.],

    [12],
    [—],
    [Notifica o utilizador que o recorte está concluído.],

    [13],
    [O utilizador abre o vídeo recortado e pode descarregar.],
    [Reproduz o resultado e disponibiliza o descarregamento.]
  )
)

=== Fluxos Alternativos

#tab([UC-VID-001 — Fluxos alternativos],
  tabela(
    colunas: (4cm, 1fr),
    [Fluxo], [Descrição (passo de origem: condição → comportamento → retorno)],

    [FA1 – Intervalo igual à duração total],
    [No passo 4, o utilizador abrange o vídeo inteiro → O sistema avisa que o resultado seria uma cópia do original e pede confirmação. Se o utilizador recusar, regressa ao passo 4.],

    [FA2 – Cancelar o pedido],
    [O utilizador escolhe *Cancelar*, enquanto o estado for *Em fila* ou *A processar* → O sistema pede confirmação, interrompe o processo, descarta qualquer resultado obtido até ao momento, devolve a operação à quota, passa o estado para *Cancelado* e regressa à biblioteca.],

    [FA3 – Utilizador sai durante o processo],
    [O utilizador fecha a aplicação ou termina a sessão após o passo 6 → O processamento continua. Quando o utilizador regressa, o sistema apresenta uma notificação de conclusão (ou de falha) e o estado atualizado do pedido.]
  )
)

=== Exceções

#tab([UC-VID-001 — Exceções],
  tabela(
    colunas: (1fr, 1fr),
    [Condição], [Comportamento do Sistema],

    [E1 — Formato ou codec do vídeo de origem não suportado.],
    [Apresenta "Este formato de vídeo não é suportado para recorte", indica os formatos aceites e não abre o ecrã de recorte. Não consome quota. _(Nota: no MVP a biblioteca (`UC-VID-002`, RN4–RN6) só aceita vídeos MP4/MOV com H.264 e áudio AAC, pelo que E1 é uma verificação defensiva que só se torna alcançável na Fase 2, com a aceitação de novos formatos.)_],

    [E2 — Intervalo inválido: início >= fim, fim superior à duração do vídeo ou duração do intervalo fora dos limites.],
    [Assinala o erro, indica o motivo e o limite violado e mantém o botão *Iniciar Recorte* desativado.],

    [E3 — Quota diária esgotada.],
    [Apresenta "Atingiu o limite de operações diárias", indica a hora a que a quota é reposta e sugere o perfil Premium. Não cria o pedido.],

    [E4 — Já existe um recorte do utilizador *Em fila* ou *A processar*.],
    [Apresenta "Já existe um recorte em curso. Aguarde a conclusão" e recusa o pedido.],

    [E5 — Falha a meio do processamento (erro do codificador, ficheiro corrompido, falta de recursos...).],
    [Tenta automaticamente uma segunda vez. Se voltar a falhar, passa o estado para *Falhou*, devolve a operação à quota e notifica o utilizador: "Não foi possível concluir o recorte. Tente novamente".],

    [E6 — O utilizador tenta eliminar o vídeo de origem enquanto o recorte está *Em fila* ou *A processar*.],
    [Impede a eliminação e informa que o vídeo está a ser utilizado numa operação. A eliminação só é possível depois de o estado passar para *Concluído*, *Falhou* ou *Cancelado*.],

    [E7 — O resultado do recorte não cabe no espaço de armazenamento livre da biblioteca do utilizador (`UC-VID-002`, RN10).],
    [No passo 7, se o tamanho estimado do resultado (tamanho do original × duração do intervalo ÷ duração do original) exceder o espaço livre, apresenta "Não existe espaço suficiente na biblioteca para o vídeo recortado", sugere eliminar vídeos ou o perfil Premium e não cria o pedido nem consome quota. Se, no passo 11, o ficheiro real não couber, o pedido passa a *Falhou*, a operação é devolvida à quota, o resultado parcial é eliminado e o utilizador é informado do motivo.]
  )
)

=== Pós-condições

#tabela(
  colunas: (4cm, 1fr),
  [Tipo], [Resultado],

  [Garantia de Sucesso],
  [A biblioteca contém um novo vídeo, independente do original, com a duração do intervalo pedido (dentro da tolerância definida), no formato escolhido. O vídeo original mantém-se inalterado. O pedido tem o estado *Concluído*. A operação foi definitivamente contabilizada na quota diária e o utilizador foi notificado.],

  [Garantia Mínima],
  [O vídeo original mantém-se inalterado. Não permanece nenhum ficheiro parcial. A operação reservada é devolvida à quota. O pedido fica com o estado *Falhou* ou *Cancelado*. O utilizador é notificado do que aconteceu.]
)

=== Regras de Negócio e Restrições

#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Regra],

  [RN1],
  [Os formatos aceites como entrada e como saída do recorte são MP4 e MOV, com codec de vídeo H.264. O vídeo resultante mantém a faixa de áudio do original em AAC (ou fica sem áudio, se o original não o tiver).],

  [RN2],
  [O intervalo selecionado é definido com precisão de 1 segundo, tem duração mínima de 1 segundo e máxima do tempo total do vídeo original. O instante inicial tem de ser anterior ao instante final e o instante do fim não pode exceder a duração do vídeo.],

  [RN3],
  [Cada pedido de recorte conta como 1 operação do limite diário do perfil *Registado*, independentemente da duração do intervalo. A operação é reservada ao submeter o pedido, consumida definitivamente apenas quando o recorte é concluído com sucesso e devolvida se o pedido falhar ou for cancelado.],

  [RN4],
  [Um utilizador *Registado* só pode ter 1 recorte *Em fila* ou *A processar* em simultâneo; um utilizador *Premium* pode ter até 3.],

  [RN5],
  [O vídeo original nunca é alterado. O resultado é sempre guardado como um novo vídeo independente da biblioteca. O nome por omissão é `{nome_original}_recorte_{início}-{fim}`, com os instantes em segundos. O recorte preserva a resolução e a taxa de fotogramas do original, com diferença máxima de 1 segundo face à duração do intervalo pedido no MVP.],

  [RN6],
  [O pedido percorre os estados *Em fila* → *A processar* → *Concluído*, podendo terminar em *Falhou* ou *Cancelado*. O cancelamento só é permitido nos estados *Em fila* e *A processar*.],

  [RN7],
  [A falha a meio do processamento leva a uma nova tentativa automática antes de o pedido ser marcado como *Falhou*.],

  [RN8],
  [Enquanto o pedido estiver no estado *A processar*, o sistema atualiza o progresso apresentado pelo menos de 5 em 5 segundos.]
)

=== Assunções

#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Assunção],

  [A1],
  [O vídeo de origem está armazenado e acessível ao serviço no momento do pedido e já foi validado durante o carregamento.],

  [A2],
  [O processamento é assíncrono e o tempo de conclusão depende da duração do intervalo e da carga do sistema.],

  [A3],
  [A notificação de conclusão ou de falha é feita apenas dentro da aplicação.],

  [A4],
  [Cada pedido corta um único intervalo de um único vídeo.],

  [A5],
  [O vídeo recortado fica guardado como um vídeo comum na biblioteca.],

  [A6],
  [O sistema processa em paralelo pedidos de utilizadores diferentes, até um limite de capacidade definido na arquitetura; quando esse limite é atingido, os pedidos aguardam no estado *Em fila*.],

  [A7],
  [Valores adotados pela equipa para o MVP: codec H.264, precisão de entrada de 1 s, tolerância de ± 1 s na duração do vídeo resultante e atualização de progresso de 5 em 5 s.],

  [A8],
  [Os alvos quantitativos e qualitativos de desempenho, fiabilidade, segurança, compatibilidade, manutenibilidade e portabilidade (distinguindo MVP e Produção) seguem as decisões de qualidade `DQ-001` a `DQ-005` registadas na secção 4.3.],

  [A9],
  [Os pedidos de recorte são registados e geridos no mesmo módulo que gere a biblioteca de vídeos (`UC-VID-002`, A8), o que permite à biblioteca impedir a eliminação do vídeo de origem enquanto o pedido estiver *Em fila* ou *A processar* (E6).]
)

=== Questões em Aberto

#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Questão],

  [Q1],
  [Que limites e que prioridade na fila deve ter o perfil *Premium*? — *Parcialmente resolvida (v1.4):* até 3 recortes em simultâneo (RN4); a prioridade na fila mantém-se por ordem de chegada no MVP e fica em aberto para a Fase 2.],

  [Q2],
  [O perfil *Anónimo* deve ter acesso a esta funcionalidade? — *Resolvida (v1.4):* não; a biblioteca de vídeos é exclusiva de Registado e Premium (`UC-VID-002`, RN1, `REQ-VID-LIB-049`).],

  [Q3],
  [Que limites máximos de duração e de dimensão de ficheiro devem ser impostos por perfil? — *Resolvida (v1.4):* definidos na biblioteca (`UC-VID-002`, RN10: Registado 100 MB / 3 min / 1080p; Premium 1 GB / 30 min / 4K).],

  [Q4],
  [Por quanto tempo devem ser conservados os vídeos recortados e o histórico de pedidos? — *Resolvida (v1.4):* os vídeos recortados são vídeos comuns da biblioteca, conservados até eliminação manual (`UC-VID-002`, RN13, A6).],

  [Q5],
  [Deve permitir-se ao utilizador pré-visualizar o recorte no reprodutor durante o passo 4 antes de confirmar?]
)