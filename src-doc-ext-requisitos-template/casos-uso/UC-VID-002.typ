#import "../template.typ": *

// =============================================================================
//  CASO DE USO — UC-VID-002
// =============================================================================

== UC-VID-002 — Gerir Biblioteca de Vídeos e Adicionar Vídeo

=== Cabeçalho

#tab([Caso de uso UC-VID-002 — Gerir Biblioteca de Vídeos e Adicionar Vídeo],
  tabela-campos(
    [ID do Caso de Uso], [UC-VID-002],
    [Nome], [Gerir Biblioteca de Vídeos e Adicionar Vídeo],
    [Versão], [v1.3],
    [Autor], [Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Joaquim Cunha (PL5-G7)],
    [Data], [2026-10-18],
    [Objetivo], [Permitir ao utilizador autenticado consultar e gerir a sua biblioteca pessoal de vídeos (incluindo visualizar metadados e eliminar vídeos) e carregar (upload) novos ficheiros de vídeo validados para posterior reprodução e processamento.],
    [Âmbito], [Módulo de biblioteca, armazenamento e suporte a vídeo do PictuRAS],
    [Ator Principal], [Utilizador Registado / Utilizador Premium],
    [_Stakeholders_ e Interesses], [
      - *Utilizador Registado / Premium*: Pretende carregar, organizar, consultar e eliminar os seus vídeos para os utilizar nas ferramentas do PictuRAS.
      - *Proprietário do Sistema (PictuRAS SaaS)*: Pretende controlar o armazenamento utilizado, aplicar limites diferenciados por escalão de subscrição e impedir o acesso de utilizadores não autenticados.
      - *Equipa de Desenvolvimento*: Pretende garantir uma fonte persistente e validada de vídeos (MP4/MOV em H.264/AAC) para as funcionalidades de reprodução e processamento.
    ],
    [Pré-condições], [
      - A aplicação web PictuRAS e o serviço de armazenamento encontram-se disponíveis e operacionais.
      - O utilizador possui sessão iniciada com perfil Registado ou Premium (tentativas sem sessão autenticada ou com perfil Anónimo são tratadas como exceção).
    ],
    [_Trigger_], [O utilizador acede à sua Biblioteca de Vídeos e seleciona uma ação (no fluxo principal, "Adicionar vídeo").],
  ),
)

=== Fluxo Principal

#tab([UC-VID-002 — Fluxo principal],
  tabela(
    colunas: (1.2cm, 1fr, 1fr),
    [Passo], [Ação do Ator], [Resposta do Sistema],

    [1],
    [O utilizador abre a sua biblioteca de vídeos.],
    [O sistema apresenta a lista de vídeos do utilizador no estado *Disponível* (com nome, duração, resolução e tamanho), o espaço de armazenamento ocupado face ao limite do perfil e as opções *Adicionar vídeo* e *Eliminar vídeo*; quando existam, apresenta ainda, num painel separado de carregamentos recentes, os vídeos em submissão (*A carregar* / *A validar*) e os vídeos *Rejeitados* com o respetivo motivo (RN14).],

    [2],
    [O utilizador seleciona a opção *Adicionar vídeo*.],
    [O sistema apresenta a interface para seleção de um ficheiro de vídeo.],

    [3],
    [O utilizador seleciona um ficheiro de vídeo do seu dispositivo.],
    [O sistema identifica o tipo (formato) e o tamanho do ficheiro selecionado e apresenta ao utilizador o nome, o formato identificado e o tamanho do ficheiro antes da submissão.],

    [4],
    [O utilizador confirma a submissão.],
    [O sistema verifica o formato do ficheiro (MP4 ou MOV), o limite máximo de tamanho por vídeo do perfil e a existência de espaço de armazenamento disponível na biblioteca; sendo válidos, cria o registo do vídeo associado ao utilizador autenticado, atribui-lhe um identificador único e define o estado *A carregar*.],

    [5],
    [—],
    [O sistema realiza o carregamento (_upload_) do ficheiro de vídeo e apresenta o respetivo progresso (%).],

    [6],
    [—],
    [Após concluir o carregamento, o sistema altera o estado do vídeo para *A validar* (não estando a opção de cancelar disponível neste passo) e valida a integridade do ficheiro, o codec de vídeo (H.264) e, quando existir faixa de áudio, o codec de áudio (AAC).],

    [7],
    [—],
    [Mantendo o estado *A validar* (sem opção de cancelar disponível), o sistema extrai os metadados técnicos do vídeo (duração e resolução), verifica que a duração e a resolução não excedem os limites máximos do perfil do utilizador e regista a duração, a resolução e o tamanho do vídeo.],

    [8],
    [—],
    [O sistema armazena persistentemente o vídeo, atualiza o espaço de armazenamento ocupado na biblioteca do utilizador e atribui ao vídeo o estado *Disponível*.],

    [9],
    [O utilizador consulta a biblioteca atualizada.],
    [O sistema apresenta o novo vídeo na biblioteca com o estado *Disponível* e os respetivos metadados registados.]
  )
)

