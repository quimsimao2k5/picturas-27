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
- *UC-VID-001 — Recortar um Intervalo Temporal de um Vídeo*: É a ferramenta transformadora central do MVP, permitindo ao utilizador isolar o excerto relevante de um vídeo. Valida a arquitetura de processamento assíncrono em fila de segundo plano, o ciclo de vida dos pedidos (*Em fila*, *A processar*, *Concluído*, *Falhou*, *Cancelado*), o acompanhamento periódico do progresso (%) e a gestão transacional de quota diária de operações (reserva ao submeter, consumo na conclusão e devolução no cancelamento/falha). Sem esta funcionalidade, ficaria por validar a integração com o motor externo de vídeo (FFmpeg) e o ciclo de vida completo de tarefas demoradas.

== Diagrama de casos de uso (atualizado)

#orientacao[
  *Ponto crítico a atualizar.* O diagrama de base (Figura abaixo) só contém casos de uso de imagem.
  O diagrama atualizado deve:
  - incluir todos os casos de uso UC-VID-nnn (e distinguir visualmente os novos — por exemplo, cor diferente);
  - indicar que perfil (ator) acede a cada um — coerente com as regras de negócio e com a tabela de perfis.
  Podem manter os casos de uso de imagem a cinzento, para dar contexto.
]

#figure(
  image("../images/diagrama_casos_uso.png", width: 100%),
  caption: [Diagrama de casos de uso atualizado (Fase 1 — vídeo)],
) <fig-uc>

Os três casos de uso de vídeo (a azul) foram acrescentados aos casos de uso da solução de base (a cinzento), que se mantêm para dar contexto. Na solução de base, o ator Anónimo especializa o Utilizador; ligar os casos de uso de vídeo ao Utilizador daria, por herança, acesso ao Anónimo, o que contraria UC-VID-002/RN1 e UC-VID-003/RN5. Por isso foi introduzido o ator *Registado*, especialização do Utilizador, e os casos de uso de vídeo ligam-se apenas ao Registado e ao Premium. As diferenças entre estes dois perfis são limites (tamanho, duração, resolução, espaço, transmissões e recortes simultâneos), não casos de uso diferentes. Reproduzir e Recortar operam sobre vídeos Disponíveis da biblioteca, mas não se modelaram relações «include» ou «extend»: são casos de uso independentes, iniciados pelo utilizador a partir da biblioteca.

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


O modelo de domínio atualizado (@fig-dominio, na página seguinte) mantém todos os conceitos da solução de base (a cinzento) e acrescenta os conceitos de vídeo (a azul), com os mesmos termos usados nos casos de uso:
- *Ficheiro de Média* generaliza *Imagem* (da base) e *Vídeo*. O Vídeo tem duração, resolução, codecs (H.264; AAC ou sem áudio) e um estado: A carregar, A validar, Disponível ou Rejeitado.
- *Biblioteca de Vídeos*: cada utilizador Gratuito (Registado) ou Premium tem uma, que contém os seus vídeos e regista o espaço ocupado. Os vídeos não pertencem a Projetos, que continuam a conter apenas imagens, e o Anónimo não tem biblioteca.
- *Limites de Vídeo do Perfil*: valores por perfil para o tamanho por vídeo, a duração, a resolução, o espaço total, as transmissões simultâneas e os recortes ativos simultâneos.
- *Pedido de Recorte*: aplica a ferramenta *Recorte*, especialização de *Ferramenta de Vídeo* (por sua vez uma Ferramenta), a um vídeo de origem. Tem intervalo, formato e nome de saída, estado (Em fila, A processar, Concluído, Falhou ou Cancelado) e progresso. Quando é concluído produz um vídeo novo e independente; ao ser submetido reserva uma operação da *Quota Diária de Operações* do utilizador Gratuito.
- *Transmissão*: cada reprodução ativa de um vídeo; é o que conta para o limite de transmissões simultâneas.
- As ferramentas de imagem não se aplicam a vídeos nem a fotogramas no MVP.

#paisagem[
#figure(
  image("../images/modelo_dominio.png", height: 15.2cm),
  caption: [Modelo de domínio atualizado (Fase 1 — vídeo)],
) <fig-dominio>
]

== Regras de negócio transversais

As regras seguintes são comuns aos três casos de uso. Cada uma tem origem numa regra local (qualificada pelo caso de uso) e é verificada pelos requisitos indicados.

