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
    [RN1, RN5, REQ-VID-LIB-048, REQ-VID-LIB-049, REQ-VID-PLAY-030, REQ-VID-PLAY-031],

    [Registado], 
    [Gratuito, até 5 operações/dia], 
    [Acesso à biblioteca e reprodução (isentas de quota diária). Acesso ao recorte temporal (consome 1 operação da quota diária de 5). Limites: 100 MB/vídeo, 3 min de duração, resolução até 1080p, 500 MB de armazenamento total e máximo de 1 _stream_ simultâneo.], 
    [RN1, RN10, RN12, REQ-VID-LIB-001, REQ-VID-LIB-015, REQ-VID-LIB-016, REQ-VID-LIB-017, REQ-VID-LIB-034, REQ-VID-PLAY-039, REQ-VID-TRIM-002],

    [Premium], 
    [Pago, uso ilimitado], 
    [Uso ilimitado de operações de processamento e prioridade de execução. Limites superiores para vídeo: 1 GB/vídeo, 30 min de duração, resolução até 4K, 10 GB de armazenamento total e até 3 _streams_ e 3 recortes em simultâneo.], 
    [RN1, RN10, REQ-VID-LIB-001, REQ-VID-LIB-015, REQ-VID-LIB-016, REQ-VID-LIB-017, REQ-VID-PLAY-039, REQ-VID-TRIM-004],
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

A identificação das funcionalidades, regras de negócio e restrições relativas ao suporte de vídeo decorreu de um processo iterativo de elicitação conduzido pela equipa. A análise exploratória do sistema _brownfield_ e do modelo SaaS existente fundamentou a exclusão do perfil Anónimo e a separação entre operações de consulta/gestão e operações transformadoras que consomem quota diária (RN1, RN12, RN13). Através de sessões internas de _brainstorming_ e _benchmarking_ de plataformas multimédia (e.g., YouTube, Canva), foram estabelecidas as assunções de arquitetura e fixados os valores-alvo do MVP (A4, A5) — designadamente os limites por perfil de tamanho (100 MB / 1 GB), duração (3 min / 30 min), resolução (1080p / 4K) e quota de biblioteca (500 MB / 10 GB), expressos nas regras de negócio RN10 e RN6 e validados nos requisitos funcionais REQ-VID-LIB-015 a REQ-VID-LIB-017, REQ-VID-LIB-055, REQ-VID-PLAY-039 e REQ-VID-TRIM-002.