#import "../template.typ": *

= Manutenção Corretiva da Solução de Base

#orientacao[
  Problemas encontrados na solução de base durante o estudo e a integração do vídeo (erros, incoerências com o
  documento de requisitos, dificuldades de execução). Indiquem se foram corrigidos nesta fase. Capítulo
  recomendado; removam-no se não houver nada a registar.
]

Durante a integração do vídeo foram encontrados cinco problemas na solução de base. Os três que afetavam fluxos funcionais (T-01, T-02 e T-03) foram corrigidos nesta fase, cada um com uma alteração mínima, documentada em #raw("Documentacao/CONTEXTO_E_DECISOES_FASE1.md") (secções 9 e 10); os restantes ficam registados para a Fase 2.

#tab([Tarefas de manutenção corretiva],
  tabela(
    colunas: (1.1cm, 1fr, 2.1cm, 1.6cm, 2.4cm, 2.2cm),
    tamanho: 8.5pt,
    [ID], [Descrição do problema], [Impacto], [Prioridade], [Rel. Req.], [Estado],
    [T-01], [O _login_ falhava sempre: #raw("getOneEmail") (#raw("users/controllers/user.js")) devolvia #raw("user.toJSON()"), que remove o #raw("password_hash"), e o #raw("bcrypt.compare") recebia #raw("undefined"). Um email inexistente também dava erro em vez de credenciais incorretas.], [Funcional], [Alta], [Autenticação (_login_)], [Corrigido em 21/10/2026 (_commit_ #raw("8cc53ee"))],
    [T-02], [O _gateway_ (#raw("apiGateway/routes/users.js")) transformava qualquer erro do _login_, incluindo password errada ou email inexistente (401), em 500: o utilizador via "Error logging in" em vez de credenciais incorretas. Correção: o _gateway_ passa o 401 do #raw("users"); os outros erros continuam a dar 500. O 201 de um _login_ bem-sucedido mantém-se, porque o _frontend_ (#raw("frontend/lib/session.ts")) só aceita o _login_ com 201.], [Funcional / Usabilidade], [Média], [Autenticação (_login_)], [Corrigido em 23/10/2026],
    [T-03], [Ao apagar uma conta, o #raw("users") chamava o #raw("projects") em #raw("https://projects:10002/projects/<id>"), mas este escuta na porta 9001 e as rotas não têm o prefixo #raw("/projects/"): os projetos do utilizador não eram apagados (o erro era registado e ignorado). Correção: endereço #raw("https://projects:9001/") em #raw("users/routes/users.js"), o mesmo que o _gateway_ já usa; a rota #raw("DELETE /:user") do #raw("projects") já existia.], [Funcional], [Média], [Eliminação de conta], [Corrigido em 23/10/2026],
    [T-04], [O nginx resolve o endereço dos serviços só no arranque: reiniciar apenas um serviço dá 502 até reiniciar o nginx.], [Operacional], [Baixa], [—], [Pendente (contorno: #raw("docker compose restart nginx"))],
    [T-05], [O _upload_ de imagens guarda o ficheiro inteiro em memória (#raw("multer.memoryStorage()") no _gateway_ e no #raw("projects")).], [Desempenho], [Baixa], [Carregar imagens], [Pendente (os vídeos usam outro caminho, DA-04)],
  ),
)
