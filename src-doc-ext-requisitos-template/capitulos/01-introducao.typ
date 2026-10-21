#import "../template.typ": *

= Introdução

#orientacao[
  Uma a duas páginas, no máximo. Devem responder a:
  - *Propósito do incremento*: que suporte a vídeo foi acrescentado ao PictuRAS e porquê (lógica de MVP).
  - *_Baseline_*: em que versão do sistema se basearam — documento de requisitos, documento de solução
    arquitetural e repositório base (indicar _commit_ de partida).
    Este relatório *estende* esses documentos; não os reescreve.
  - *Resumo do que foi feito*: funcionalidades especificadas e implementadas (remeter para a Tabela do Capítulo 3).
  - *Organização do documento*: Parte I (transversal), Parte II (especificação: casos de uso, ERS, impacto,
    rastreabilidade), Parte III (arquitetura, IA, testes).
]

== Propósito do incremento
O PictuRAS é uma plataforma _web_ desenvolvida segundo o modelo _Software as a Service_ (SaaS) para o processamento de imagem em ambientes _cloud_. Originalmente limitado à manipulação de imagens estáticas, o sistema exigia uma evolução capaz de responder ao fluxo crescente e às necessidades dos utilizadores em lidar com conteúdos multimédia em movimento.

O presente incremento tem como principal propósito estender o PictuRAS através do suporte nativo ao processamento de vídeo digital. Adotando uma estratégia de _Minimum Viable Product_ (MVP), o foco desta Fase 1 incide na validação funcional e na viabilidade das operações centrais sobre ficheiros de vídeo de maior dimensão — nomeadamente o carregamento, a gestão de bibliotecas pessoais de vídeo, a reprodução progressiva por _streaming_ e a aplicação de ferramentas de edição como o recorte temporal (_trimming_). Esta abordagem MVP prioriza a verificação das regras de negócio, a gestão de quotas por perfil de utilizador e o processamento assíncrono, diferindo para fases subsequentes a otimização de atributos de qualidade não funcionais avançados como a transcodificação _on-the-fly_ ou o débito de alto desempenho em produção.

== _Baseline_ e repositório
#tabela(
  colunas: (5cm, 1fr),
  [Artefacto], [Versão / referência],
  [Documento de requisitos de base], [doc-ext-requisitos.pdf],
  [Documento de solução arquitetural de base], [doc-sol-arquitetural.pdf],
  [Repositório de partida], [#preencher[URL e _commit_ de partida]],
  [Solução entregue], [solucao-ext-mvp.zip #preencher[(e, se aplicável, URL e _commit_ da entrega)]],
)

== Organização do documento
O presente documento encontra-se estruturado em três partes principais, devidamente alinhadas com as diretrizes do projeto:

- *Parte I — Aspetos Transversais*: Apresenta uma visão abrangente sobre o enquadramento do projeto e a atualização do modelo do domínio e do mapa de _stakeholders_, contextualizando o impacto do suporte a vídeo no ecossistema PictuRAS.
- *Parte II — Especificação de Requisitos*: Detalha a especificação das novas funcionalidades, incluindo os diagramas e especificações detalhadas de Casos de Uso (como a adição/reprodução de vídeo na biblioteca e o recorte temporal). Apresenta a Especificação de Requisitos do Sistema (ERS), a análise de impacto no sistema existente e a matriz de rastreabilidade entre casos de uso e requisitos.
- *Parte III — Arquitetura, IA e Testes*: Expõe a adequação arquitetural necessária para suportar o processamento de vídeo, o registo da utilização e validação de ferramentas de Inteligência Artificial ao longo do ciclo de desenvolvimento, e o plano/resultados dos testes funcionais executados.