#tab([Regras de negócio transversais],
  tabela(
    colunas: (1.6cm, 1fr, 3.4cm, 3.4cm),
    [ID], [Regra], [Origem], [Requisitos],
    [RNG-01], [*Formatos e codecs do MVP.* Só são aceites vídeos nos contentores MP4 e MOV, com vídeo H.264 e áudio AAC (ou sem áudio).], [UC-VID-002/RN4–RN6, A3; UC-VID-003/RN1; UC-VID-001/RN1], [REQ-VID-LIB-018, 019, 046; REQ-VID-PLAY-024; REQ-VID-TRIM-050],
    [RNG-02], [*Consulta e gestão sem quota.* Consultar a biblioteca, carregar, reproduzir e eliminar vídeos não consome a quota diária de 5 operações do perfil Registado.], [UC-VID-002/RN12; UC-VID-003/RN3], [REQ-VID-LIB-034; REQ-VID-PLAY-028; REQ-VID-TRIM-002],
    [RNG-03], [*Quota com reserva e devolução.* Cada recorte conta como 1 operação: é reservada ao submeter, consumida na conclusão e devolvida se o pedido falhar ou for cancelado.], [UC-VID-001/RN3; UC-VID-002/RN11], [REQ-VID-TRIM-013, 022, 032, 046; REQ-VID-LIB-045],
    [RNG-04], [*Isolamento entre utilizadores.* Um utilizador só pode consultar, reproduzir, processar ou eliminar vídeos da sua própria biblioteca.], [UC-VID-002/RN3; UC-VID-003/RN4], [REQ-VID-LIB-032, 033; REQ-VID-PLAY-029; REQ-VID-TRIM-059],
    [RNG-05], [*Retenção e eliminação.* Os vídeos Disponíveis são conservados até serem eliminados pelo utilizador. Um vídeo não pode ser eliminado enquanto for origem de um pedido Em fila ou A processar.], [UC-VID-002/RN13, A6; UC-VID-001/E6], [REQ-VID-LIB-057, 058; REQ-VID-PLAY-022],
    [RNG-06], [*Acesso temporário e assinado.* Os bytes de vídeo só são servidos por endereços assinados com validade máxima de 30 min no MVP; não há endereços permanentes.], [UC-VID-003/RN2, DQ3], [REQ-VID-PLAY-005, 027, 037, 047],
    [RNG-07], [*Limites por perfil.* Registado: 100 MB por vídeo, 3 min, até 1080p, 500 MB no total, 1 transmissão e 1 recorte ativo. Premium: 1 GB, 30 min, até 4K, 10 GB, 3 transmissões e 3 recortes ativos. A resolução é avaliada independentemente da orientação.], [UC-VID-002/RN10, A4; UC-VID-003/RN6; UC-VID-001/RN4], [REQ-VID-LIB-015–017, 055; REQ-VID-PLAY-039; REQ-VID-TRIM-043],
  ),
)

== Convenções de identificação

#tabela(
  colunas: (4.2cm, 1fr),
  [Identificador], [Utilização],
  [UC-VID-nnn], [Caso de uso de vídeo: UC-VID-001 (Recorte), UC-VID-002 (Biblioteca), UC-VID-003 (Reprodução)],
  [REQ-VID-{FUNC}-nnn], [Requisito funcional ou não funcional; {FUNC} é #raw("TRIM"), #raw("LIB") ou #raw("PLAY"). Os identificadores nunca se reutilizam: os requisitos retirados ou transformados em referência mantêm a sua linha],
  [RN#emph[k], A#emph[k], Q#emph[k], FA#emph[k], E#emph[k]], [Regra, assunção, questão em aberto, fluxo alternativo e exceção de um caso de uso. São locais ao caso de uso e, fora dele, aparecem qualificados (e.g., #raw("UC-VID-001/RN2"))],
  [DQ-nnn / DQ#emph[k]], [Decisão de qualidade de um caso de uso (DQ-nnn na Biblioteca e no Recorte, DQ#emph[k] na Reprodução). São locais ao caso de uso e qualificadas na Secção 7.2],
  [RNG-nn], [Regra de negócio transversal (Secção 3.4)],
  [DA-nn], [Decisão arquitetural (Secção 8.2)],
  [TST-{FUNC}-nn], [Teste (automático, ponta a ponta ou manual), Capítulo 10],
  [T-nn], [Tarefa de manutenção corretiva da solução de base, Capítulo 11],
)