=== Fluxos Alternativos

#tab([UC-VID-002 — Fluxos alternativos],
  tabela(
    colunas: (4cm, 1fr),
    [Fluxo], [Descrição (passo de origem: condição → comportamento → retorno)],
    [FA1 – Cancelar antes do carregamento], [Passo 3: Antes de confirmar a submissão, o utilizador decide cancelar → O sistema regressa à biblioteca sem iniciar o carregamento nem criar qualquer registo (REQ-VID-LIB-011).],
    [FA2 – Cancelar durante o carregamento], [Passo 5: Enquanto o vídeo está no estado "A carregar", o utilizador solicita o cancelamento → O sistema interrompe a transferência, elimina os dados parciais recebidos e remove o registo temporário (REQ-VID-LIB-012, REQ-VID-LIB-013). (Nota: nos passos 6 e 7, em "A validar", a opção de cancelar fica indisponível).],
    [FA3 – Alterar o ficheiro selecionado], [Passo 3: Antes da confirmação, o utilizador escolhe outro ficheiro → O sistema substitui a seleção anterior e apresenta os dados do novo ficheiro (REQ-VID-LIB-042).],
    [FA4 – Consultar biblioteca e metadados], [Passo 1: Em vez de submeter, o utilizador seleciona um vídeo "Disponível" da sua biblioteca → O sistema apresenta os metadados registados (nome, ID, formato, duração, resolução e tamanho) (REQ-VID-LIB-002, REQ-VID-LIB-031).],
    [FA5 – Eliminar manualmente um vídeo], [Passo 1: O utilizador seleciona "Eliminar vídeo" sobre um vídeo "Disponível" e confirma → O sistema verifica que o vídeo não está a ser utilizado num pedido de processamento ativo ("Em fila" ou "A processar"), elimina o ficheiro do armazenamento, remove o registo e liberta o espaço de armazenamento na biblioteca (REQ-VID-LIB-033, REQ-VID-LIB-057, REQ-VID-LIB-058).],
    [FA6 – Utilizador sai durante a validação], [Passos 6 ou 7: O utilizador fecha a aplicação durante o estado "A validar" → O sistema conclui em segundo plano a validação e o armazenamento (ou rejeição); ao regressar, o utilizador vê o vídeo como "Disponível" ou a indicação de "Rejeitado" no painel de carregamentos recentes (REQ-VID-LIB-060, REQ-VID-LIB-061).],
    [FA7 – Dispensar aviso de vídeo rejeitado], [Passo 1: O utilizador seleciona "Dispensar" sobre um vídeo "Rejeitado" no painel de carregamentos recentes → O sistema remove a apresentação desse aviso (REQ-VID-LIB-062).],
  ),
)

=== Exceções

