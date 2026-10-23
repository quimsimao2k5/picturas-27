#import "../template.typ": *

= Implementação Assistida por Agentes de IA

== Ferramentas, modelos e configuração

#tab([Ferramentas de IA utilizadas],
  tabela(
    colunas: (3.6cm, 1fr),
    [Ferramenta / modelo], [Configuração e utilização],
    [ChatGPT (OpenAI)], [Interface de conversa _web_, sem configuração própria. Usado na primeira versão do caso de uso da biblioteca (UC-VID-002).],
    [Gemini (Google)], [Interface de conversa _web_, sem configuração própria. Usado na primeira versão do caso de uso da reprodução (UC-VID-003).],
    [Claude (Anthropic) — conversa], [Interface de conversa em #raw("claude.ai"), sem configuração própria. Usado no Exercício 1 do caso de uso do recorte (UC-VID-001).],
    [Claude Opus 5.5 (Anthropic) — agente], [Agente em #raw("claude.ai") com acesso a uma cópia do repositório e à pasta local do projeto, usado a partir de 18/10/2026 na revisão dos três casos de uso, na implementação, nos testes e neste relatório.

    - *Contexto partilhado:* um projeto #raw("claude.ai") ("picturas-27") com o documento #raw("Documentacao/CONTEXTO_E_DECISOES_FASE1.md"), que regista as decisões transversais fechadas pela equipa (estados, formatos, limites por perfil, retenção, quota). O agente não as podia reabrir.
    - *Regras de trabalho* dadas pela equipa na conversa: perguntar antes de tomar qualquer decisão; não alterar o código da solução de base sem autorização; editar a documentação apenas em #raw("Documentacao/"); não fazer _commits_ (feitos pela equipa).
    - *_Skills_:* não foram criadas nem configuradas _skills_ próprias, nem ficheiros de instruções no repositório (por exemplo, #raw("CLAUDE.md")).],
  ),
)

== Tarefas apoiadas e validação

As linhas relativas à especificação reproduzem a secção 3 de cada caso de uso em #raw("Documentacao/"). As restantes referem-se à implementação. Os _commits_ indicados são do repositório #raw("quimsimao2k5/picturas-27").

#tab([Tarefas apoiadas por agentes de IA e validação],
  tabela(
    colunas: (2.2cm, 1.8cm, 1fr, 1fr, 2.3cm),
    tamanho: 8.5pt,
    [Ferramenta], [Caso de uso], [Tarefa apoiada], [Validação realizada pela equipa], [Evidência],
    [Claude], [UC-VID-001], [Sugestão de exceções (Exercício 1).], [Revisão manual pela equipa e adaptação ao domínio do PictuRAS.], [#raw("0f3f37b"), #raw("97f027c")],
    [Claude], [UC-VID-001], [Sugestão de regras de negócio e assunções (Exercício 1).], [Revisão manual; a equipa selecionou e refinou as regras adequadas a esta ferramenta (RN3, RN5 e A6).], [#raw("97f027c")],
    [Gemini], [UC-VID-003], [Estruturação inicial do fluxo principal e dos fluxos alternativos; revisão crítica da versão v2.1.], [Revisão manual da sequência de passos, definição das metas MVP vs. produção e validação da rastreabilidade bidirecional.], [#raw("0f3f37b"), #raw("cf52e55")],
    [Gemini], [UC-VID-003], [Levantamento de exceções específicas de vídeo e definição de regras de negócio iniciais.], [Validação das exceções de codecs/rede e ajuste das regras de negócio quanto aos formatos, codecs (MP4, MOV) e limites por perfil (Registado vs. Premium).], [#raw("cf52e55")],
    [Claude], [UC-VID-003], [Revisão do caso de uso para o âmbito exclusivo da reprodução e derivação inicial da secção 4 (requisitos, impacto no sistema existente e matriz de rastreabilidade).], [Verificação cruzada dos 53 requisitos ativos face aos passos, exceções e regras de negócio; correção de critérios de aceitação ambíguos e eliminação de requisitos órfãos.], [#raw("8d62d34")],
    [ChatGPT], [UC-VID-002], [Estruturação inicial do caso de uso, levantamento preliminar de fluxos alternativos e exceções, e primeira versão da secção 4.], [Revisão manual dos fluxos alternativos, exceções e requisitos propostos.], [#raw("a284984")],
    [Claude Opus 5.5 (agente)], [UC-VID-001], [v1.3: assunção A9 sobre a gestão dos pedidos de recorte, alinhada com UC-VID-002 v1.3.], [Decisões tomadas pela equipa em 18/10/2026 em resposta a perguntas do agente.], [#raw("c9bfb5c")],
    [Claude Opus 5.5 (agente)], [UC-VID-001], [Revisão da v1.4 no início da implementação: requisitos duplicados (TRIM-001/048/049) passam a referências à biblioteca; Q1–Q4 e Q6 fechadas com referência a UC-VID-002; RN4 com limite Premium; nova exceção E7 e REQ-VID-TRIM-062/063 (espaço de armazenamento).], [Correções e decisões aprovadas pela equipa em 18/10/2026.], [#raw("c9bfb5c")],
    [Claude Opus 5.5 (agente)], [UC-VID-003], [Revisão da v2.3 no início da implementação: deteção de incoerências (reprodução a partir de projetos; conflito entre RN6 e REQ-VID-PLAY-048), retirada do REQ-VID-PLAY-014, novos REQ-VID-PLAY-055/056, nota de idioma e assunção A7.], [Decisões tomadas pela equipa em 18/10/2026 em resposta a perguntas do agente.], [#raw("c9bfb5c")],
    [Claude Opus 5.5 (agente)], [UC-VID-002], [Revisão para a v1.3 no início da implementação: incoerências entre os três casos de uso e o código; limite de resolução independente da orientação (RN10, E9, REQ-055); painel de carregamentos recentes e dispensa de avisos (RN14, FA7, REQ-061, REQ-062); assunção A8.], [As quatro decisões foram tomadas pela equipa em resposta a perguntas colocadas pelo agente (18/10/2026).], [#raw("c9bfb5c")],
    [Claude Opus 5.5 (agente)], [Todos], [Implementação: microsserviço #raw("videos"), rotas no _gateway_, configuração do nginx e do Docker Compose, e componentes do _frontend_ (biblioteca, leitor, recorte).], [Todo o código foi revisto pela equipa, para perceber o que foi feito e como; testes manuais da interface; testes automáticos (Capítulo 10).], [#raw("c9bfb5c"), #raw("a1dc1ad")],
    [Claude Opus 5.5 (agente)], [Todos], [Geração dos testes automáticos (#raw("videos/test/")) e do teste ponta a ponta (#raw("smoke.sh")).], [Revisão dos testes e execução pela equipa: 97 de 97 testes automáticos (22/10/2026) e 42 de 42 verificações ponta a ponta (23/10/2026).], [#raw("c9bfb5c"); Capítulo 10],
    [Claude Opus 5.5 (agente)], [Solução de base], [Deteção de problemas já existentes na solução de base (T-01 a T-05) e correção dos T-01, T-02 e T-03.], [A equipa reproduziu o erro no _browser_, escolheu os problemas a corrigir e autorizou a alteração; as correções ficaram documentadas no #raw("CONTEXTO_E_DECISOES_FASE1.md").], [#raw("8cc53ee"); Capítulo 11],
    [Claude Opus 5.5 (agente)], [Todos], [Revisão da primeira versão do relatório, novos diagramas (casos de uso, modelo do domínio, componentes, sequência) e composição deste relatório a partir dos documentos em #raw("Documentacao/").], [Revisão do relatório pela equipa; correção de afirmações erradas.], [Este relatório; #raw("ferramentas/")],
  ),
)

== Análise crítica

A utilização de agentes de IA foi muito benéfica para a produtividade e para a gestão do tempo da equipa. Foi usada num contexto de aprendizagem: o agente sugeria alternativas e esperava pela resposta da equipa antes de avançar. Algumas sugestões foram aceites e estão documentadas neste relatório (por exemplo, o limite de resolução independente da orientação e o painel de carregamentos recentes da biblioteca); outras foram recusadas pela equipa.

No código, a IA foi especialmente útil, porque nenhum elemento do grupo domina as linguagens e tecnologias usadas no PictuRAS. Todo o código gerado pela IA foi revisto pela equipa, com o objetivo de perceber o que foi feito e como. A IA ajudou também a encontrar problemas que já existiam na solução de base (T-01 a T-05, Capítulo 11), e a equipa decidiu corrigir os mais críticos (T-01, T-02 e T-03). Foi ainda usada para gerar os _scripts_ dos testes automáticos (Capítulo 10).
