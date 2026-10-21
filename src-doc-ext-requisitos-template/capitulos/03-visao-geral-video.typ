#import "../template.typ": *

= Visão Geral da Extensão de Vídeo

== Funcionalidades de vídeo do MVP

#tab([Funcionalidades de vídeo do MVP],
  tabela(
    colunas: (1fr, 2.1cm, 2.3cm, 2cm, 2.4cm, 2.4cm),
    [Funcionalidade], [Caso de uso], [Prefixo(s) REQ], [Perfis], [Dependências], [Estado de implementação],
    [Gestão e adição à biblioteca pessoal], [UC-VID-002], [REQ-VID-LIB], [Reg., Prem.], [—], [Implementada],
    [Reprodução progressiva e leitor web], [UC-VID-003], [REQ-VID-PLAY], [Reg., Prem.], [REQ-VID-LIB], [Implementada],
    [Recorte temporal de vídeo (trimming)], [UC-VID-001], [REQ-VID-TRIM], [Reg., Prem.], [REQ-VID-LIB], [Implementada],
  ),
)

*Justificação no contexto do MVP.*

- *UC-VID-002 — Gerir Biblioteca de Vídeos e Adicionar Vídeo*: É a funcionalidade basilar e o ponto de entrada de todo o ecossistema de vídeo no PictuRAS. Permite validar a capacidade de *upload* de grandes ficheiros, o progresso contínuo da transferência, a extração de metadados no servidor, o controlo estrito de quotas de armazenamento por perfil (500 MB no Registado vs. 10 GB no Premium) e o isolamento de acessos entre utilizadores. Sem esta funcionalidade, não haveria uma fonte persistente nem autenticada de conteúdos para alimentar a reprodução ou as ferramentas de edição.
- *UC-VID-003 — Reproduzir Vídeo*: Valida a entrega e transmissão progressiva de vídeo (*HTTP Range Requests* com código 206) sem exigir o descarregamento prévio da totalidade do ficheiro de vídeo. Assegura o controlo de acessos temporários via credenciais assinadas (*presigned URLs* com tempo de vida limitado) e impõe o limite de transmissões simultâneas por perfil (1 *stream* para Registado vs. 3 para Premium). Sem esta funcionalidade, ficaria por validar a inspeção visual dos conteúdos e a verificação do resultado gerado por operações transformadoras.
- *UC-VID-001 — Recortar um Intervalo Temporal de um Vídeo*: É a ferramenta transformadora central do MVP, permitindo ao utilizador isolar o excerto relevante de um vídeo. Valida a arquitetura de processamento assíncrono em fila de segundo plano, a máquina de estados de trabalhos (*Em fila*, *A processar*, *Concluído*, *Falhou*, *Cancelado*), o acompanhamento periódico do progresso (%) e a gestão transacional de quota diária de operações (reserva ao submeter, consumo na conclusão e devolução no cancelamento/falha). Sem esta funcionalidade, ficaria por validar a integração com o motor externo de vídeo (FFmpeg) e o ciclo de vida completo de tarefas demoradas.

== Diagrama de casos de uso (atualizado)

#orientacao[
  *Ponto crítico a atualizar.* O diagrama de base (Figura abaixo) só contém casos de uso de imagem.
  O diagrama atualizado deve:
  - incluir todos os casos de uso UC-VID-nnn (e distinguir visualmente os novos — por exemplo, cor diferente);
  - indicar que perfil (ator) acede a cada um — coerente com as regras de negócio e com a tabela de perfis.
  Podem manter os casos de uso de imagem a cinzento, para dar contexto.
]

#figure(
  image("../images/baseline/diagrama_casos_uso_base.png", width: 85%),
  caption: [Diagrama de casos de uso da solução de base — *a substituir*],
)

#figure(kind: image,
  figura-pendente[diagrama de casos de uso atualizado com as funcionalidades de vídeo (`images/diagrama_casos_uso.png`)],
  caption: [Diagrama de casos de uso atualizado (Fase 1 — vídeo)],
)

#preencher[Texto que explique o diagrama: novos casos de uso, relações e decisões de modelação.]

== Modelo de domínio (atualizado)

#orientacao[
  *Ponto crítico a atualizar.* O modelo de base é centrado em `Imagem`. Com vídeo, pensem (pelo menos) em:
  - Como se relaciona `Vídeo` com `Imagem`? Especialização de um conceito comum (e.g., ficheiro de média),
    ou conceito independente? Que atributos de domínio são relevantes (duração, resolução, formato, …)?
  - Um `Projeto` passa a conter vídeos? Imagens e vídeos misturados?
  - O processamento de vídeo é demorado: há um conceito de *trabalho/pedido de processamento* com estado
    (em fila, em processamento, concluído, falhado, cancelado)? Qual o seu resultado?
  - Que `Ferramenta`s se aplicam a vídeo? As ferramentas de imagem aplicam-se a fotogramas?
  - Como se representam quotas/limites por perfil?
  O modelo de domínio descreve *conceitos do problema*, não classes, tabelas nem microserviços.
  Usem os mesmos termos que nos casos de uso e requisitos (se é "biblioteca", não passa a "galeria").
]

#figure(
  image("../images/baseline/modelo_dominio_base.png", width: 100%),
  caption: [Modelo de domínio da solução de base — *a substituir*],
)

#figure(kind: image,
  figura-pendente[modelo de domínio atualizado (`images/modelo_dominio.png`)],
  caption: [Modelo de domínio atualizado (Fase 1 — vídeo)],
)

