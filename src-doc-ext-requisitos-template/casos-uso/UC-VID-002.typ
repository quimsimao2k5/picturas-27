#import "../template.typ": *

// UC-VID-002 — gerado a partir de Documentacao/RAS_UC_Biblioteca_Videos.md (versão v1.3)

== UC-VID-002 — Gerir Biblioteca de Vídeos e Adicionar Vídeo

=== Cabeçalho

#tab([Caso de uso UC-VID-002 — Gerir Biblioteca de Vídeos e Adicionar Vídeo],
  tabela-campos(
    [ID do Caso de Uso], [#raw("UC-VID-002");],
    [Nome], [Gerir Biblioteca de Vídeos e Adicionar Vídeo],
    [Versão], [v1.3],
    [Autores], [Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Joaquim Cunha],
    [Data], [2026-10-18],
    [Objetivo], [Permitir ao utilizador autenticado consultar e gerir a sua biblioteca pessoal de vídeos (incluindo visualizar metadados e eliminar vídeos) e carregar (#emph[upload];) novos ficheiros de vídeo validados para posterior reprodução e processamento.],
    [Âmbito], [Módulo de biblioteca, armazenamento e suporte a vídeo do PictuRAS (#emph[brownfield];)],
    [Ator Principal], [#strong[Utilizador Registado]; ou #strong[Utilizador Premium];],
    [_Stakeholders_ e Interesses], [
- #strong[Utilizador Registado / Premium:]; pretende carregar, organizar, consultar e eliminar os seus vídeos para os utilizar nas ferramentas do PictuRAS.
- #strong[Proprietário do Sistema:]; pretende controlar o armazenamento utilizado, aplicar limites diferenciados por escalão de subscrição e impedir o acesso de utilizadores não autenticados.
- #strong[Equipa de Desenvolvimento:]; pretende garantir uma fonte persistente e validada de vídeos (MP4/MOV em H.264/AAC) para as funcionalidades de reprodução e processamento.
],
    [Pré-condições], [
- A aplicação #emph[web]; PictuRAS e o serviço de armazenamento encontram-se disponíveis e operacionais.
- Para executar o fluxo principal, o utilizador tem sessão iniciada com perfil #strong[Registado]; ou #strong[Premium]; (tentativas sem sessão autenticada ou com perfil #strong[Anónimo]; são tratadas na exceção #raw("E1");).
],
    [_Trigger_], [O utilizador acede à sua #strong[Biblioteca de Vídeos]; e seleciona uma ação (no fluxo principal, #strong[Adicionar vídeo];).],
  ),
)

=== Fluxo Principal

#tab([UC-VID-002 — Fluxo principal],
  tabela(
    colunas: (1.2cm, 1fr, 1fr),
    [Passo], [Ação do Ator], [Resposta do Sistema],
    [#strong[1];], [O utilizador abre a sua biblioteca de vídeos.], [O sistema apresenta a lista de vídeos do utilizador no estado #strong[Disponível]; (com nome, duração, resolução e tamanho), o espaço de armazenamento ocupado face ao limite do perfil e as opções #strong[Adicionar vídeo]; e #strong[Eliminar vídeo];; quando existam, apresenta ainda, num painel separado de carregamentos recentes, os vídeos em submissão (#strong[A carregar]; / #strong[A validar];) e os vídeos #strong[Rejeitados]; com o respetivo motivo (RN14).],
    [#strong[2];], [O utilizador seleciona a opção #strong[Adicionar vídeo];.], [O sistema apresenta a interface para seleção de um ficheiro de vídeo.],
    [#strong[3];], [O utilizador seleciona um ficheiro de vídeo do seu dispositivo.], [O sistema identifica o tipo (formato) e o tamanho do ficheiro selecionado e apresenta ao utilizador o nome, o formato identificado e o tamanho do ficheiro antes da submissão.],
    [#strong[4];], [O utilizador confirma a submissão.], [O sistema verifica o formato do ficheiro (MP4 ou MOV), o limite máximo de tamanho por vídeo do perfil e a existência de espaço de armazenamento disponível na biblioteca; sendo válidos, cria o registo do vídeo associado ao utilizador autenticado, atribui-lhe um identificador único e define o estado #strong[A carregar];.],
    [#strong[5];], [—], [O sistema realiza o carregamento (#emph[upload];) do ficheiro de vídeo e apresenta o respetivo progresso (%).],
    [#strong[6];], [—], [Após concluir o carregamento, o sistema altera o estado do vídeo para #strong[A validar]; (não estando a opção de cancelar disponível neste passo) e valida a integridade do ficheiro, o codec de vídeo (H.264) e, quando existir faixa de áudio, o codec de áudio (AAC).],
    [#strong[7];], [—], [Mantendo o estado #strong[A validar]; (sem opção de cancelar disponível), o sistema extrai os metadados técnicos do vídeo (duração e resolução), verifica que a duração e a resolução não excedem os limites máximos do perfil do utilizador e regista a duração, a resolução e o tamanho do vídeo.],
    [#strong[8];], [—], [O sistema armazena persistentemente o vídeo, atualiza o espaço de armazenamento ocupado na biblioteca do utilizador e atribui ao vídeo o estado #strong[Disponível];.],
    [#strong[9];], [O utilizador consulta a biblioteca atualizada.], [O sistema apresenta o novo vídeo na biblioteca com o estado #strong[Disponível]; e os respetivos metadados registados.],
  ),
)

=== Fluxos Alternativos

#tab([UC-VID-002 — Fluxos alternativos],
  tabela(
    colunas: (3.2cm, 1fr),
    [Fluxo], [Descrição],
    [#strong[FA1 — Cancelar antes do carregamento];], [No passo 3, antes de confirmar a submissão, o utilizador decide cancelar → o sistema regressa à biblioteca sem iniciar o carregamento nem criar qualquer registo de vídeo.],
    [#strong[FA2 — Cancelar durante o carregamento];], [No passo 5, enquanto o vídeo está no estado #strong[A carregar]; (único estado após a confirmação em que o cancelamento é permitido; nos passos 6 e 7, em #strong[A validar];, a opção de cancelar não está disponível), o utilizador solicita o cancelamento → o sistema interrompe a transferência, elimina os dados parciais recebidos e remove o registo temporário.],
    [#strong[FA3 — Alterar o ficheiro selecionado];], [No passo 3, antes da confirmação, o utilizador escolhe outro ficheiro do seu dispositivo → o sistema substitui a seleção anterior e apresenta o nome, o formato e o tamanho do novo ficheiro.],
    [#strong[FA4 — Consultar biblioteca e metadados sem adicionar vídeo];], [No passo 1, em vez de selecionar #strong[Adicionar vídeo];, o utilizador seleciona um vídeo no estado #strong[Disponível]; da sua biblioteca → o sistema apresenta os metadados registados desse vídeo (nome, identificador, formato, duração, resolução e tamanho).],
    [#strong[FA5 — Eliminar manualmente um vídeo da biblioteca];], [No passo 1, o utilizador seleciona a opção #strong[Eliminar vídeo]; sobre um vídeo #strong[Disponível]; da sua biblioteca e confirma a operação → o sistema verifica que o vídeo não está a ser utilizado num pedido de processamento ativo (#strong[Em fila]; ou #strong[A processar];), elimina o ficheiro do armazenamento e o registo da biblioteca, e liberta o espaço correspondente no limite de armazenamento do perfil.],
    [#strong[FA6 — Utilizador sai da aplicação durante a validação];], [Nos passos 6 ou 7, após o carregamento estar concluído e enquanto o vídeo se encontra no estado #strong[A validar];, o utilizador fecha a aplicação ou sai da biblioteca → o sistema conclui em segundo plano a validação técnica e o armazenamento persistente (ou a rejeição e limpeza temporária) e, quando o utilizador regressa à biblioteca, apresenta o vídeo no estado #strong[Disponível]; na listagem ou informa-o, no painel de carregamentos recentes (RN14), do motivo pelo qual o vídeo ficou #strong[Rejeitado];.],
    [#strong[FA7 — Dispensar aviso de vídeo rejeitado];], [No passo 1, o painel de carregamentos recentes apresenta um vídeo no estado #strong[Rejeitado]; com o respetivo motivo e o utilizador seleciona #strong[Dispensar]; → o sistema remove o registo desse vídeo rejeitado (que já não possui ficheiro armazenado) e deixa de o apresentar no painel.],
  ),
)

=== Exceções

#tab([UC-VID-002 — Exceções],
  tabela(
    colunas: (1.2cm, 1fr, 1.6fr),
    [ID], [Condição], [Comportamento do Sistema],
    [#strong[E1];], [#strong[Utilizador não autenticado ou com perfil Anónimo];], [Um utilizador sem sessão autenticada ou com perfil Anónimo tenta aceder à biblioteca ou submeter um vídeo → o sistema impede o acesso e o carregamento, informa que a biblioteca de vídeos requer conta registada e redireciona o utilizador para a página de autenticação/registo.],
    [#strong[E2];], [#strong[Formato de vídeo não suportado];], [No passo 4, o ficheiro selecionado não está em formato MP4 ou MOV → o sistema rejeita a submissão antes de criar qualquer registo ou iniciar o carregamento e informa o utilizador de que o formato não é suportado (indicando MP4 e MOV como formatos aceites).],
    [#strong[E3];], [#strong[Tamanho máximo por vídeo excedido];], [No passo 4, o tamanho do ficheiro excede o limite do perfil (100 MB para Registado; 1 GB para Premium) → o sistema rejeita a submissão antes de criar qualquer registo ou iniciar o carregamento e informa o utilizador do limite máximo de tamanho aplicável ao seu perfil.],
    [#strong[E4];], [#strong[Limite de armazenamento da biblioteca atingido];], [No passo 4, o espaço disponível na biblioteca do utilizador é inferior ao tamanho do ficheiro (limite total de 500 MB para Registado; 10 GB para Premium) → o sistema rejeita a submissão antes de criar qualquer registo ou iniciar o carregamento e informa o utilizador de que não existe espaço de armazenamento suficiente.],
    [#strong[E5];], [#strong[Codec de vídeo não suportado];], [No passo 6, o fluxo de vídeo não utiliza o codec H.264 → o sistema atribui ao vídeo o estado #strong[Rejeitado];, elimina os dados temporários carregados e informa o utilizador da incompatibilidade do codec de vídeo.],
    [#strong[E6];], [#strong[Codec de áudio não suportado];], [No passo 6, o vídeo possui uma faixa de áudio cujo codec não é AAC → o sistema atribui ao vídeo o estado #strong[Rejeitado];, elimina os dados temporários carregados e informa o utilizador da incompatibilidade do codec de áudio.],
    [#strong[E7];], [#strong[Ficheiro corrompido ou ilegível];], [No passo 6, o ficheiro de vídeo encontra-se corrompido ou ilegível → o sistema atribui ao vídeo o estado #strong[Rejeitado];, elimina os dados temporários associados ao carregamento e informa o utilizador de que o vídeo está corrompido ou ilegível e não pôde ser validado.],
    [#strong[E8];], [#strong[Duração máxima excedida];], [No passo 7, a duração extraída do vídeo excede o limite do perfil (3 minutos para Registado; 30 minutos para Premium) → o sistema atribui ao vídeo o estado #strong[Rejeitado];, elimina os dados temporários e informa o utilizador do limite máximo de duração aplicável ao seu perfil.],
    [#strong[E9];], [#strong[Resolução máxima excedida];], [No passo 7, a resolução extraída do vídeo excede o limite do perfil (1080p para Registado; 4K para Premium), avaliado independentemente da orientação conforme RN10 → o sistema atribui ao vídeo o estado #strong[Rejeitado];, elimina os dados temporários e informa o utilizador do limite máximo de resolução aplicável ao seu perfil.],
    [#strong[E10];], [#strong[Falha de ligação durante o carregamento];], [No passo 5, a transferência de dados é interrompida por falha de rede → o sistema interrompe o carregamento, elimina os dados temporários recebidos e informa o utilizador da falha de ligação.],
    [#strong[E11];], [#strong[Falha de armazenamento];], [No passo 8, ocorre uma falha ao guardar persistentemente o ficheiro → o sistema não conclui a submissão, elimina os dados temporários associados e informa o utilizador da falha de armazenamento.],
    [#strong[E12];], [#strong[Sessão expirada durante a operação];], [Durante os passos 5 a 8, a sessão do utilizador expira antes de a validação técnica e o armazenamento persistente estarem concluídos → o sistema não disponibiliza o vídeo na biblioteca, elimina os dados temporários e o registo provisório e solicita nova autenticação.],
    [#strong[E13];], [#strong[Tentativa de eliminar vídeo em utilização numa operação ativa];], [Em FA5, o utilizador tenta eliminar um vídeo que está a ser usado como origem de um pedido de processamento nos estados #strong[Em fila]; ou #strong[A processar]; → o sistema impede a eliminação e informa o utilizador de que o vídeo está a ser utilizado numa operação em curso, só podendo ser eliminado após o pedido passar para #strong[Concluído];, #strong[Falhou]; ou #strong[Cancelado];.],
  ),
)

=== Pós-condições

#tab([UC-VID-002 — Pós-condições],
  tabela(
    colunas: (3cm, 1fr),
    [Tipo], [Resultado],
    [#strong[Garantia de Sucesso];], [No carregamento: o vídeo encontra-se integralmente armazenado de forma persistente, associado ao utilizador autenticado, com identificador único e metadados (duração, resolução e tamanho) registados, o espaço ocupado na biblioteca do utilizador encontra-se atualizado e o vídeo é apresentado na respetiva biblioteca com o estado #strong[Disponível];. Na eliminação (FA5): o vídeo deixa de existir na biblioteca e o respetivo espaço de armazenamento fica libertado. A quota diária de operações mantém-se inalterada.],
    [#strong[Garantia Mínima];], [Em caso de falha, rejeição ou cancelamento, nenhum ficheiro incompleto ou inválido adquire o estado #strong[Disponível]; nem é apresentado como utilizável na biblioteca, os dados parciais/temporários são eliminados, os vídeos em uso por pedidos ativos permanecem protegidos e a quota diária de operações mantém-se intacta.],
  ),
)

=== Regras de Negócio e Restrições

#tab([UC-VID-002 — Regras de negócio e restrições],
  tabela(
    colunas: (1.2cm, 1fr),
    [ID], [Regra],
    [#strong[RN1];], [Apenas utilizadores autenticados com perfil #strong[Registado]; ou #strong[Premium]; possuem uma biblioteca pessoal de vídeos no MVP; o perfil #strong[Anónimo]; não tem acesso.],
    [#strong[RN2];], [Cada vídeo armazenado na biblioteca deve estar associado ao utilizador autenticado que efetuou a submissão (ou que o gerou através de uma ferramenta de processamento).],
    [#strong[RN3];], [Um utilizador apenas pode consultar, reproduzir, selecionar para processamento e eliminar os vídeos pertencentes à sua própria biblioteca.],
    [#strong[RN4];], [Os formatos (contentores) de vídeo suportados na biblioteca no MVP são #strong[MP4]; e #strong[MOV];.],
    [#strong[RN5];], [No MVP, o codec de vídeo suportado na biblioteca é #strong[H.264 (AVC)];.],
    [#strong[RN6];], [Quando o vídeo possuir faixa de áudio, o codec de áudio suportado no MVP é #strong[AAC]; (vídeos sem faixa de áudio são igualmente aceites).],
    [#strong[RN7];], [O ciclo de vida de um vídeo cujo registo é criado no passo 4 compreende os estados #strong[A carregar]; (durante a transferência no passo 5, único estado em que o cancelamento pelo utilizador é permitido), #strong[A validar]; (durante a verificação técnica e extração de metadados nos passos 6 e 7, sem opção de cancelamento), #strong[Disponível]; (após validação e armazenamento com sucesso no passo 8) e #strong[Rejeitado]; (quando qualquer validação nos passos 6 e 7 falha). Rejeições no passo 4 (#raw("E2");, #raw("E3");, #raw("E4");) ocorrem antes da criação do registo e não atribuem estado.],
    [#strong[RN8];], [Um vídeo incompleto, corrompido ou nos estados #strong[A carregar];, #strong[A validar]; ou #strong[Rejeitado]; não pode ser apresentado como vídeo disponível na biblioteca nem selecionado para reprodução ou processamento, sendo os respetivos ficheiros temporários eliminados quando a submissão falha ou é rejeitada.],
    [#strong[RN9];], [Cada vídeo armazenado possui um identificador único no sistema, independentemente do nome do ficheiro; se já existir na biblioteca um vídeo com o mesmo nome, o sistema permite a submissão, atribui ao novo vídeo um identificador distinto e mantém ambos os vídeos.],
    [#strong[RN10];], [Os limites máximos de tamanho por vídeo, duração, resolução e capacidade total de armazenamento na biblioteca dependem do perfil do utilizador:
- #strong[Utilizador Registado:]; tamanho até #strong[100 MB]; por vídeo, duração até #strong[3 minutos (180 s)];, resolução até #strong[1080p (1920 × 1080)]; e espaço total de armazenamento na biblioteca até #strong[500 MB];.
- #strong[Utilizador Premium:]; tamanho até #strong[1 GB]; por vídeo, duração até #strong[30 minutos (1800 s)];, resolução até #strong[4K (3840 × 2160)]; e espaço total de armazenamento na biblioteca até #strong[10 GB];.O limite de resolução é avaliado independentemente da orientação do vídeo: o lado maior não pode exceder 1920 px (Registado) / 3840 px (Premium) e o lado menor não pode exceder 1080 px (Registado) / 2160 px (Premium); assim, um vídeo vertical de 1080 × 1920 é aceite para o perfil Registado.
],
    [#strong[RN11];], [O processamento posterior de um vídeo (ex.: recorte em #raw("UC-VID-001");) é contabilizado segundo as regras de quota diária aplicáveis ao perfil do utilizador.],
    [#strong[RN12];], [A consulta da biblioteca, a adição (#emph[upload];) e a eliminação de vídeos não consomem operações da quota diária de 5 operações do utilizador #strong[Registado];.],
    [#strong[RN13];], [Os vídeos no estado #strong[Disponível]; permanecem guardados na biblioteca enquanto a conta do utilizador estiver ativa, até serem eliminados manualmente pelo utilizador; um vídeo não pode ser eliminado enquanto estiver a ser utilizado como origem de um pedido de processamento nos estados #strong[Em fila]; ou #strong[A processar];.],
    [#strong[RN14];], [Os vídeos nos estados #strong[A carregar];, #strong[A validar]; e #strong[Rejeitado]; não fazem parte da lista de vídeos da biblioteca; são apresentados apenas num painel separado de carregamentos recentes, com o respetivo estado e, no caso dos #strong[Rejeitados];, o motivo da rejeição, até o utilizador dispensar o aviso (FA7). Um vídeo #strong[Rejeitado]; não ocupa espaço de armazenamento na biblioteca.],
  ),
)

=== Assunções

#tab([UC-VID-002 — Assunções],
  tabela(
    colunas: (1.2cm, 1.6fr, 1fr),
    [ID], [Assunção], [Impacto se for falsa],
    [#strong[A1];], [Cada utilizador registado ou premium possui uma biblioteca pessoal persistente de vídeos no PictuRAS.], [Será necessário definir outro mecanismo de organização e propriedade dos vídeos.],
    [#strong[A2];], [O perfil anónimo não possui biblioteca nem armazenamento persistente de vídeos no MVP.], [Será necessário definir armazenamento temporário e regras de eliminação automática para sessões anónimas.],
    [#strong[A3];], [Os contentores e codecs suportados no MVP são MP4 e MOV com vídeo H.264 e áudio AAC (decisão transversal da equipa alinhada entre #raw("UC-VID-001");, #raw("UC-VID-002"); e #raw("UC-VID-003");).], [Os requisitos de compatibilidade e os respetivos testes terão de ser revistos.],
    [#strong[A4];], [#strong[Decisão da equipa:]; Os valores numéricos dos limites por perfil no MVP foram fixados pela equipa em: #strong[Registado]; (100 MB por vídeo, 3 min de duração, 1080p, 500 MB de armazenamento total na biblioteca) e #strong[Premium]; (1 GB por vídeo, 30 min de duração, 4K, 10 GB de armazenamento total na biblioteca).], [Caso o cliente/docente defina outros limites, bastará atualizar os parâmetros de configuração sem alterar a estrutura de validação.],
    [#strong[A5];], [O tamanho e o tipo do ficheiro podem ser lidos antes do envio, mas a duração, a resolução e os codecs reais de vídeo/áudio só são extraídos e validados de forma fiável no servidor após a receção do ficheiro no passo 6–7.], [Se houver pré-leitura no cliente, servirá apenas como validação preliminar, mantendo-se a validação obrigatória no servidor.],
    [#strong[A6];], [#strong[Decisão da equipa:]; Os vídeos no estado #strong[Disponível]; na biblioteca (submetidos pelo utilizador ou gerados por operações como o recorte em #raw("UC-VID-001");) são conservados até eliminação manual pelo utilizador, dentro da quota de armazenamento do perfil.], [Se for imposta expiração temporal à biblioteca, será necessário criar uma rotina de limpeza periódica.],
    [#strong[A7];], [#strong[Decisão da equipa:]; Os alvos quantitativos de qualidade do MVP e de Produção (atualização de progresso a cada ≤ 2 s no MVP vs. ≤ 1 s em Produção; tempo de validação pós-upload ≤ 5 s no MVP vs. ≤ 2 s em Produção) seguem as decisões #raw("UC-VID-002/DQ-001"); a #raw("DQ-006"); da secção 7.2.], [Ajuste das metas de desempenho nos testes não funcionais.],
    [#strong[A8];], [#strong[Decisão da equipa:]; Os pedidos de processamento de vídeo (ex.: recorte em #raw("UC-VID-001");) são registados e geridos no mesmo módulo do sistema que gere a biblioteca de vídeos, o que permite verificar de forma consistente, no momento da eliminação (FA5, E13), se o vídeo é origem de um pedido #strong[Em fila]; ou #strong[A processar];.], [Se os pedidos passarem a ser geridos por um módulo separado, será necessário um mecanismo explícito de reserva e libertação do vídeo de origem entre módulos.],
  ),
)

=== Questões em Aberto

#tab([UC-VID-002 — Questões em aberto],
  tabela(
    colunas: (1.2cm, 1.6fr, 1fr),
    [ID], [Questão em aberto], [Estado / Quem decide],
    [#strong[Q1];], [Devem ser suportados na Fase 2 (Produção) outros formatos e codecs além de MP4/MOV com H.264/AAC, como WebM/MKV com H.265, VP9 e Opus?], [Em aberto para a Fase 2 (previsto como alvo de produção em #raw("DQ-006");).],
    [#strong[Q2];], [O perfil #strong[Anónimo]; deverá poder submeter pequenos vídeos para armazenamento temporário efémero numa versão futura?], [Em aberto para evolução futura fora do MVP (no MVP aplica-se #raw("RN1");).],
    [#strong[Q3];], [Na Fase 2 (Produção), deve existir retoma automática de um carregamento interrompido (#emph[resumable upload];) em vez de reiniciar a submissão?], [Em aberto para a Fase 2 (no MVP a falha de ligação interrompe e limpa dados temporários conforme #raw("E10");).],
  ),
)
