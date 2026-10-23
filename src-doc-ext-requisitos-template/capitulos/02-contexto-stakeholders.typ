#import "../template.typ": *

= Contexto, Perfis e _Stakeholders_ (revisão)

#orientacao[
  Capítulo de *revisão*: só registam o que muda com o vídeo. Não copiem o documento de base.
  - Os *perfis de utilização* (anónimo, registado, premium) continuam válidos? Que limites passam a
    existir para vídeo (duração, tamanho, resolução, nº de operações)? Um vídeo conta como uma operação?
  - Surgem *novos _stakeholders_* ou *interesses novos* nos existentes (e.g., custo de processamento e armazenamento
    para o proprietário do sistema; equipa de operações)?
  - Os _stakeholders_ aqui listados devem ser os mesmos que aparecem na secção "_Stakeholders_ e Interesses"
    de cada caso de uso — usem os mesmos nomes.
]

== Perfis de utilização e vídeo

#tab([Perfis de utilização e respetivo acesso a vídeo],
  tabela(
    colunas: (2.6cm, 4.2cm, 1fr, 2.6cm),
    [Perfil], [Situação na _baseline_], [Alteração introduzida para vídeo], [Regras / requisitos],
    [Anónimo], 
    [Operações limitadas, imagens pequenas], 
    [Sem acesso a vídeo. Impedido de aceder à biblioteca, de carregar vídeos ou de reproduzir. É redirecionado para a página de autenticação/registo.], 
    [UC-VID-002/RN1, UC-VID-003/RN5, REQ-VID-LIB-048, 049, REQ-VID-PLAY-030, 031],

    [Registado], 
    [Gratuito, até 5 operações/dia], 
    [Acesso à biblioteca e à reprodução, que não consomem a quota diária. Cada recorte consome 1 das 5 operações diárias. Limites: 100 MB/vídeo, 3 min de duração, resolução até 1080p (em qualquer orientação), 500 MB de armazenamento total, 1 _stream_ e 1 recorte ativo de cada vez.], 
    [UC-VID-002/RN10, RN12; UC-VID-001/RN3; REQ-VID-LIB-015–017, 034, REQ-VID-PLAY-039, REQ-VID-TRIM-002, 043],

    [Premium], 
    [Pago, uso ilimitado], 
    [Sem limite diário de operações. Limites superiores para vídeo: 1 GB/vídeo, 30 min de duração, resolução até 4K, 10 GB de armazenamento total, até 3 _streams_ e até 3 recortes ativos em simultâneo. A prioridade do Premium na fila de recortes fica para a Fase 2 (UC-VID-001, Q1).], 
    [UC-VID-002/RN10, UC-VID-003/RN6, UC-VID-001/RN4; REQ-VID-LIB-015–017, REQ-VID-PLAY-039, REQ-VID-TRIM-043],
  ),
)

== _Stakeholders_ e interesses

#tab([_Stakeholders_ e interesses (novos ou revistos)],
  tabela(
    colunas: (3.2cm, 2cm, 1fr, 2cm, 3.2cm),
    [_Stakeholder_], [Estado], [Interesse(s) relativamente ao vídeo], [Influência], [UC / requisitos],
    [Utilizador Registado], 
    [Revisto], 
    [Pretende carregar, organizar, reproduzir e recortar vídeos dentro dos limites gratuitos, sem consumir quota em operações de mera consulta ou gestão.], 
    [Alta], 
    [UC-VID-001, UC-VID-002, UC-VID-003, REQ-VID-LIB-001, REQ-VID-PLAY-001],

    [Utilizador Premium], 
    [Revisto], 
    [Pretende limites superiores de armazenamento/duração, reprodução simultânea em múltiplos dispositivos e capacidade de múltiplos recortes concorrentes.], 
    [Alta], 
    [UC-VID-001, UC-VID-002, UC-VID-003, REQ-VID-LIB-015, REQ-VID-PLAY-039],

    [Proprietário do Sistema (PictuRAS SaaS)], 
    [Novo], 
    [Pretende controlar os custos computacionais de processamento (FFmpeg) e de largura de banda/armazenamento, aplicando limites estritos por perfil para incentivar subscrições.], 
    [Alta], 
    [UC-VID-001, UC-VID-002, UC-VID-003, REQ-VID-LIB-015, REQ-VID-PLAY-027],

    [Equipa de Desenvolvimento / Operações], 
    [Novo], 
    [Pretende garantir a estabilidade do sistema através de processamento assíncrono em fila, isolamento do motor externo (FFmpeg) e acesso seguro a vídeo via credenciais temporárias.], 
    [Média], 
    [REQ-VID-PLAY-005, REQ-VID-TRIM-057, REQ-VID-TRIM-061],
  ),
)

== Elicitação de requisitos

Os requisitos foram elicitados pela equipa a partir do enunciado, da análise da solução de base (código e documentos de requisitos e de arquitetura) e de sessões internas de discussão, em que cada caso de uso teve um responsável e foi revisto pelos restantes elementos. As decisões que afetam mais de um caso de uso — perfis abrangidos, formatos e codecs, limites por perfil, isenção de quota nas operações de consulta e gestão, retenção dos vídeos — foram fechadas em conjunto e aplicadas de forma igual nos três (Secção 3.4). Os valores numéricos dos limites do MVP (100 MB / 1 GB, 3 min / 30 min, 1080p / 4K, 500 MB / 10 GB, 1 / 3 _streams_ e 1 / 3 recortes ativos) são decisões da equipa (UC-VID-002/A4) e podem ser alterados por configuração sem mudar o código. Durante a implementação, as dúvidas e incoerências encontradas nos casos de uso foram decididas pela equipa e refletidas nas versões finais (Recorte v1.4, Biblioteca v1.3, Reprodução v2.3).