#tab([UC-VID-002 — Exceções],
  tabela(
    colunas: (1fr, 1fr),
    [Condição], [Comportamento do Sistema],
    [E1 – Utilizador não autenticado ou Anónimo], [Passos 1 ou 4: Tentativa de acesso por utilizador não autenticado ou com perfil Anónimo → Impede o acesso/submissão, informa que a biblioteca requer conta registada e redireciona para a página de autenticação/registo (REQ-VID-LIB-048, REQ-VID-LIB-049).],
    [E2 – Formato de vídeo não suportado], [Passo 4: O ficheiro não está em MP4 nem MOV → Rejeita a submissão antes de criar registo ou iniciar o carregamento e informa os formatos aceites (REQ-VID-LIB-018, REQ-VID-LIB-035, REQ-VID-LIB-050).],
    [E3 – Tamanho máximo por vídeo excedido], [Passo 4: O ficheiro excede o limite do perfil (100 MB para Registado; 1 GB para Premium) → Rejeita a submissão antes de criar registo e informa o limite do perfil (REQ-VID-LIB-015, REQ-VID-LIB-037).],
    [E4 – Limite de armazenamento da biblioteca atingido], [Passo 4: O espaço livre na biblioteca é inferior ao tamanho do vídeo (quota total de 500 MB para Registado; 10 GB para Premium) → Rejeita a submissão antes de criar registo e informa que o espaço é insuficiente (REQ-VID-LIB-017, REQ-VID-LIB-038).],
    [E5 – Codec de vídeo não suportado], [Passo 6: O fluxo de vídeo não utiliza H.264 → Atribui o estado "Rejeitado", elimina os dados temporários e informa a incompatibilidade do codec de vídeo (REQ-VID-LIB-014, REQ-VID-LIB-019, REQ-VID-LIB-036, REQ-VID-LIB-051).],
    [E6 – Codec de áudio não suportado], [Passo 6: A faixa de áudio existe e não utiliza o codec AAC → Atribui o estado "Rejeitado", elimina os dados temporários e informa a incompatibilidade do codec de áudio (REQ-VID-LIB-014, REQ-VID-LIB-046, REQ-VID-LIB-052, REQ-VID-LIB-053).],
    [E7 – Ficheiro corrompido ou ilegível], [Passo 6: O ficheiro encontra-se corrompido ou ilegível → Atribui o estado "Rejeitado", elimina os dados temporários e informa que o ficheiro está corrompido (REQ-VID-LIB-014, REQ-VID-LIB-020, REQ-VID-LIB-054).],
    [E8 – Duração máxima excedida], [Passo 7: A duração extraída excede o limite do perfil (3 min para Registado; 30 min para Premium) → Atribui o estado "Rejeitado", elimina os dados temporários e informa o limite de duração (REQ-VID-LIB-014, REQ-VID-LIB-016, REQ-VID-LIB-047).],
    [E9 – Resolução máxima excedida], [Passo 7: A resolução excede o limite do perfil (1080p para Registado; 4K para Premium, avaliado independentemente da orientação) → Atribui o estado "Rejeitado", elimina os dados temporários e informa o limite de resolução (REQ-VID-LIB-014, REQ-VID-LIB-055).],
    [E10 – Falha de ligação durante o carregamento], [Passo 5: A transferência é interrompida por falha de rede → Interrompe o carregamento, elimina os dados parciais e exibe aviso de falha de ligação (REQ-VID-LIB-014, REQ-VID-LIB-039).],
    [E11 – Falha de armazenamento], [Passo 8: Falha ao gravar persistentemente o ficheiro → Não conclui a submissão, elimina os dados temporários e informa a falha no serviço de armazenamento (REQ-VID-LIB-014, REQ-VID-LIB-044).],
    [E12 – Sessão expirada durante a operação], [Passos 5 a 8: A sessão expira antes da conclusão da validação e persistência → Não disponibiliza o vídeo, limpa os dados temporários/provisórios e solicita nova autenticação (REQ-VID-LIB-014, REQ-VID-LIB-043).],
    [E13 – Tentativa de eliminar vídeo em operação ativa], [FA5: Tentativa de eliminar um vídeo de origem associado a um pedido "Em fila" ou "A processar" → Impede a eliminação e informa que o vídeo se encontra em utilização (REQ-VID-LIB-058).],
  ),
)

=== Pós-condições

#tabela(
  colunas: (4cm, 1fr),
  [Tipo], [Resultado],
  [Garantia de Sucesso], [No carregamento: o vídeo encontra-se integralmente armazenado de forma persistente, associado ao utilizador autenticado, com identificador único e metadados (duração, resolução e tamanho) registados; o espaço ocupado na biblioteca encontra-se atualizado; e o vídeo surge listado como "Disponível" (REQ-VID-LIB-025, REQ-VID-LIB-026, REQ-VID-LIB-028, REQ-VID-LIB-029, REQ-VID-LIB-030, REQ-VID-LIB-059). Na eliminação (FA5): o ficheiro e o registo são removidos e o espaço de armazenamento é libertado (REQ-VID-LIB-057). A quota diária de operações do utilizador mantém-se inalterada (REQ-VID-LIB-034).],
  [Garantia Mínima], [Em caso de falha, rejeição ou cancelamento, nenhum ficheiro incompleto ou inválido adquire o estado "Disponível", todos os dados parciais ou temporários são totalmente eliminados do armazenamento (REQ-VID-LIB-013, REQ-VID-LIB-014, REQ-VID-LIB-021), os vídeos em uso por pedidos ativos permanecem protegidos (REQ-VID-LIB-058) e a quota diária de operações do utilizador mantém-se intacta (REQ-VID-LIB-034).],
)

