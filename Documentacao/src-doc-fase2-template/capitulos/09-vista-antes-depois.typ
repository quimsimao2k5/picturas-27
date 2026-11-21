#import "../template.typ": *

#paisagem[
= Vista Arquitetural Antes e Depois

As duas vistas são diagramas de componentes em Mermaid (fontes em `Documentacao/exercicio7/vista_antes.mmd` e `vista_depois.mmd`), com a mesma notação e os mesmos elementos de contexto: entrada, `projects`, RabbitMQ, volume `image_data` e WebSocket. Mostram só o caminho do vídeo; as ferramentas de imagem, que não mudam, estão na vista global do capítulo 2.

== Antes

#figure(
  image("../images/vista_antes.png", width: 100%),
  caption: [Vista arquitetural antes das decisões DA-1 e DA-2],
)

== Depois

#figure(
  image("../images/vista_depois.png", width: 100%),
  caption: [Vista arquitetural depois das decisões DA-1 e DA-2],
)

== Legenda e notas

#tab([Legenda das vistas antes e depois],
  tabela(
    colunas: (5cm, 1fr),
    [Elemento (cor, forma ou estilo)], [Significado],
    [Caixa laranja (antes)], [Caminho do vídeo na base: `video_queue` e `video_tool`],
    [Caixa verde, com `«tática: TAT-nn»` (depois)], [Elemento novo ou alterado, com a tática que o introduziu (capítulo 7)],
    [Caixa cinzenta], [Elemento que não muda],
    [Caixa amarela], [RabbitMQ (_exchange_ `picturas`) e as suas filas],
    [Seta grossa], [Mensagens de trabalho de vídeo],
    [Linha tracejada], [Controlo (o `autoscaler` lê as filas e cria ou remove réplicas) e acesso ao volume],
    [`× 1–3`, `× 1–2`], [Número mínimo e máximo de réplicas de cada serviço],
  ),
)

*O que mudou entre as duas vistas:*

- a `video_queue` dá lugar a três filas, uma por tipo de trabalho (TAT-02);
- o `video_tool` dá lugar a três serviços, um por funcionalidade, com réplicas (TAT-06, TAT-01);
- o `projects` passa a dividir o _pipeline_ em etapas e a enviar a seguinte quando a anterior responde, como já fazia nas imagens (TAT-07);
- surge o `autoscaler`, que lê o tamanho das filas na API de gestão do RabbitMQ e cria ou remove réplicas pela API do Docker (TAT-01);
- o código comum dos três serviços (_worker_ RabbitMQ, `ffprobe`, erros, progresso) fica em `video_common` (TAT-08);
- o volume `image_data` passa a guardar também os ficheiros intermédios entre etapas, apagados no fim, em erro e no cancelamento.

O resto da arquitetura (entrada, autenticação, armazenamento, ferramentas de imagem, WebSocket) não muda.
]