O modelo de domínio foi atualizado para acomodar as abstrações do processamento multimédia de vídeo:
- *Ficheiro de Média e Vídeo*: Introduz-se o conceito genérico de `Ficheiro de Média`, especializando-se em `Imagem` (da *baseline*) e `Vídeo`. O `Vídeo` encapsula atributos essenciais de domínio como `duração`, `resolução`, `formato/contentor` (MP4/MOV), `codec de vídeo` (H.264), `codec de áudio` (AAC), `tamanho` e o seu `estado` (*A carregar*, *A validar*, *Disponível*, *Rejeitado*).
- *Biblioteca e Separabilidade*: A entidade `Biblioteca` passa a conter e isolar os vídeos de cada utilizador. Enquanto a entidade `Projeto` continua reservada para a edição e encadeamento de imagens estáticas, os vídeos no MVP vivem autonomamente na `Biblioteca` do utilizador, sendo selecionados individualmente para reprodução ou recorte.
- *Trabalho de Processamento*: O processamento assíncrono de vídeo é conceptualizado através da entidade `Trabalho de Processamento` (associada ao pedido de recorte), caracterizado pelo seu ciclo de vida/estado (`Em fila`, `A processar`, `Concluído`, `Falhou`, `Cancelado`), progresso de execução e resultado gerado (um novo `Vídeo` autónomo adicionado à `Biblioteca`).
- *Limites e Quotas por Perfil*: O `Perfil` de subscrição define os parâmetros operacionais (limite de tamanho por vídeo, duração máxima, resolução máxima, quota total de armazenamento e limite de *streams* simultâneos).

== Regras de negócio transversais

#tab([Regras de negócio transversais],
  tabela(
    colunas: (1.8cm, 1fr, 3.2cm, 3.2cm),
    [ID], [Regra], [Origem / justificação], [Requisitos],
    [RNG-01], [Formatos e Codecs do MVP: Apenas são suportados vídeos nos contentores MP4 e MOV, codificados em H.264 (vídeo) e AAC (áudio) ou sem áudio.], [Decisão de compatibilidade (DQ-006 / A3)], [REQ-VID-LIB-018, REQ-VID-LIB-019, REQ-VID-PLAY-024, REQ-VID-TRIM-050],
    [RNG-02], [Isenção de Quotas em Operações de Consulta: As operações de carregamento, listagem, visualização/reprodução e eliminação de vídeos não consomem a quota diária de 5 operações do perfil Registado.], [Políticas do modelo SaaS (RN12 / RN3)], [REQ-VID-LIB-034, REQ-VID-PLAY-028, REQ-VID-TRIM-002],
    [RNG-03], [Contabilidade Transacional de Operações: Operações de processamento de vídeo (recorte) consomem 1 operação da quota diária; a operação é reservada no registo, consumida na conclusão com sucesso e devolvida em caso de falha ou cancelamento.], [Gestão justa de quota (RN3 / RN11)], [REQ-VID-TRIM-013, REQ-VID-TRIM-022, REQ-VID-TRIM-032, REQ-VID-TRIM-046],
    [RNG-04], [Isolamento e Segurança de Recursos: Um utilizador só pode consultar, reproduzir, processar ou eliminar vídeos pertencentes à sua própria biblioteca.], [Garantia de privacidade (RN3 / RN4)], [REQ-VID-LIB-032, REQ-VID-LIB-033, REQ-VID-PLAY-029, REQ-VID-TRIM-059],
    [RNG-05], [Retenção e Eliminação Segura: Ficheiros de vídeo no estado Disponível são conservados indefinidamente até eliminação manual. Um vídeo de origem não pode ser eliminado enquanto for alvo de um trabalho Em fila ou A processar.], [Integridade de dados (RN13 / E6)], [REQ-VID-LIB-057, REQ-VID-LIB-058, REQ-VID-PLAY-022, REQ-VID-TRIM-048],
    [RNG-06], [Acesso Temporário e Assinado: Todos os fluxos binários de vídeo são servidos via endereços assinados temporários com tempo de vida limitado (30 min no MVP), sem expor URLs permanentes.], [Segurança de entrega (RN2 / DQ3)], [REQ-VID-PLAY-005, REQ-VID-PLAY-027, REQ-VID-PLAY-037, REQ-VID-PLAY-047],
  ),
)

== Convenções de identificação

#tabela(
  colunas: (4.2cm, 1fr),
  [Identificador], [Utilização],
  [UC-VID-nnn], [Caso de uso de vídeo (numeração única no relatório, a partir de UC-VID-001)],
  [REQ-VID-{FUNC}-nnn], [Requisito (funcional ou não funcional); {FUNC} identifica a funcionalidade ou a área do serviço (e.g., TRIM, SUBMIT, STATUS); IDs nunca se reutilizam],
  [RN#emph[k], A#emph[k], Q#emph[k], FA#emph[k]], [Regra, assunção, questão em aberto e fluxo alternativo de um caso de uso (locais ao caso de uso; qualificados, e.g. `UC-VID-001/RN2`, nas tabelas partilhadas)],
  [RNG-nn / DQ-nnn], [Regra de negócio transversal / decisão de qualidade (globais)],
  [DA-nn], [Decisão arquitetural (Capítulo de Arquitetura)],
  [TST-{FUNC}-nn], [Teste (automático ou manual)],
  [T-nn], [Tarefa de manutenção corretiva da solução de base],
  [UCnn, RFnn, RNFnn], [Elementos do documento de requisitos de base (referidos quando são alterados — ALT)],
)