=== Regras de Negócio e Restrições

#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Regra],

  [RN1],
  [Apenas utilizadores autenticados com perfil *Registado* ou *Premium* possuem uma biblioteca pessoal de vídeos no MVP; o perfil *Anónimo* não tem acesso.],

  [RN2],
  [Cada vídeo armazenado na biblioteca deve estar associado ao utilizador autenticado que efetuou a submissão (ou que o gerou através de uma ferramenta de processamento).],

  [RN3],
  [Um utilizador apenas pode consultar, reproduzir, selecionar para processamento e eliminar os vídeos pertencentes à sua própria biblioteca.],

  [RN4],
  [Os formatos (contentores) de vídeo suportados na biblioteca no MVP são *MP4* e *MOV*.],

  [RN5],
  [No MVP, o codec de vídeo suportado na biblioteca é *H.264 (AVC)*.],

  [RN6],
  [Quando o vídeo possuir faixa de áudio, o codec de áudio suportado no MVP é *AAC* (vídeos sem faixa de áudio são igualmente aceites).],

  [RN7],
  [O ciclo de vida de um vídeo cujo registo é criado no passo 4 compreende os estados *A carregar* (durante a transferência no passo 5, único estado em que o cancelamento pelo utilizador é permitido), *A validar* (durante a verificação técnica e extração de metadados nos passos 6 e 7, sem opção de cancelamento), *Disponível* (após validação e armazenamento com sucesso no passo 8) e *Rejeitado* (quando qualquer validação nos passos 6 e 7 falha). Rejeições no passo 4 (`E2`, `E3`, `E4`) ocorrem antes da criação do registo e não atribuem estado.],

  [RN8],
  [Um vídeo incompleto, corrompido ou nos estados *A carregar*, *A validar* ou *Rejeitado* não pode ser apresentado como vídeo disponível na biblioteca nem selecionado para reprodução ou processamento, sendo os respetivos ficheiros temporários eliminados quando a submissão falha ou é rejeitada.],

  [RN9],
  [Cada vídeo armazenado possui um identificador único no sistema, independentemente do nome do ficheiro; se já existir na biblioteca um vídeo com o mesmo nome, o sistema permite a submissão, atribui ao novo vídeo um identificador distinto e mantém ambos os vídeos.],

  [RN10],
  [Os limites máximos de tamanho por vídeo, duração, resolução e capacidade total de armazenamento na biblioteca dependem do perfil do utilizador:
- *Utilizador Registado:* tamanho até *100 MB* por vídeo, duração até *3 minutos (180 s)*, resolução até *1080p (1920 × 1080)* e espaço total de armazenamento na biblioteca até *500 MB*.
- *Utilizador Premium:* tamanho até *1 GB* por vídeo, duração até *30 minutos (1800 s)*, resolução até *4K (3840 × 2160)* e espaço total de armazenamento na biblioteca até *10 GB*.

O limite de resolução é avaliado independentemente da orientação do vídeo: o lado maior não pode exceder 1920 px (Registado) / 3840 px (Premium) e o lado menor não pode exceder 1080 px (Registado) / 2160 px (Premium); assim, um vídeo vertical de 1080 × 1920 é aceite para o perfil Registado.],

  [RN11],
  [O processamento posterior de um vídeo (ex.: recorte em `UC-VID-001`) é contabilizado segundo as regras de quota diária aplicáveis ao perfil do utilizador.],

  [RN12],
  [A consulta da biblioteca, a adição (_upload_) e a eliminação de vídeos não consomem operações da quota diária de 5 operações do utilizador *Registado*.],

  [RN13],
  [Os vídeos no estado *Disponível* permanecem guardados na biblioteca enquanto a conta do utilizador estiver ativa, até serem eliminados manualmente pelo utilizador; um vídeo não pode ser eliminado enquanto estiver a ser utilizado como origem de um pedido de processamento nos estados *Em fila* ou *A processar*.],

  [RN14],
  [Os vídeos nos estados *A carregar*, *A validar* e *Rejeitado* não fazem parte da lista de vídeos da biblioteca; são apresentados apenas num painel separado de carregamentos recentes, com o respetivo estado e, no caso dos *Rejeitados*, o motivo da rejeição, até o utilizador dispensar o aviso (FA7). Um vídeo *Rejeitado* não ocupa espaço de armazenamento na biblioteca.]
)

=== Assunções

#tabela(
  colunas: (1.4cm, 1fr, 1fr),
  [ID], [Assunção], [Impacto se for falsa],

  [A1],
  [Cada utilizador registado ou premium possui uma biblioteca pessoal persistente de vídeos no PictuRAS.],
  [Será necessário definir outro mecanismo de organização e propriedade dos vídeos.],

  [A2],
  [O perfil anónimo não possui biblioteca nem armazenamento persistente de vídeos no MVP.],
  [Será necessário definir armazenamento temporário e regras de eliminação automática para sessões anónimas.],

  [A3],
  [Os contentores e codecs suportados no MVP são MP4 e MOV com vídeo H.264 e áudio AAC (decisão transversal da equipa alinhada entre `UC-VID-001`, `UC-VID-002` e `UC-VID-003`).],
  [Os requisitos de compatibilidade e os respetivos testes terão de ser revistos.],

  [A4],
  [*Decisão da equipa:* Os valores numéricos dos limites por perfil no MVP foram fixados pela equipa em: *Registado* (100 MB por vídeo, 3 min de duração, 1080p, 500 MB de armazenamento total na biblioteca) e *Premium* (1 GB por vídeo, 30 min de duração, 4K, 10 GB de armazenamento total na biblioteca).],
  [Caso o cliente/docente defina outros limites, bastará atualizar os parâmetros de configuração sem alterar a estrutura de validação.],

  [A5],
  [O tamanho e o tipo do ficheiro podem ser lidos antes do envio, mas a duração, a resolução e os codecs reais de vídeo/áudio só são extraídos e validados de forma fiável no servidor após a receção do ficheiro no passo 6–7.],
  [Se houver pré-leitura no cliente, servirá apenas como validação preliminar, mantendo-se a validação obrigatória no servidor.],

  [A6],
  [*Decisão da equipa:* Os vídeos no estado *Disponível* na biblioteca (submetidos pelo utilizador ou gerados por operações como o recorte em `UC-VID-001`) são conservados até eliminação manual pelo utilizador, dentro da quota de armazenamento do perfil.],
  [Se for imposta expiração temporal à biblioteca, será necessário criar uma rotina de limpeza periódica.],

  [A7],
  [*Decisão da equipa:* Os alvos quantitativos de qualidade do MVP e de Produção (atualização de progresso a cada ≤ 2 s no MVP vs. ≤ 1 s em Produção; tempo de validação pós-upload ≤ 5 s no MVP vs. ≤ 2 s em Produção) seguem as decisões `DQ-001` a `DQ-006` da secção 4.3.],
  [Ajuste das metas de desempenho nos testes não funcionais.],

  [A8],
  [*Decisão da equipa:* Os pedidos de processamento de vídeo (ex.: recorte em `UC-VID-001`) são registados e geridos no mesmo módulo do sistema que gere a biblioteca de vídeos, o que permite verificar de forma consistente, no momento da eliminação (FA5, E13), se o vídeo é origem de um pedido *Em fila* ou *A processar*.],
  [Se os pedidos passarem a ser geridos por um módulo separado, será necessário um mecanismo explícito de reserva e libertação do vídeo de origem entre módulos.]
)

=== Questões em Aberto

#tabela(
  colunas: (1.4cm, 1fr, 1fr),
  [ID], [Questão em aberto], [Estado / Quem decide],

  [Q1],
  [Devem ser suportados na Fase 2 (Produção) outros formatos e codecs além de MP4/MOV com H.264/AAC, como WebM/MKV com H.265, VP9 e Opus?],
  [Em aberto para a Fase 2 (previsto como alvo de produção em `DQ-006`).],

  [Q2],
  [O perfil *Anónimo* deverá poder submeter pequenos vídeos para armazenamento temporário efémero numa versão futura?],
  [Em aberto para evolução futura fora do MVP (no MVP aplica-se `RN1`).],

  [Q3],
  [Na Fase 2 (Produção), deve existir retoma automática de um carregamento interrompido (_resumable upload_) em vez de reiniciar a submissão?],
  [Em aberto para a Fase 2 (no MVP a falha de ligação interrompe e limpa dados temporários conforme `E10`).]
)