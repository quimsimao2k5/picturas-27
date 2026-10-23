#import "../template.typ": *

#set heading(numbering: "A.1.")
#counter(heading).update(0)

= Instruções de execução

#orientacao[Passos mínimos para lançar a solução entregue (`solucao-ext-mvp.zip`) (pré-requisitos, comandos, credenciais de teste, ficheiros de vídeo de exemplo) e para correr os testes automáticos.]

*Pré-requisitos:* Docker com Docker Compose e um _browser_ atual (Chrome, Firefox ou Safari).

+ Na pasta da solução, construir e arrancar todos os serviços: #raw("docker compose up -d --build"). A primeira construção demora alguns minutos.
+ Abrir #raw("https://localhost:8080") e aceitar o certificado autoassinado.
+ Criar uma conta em _Register_. Para testar os limites do Premium, fazer o _upgrade_ em _Account → Upgrade_.
+ Abrir _Video Library_ na barra lateral. Qualquer MP4 ou MOV com vídeo H.264 e áudio AAC (ou sem áudio) dentro dos limites do perfil serve de exemplo. Para gerar um vídeo de teste de 20 s em 720p: #raw("ffmpeg -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine -t 20 -c:v libx264 -pix_fmt yuv420p -c:a aac exemplo.mp4").
+ Se aparecer _502 Bad Gateway_ depois de reiniciar só alguns serviços: #raw("docker compose restart nginx") (T-04).
+ Para parar sem perder dados: #raw("docker compose stop"); para voltar a arrancar: #raw("docker compose up -d"). O comando #raw("docker compose down -v") apaga todos os dados.

*Testes:*
- Automáticos: #raw("docker compose exec videos npm test"). Para correr só alguns, filtrar pelo nome: #raw("docker compose exec videos node --test --test-name-pattern=\"TRIM-043|TRIM-058\" test/processingService.test.js").
- Ponta a ponta, com a aplicação levantada, dentro do contentor #raw("videos") (que já tem #raw("curl"), Node.js e FFmpeg): #raw("docker compose exec videos sh -c 'echo \"connect-to = localhost:8080:nginx:443\" > $HOME/.curlrc && bash test/e2e/smoke.sh'"). A primeira parte faz com que os endereços #raw("https://localhost:8080") cheguem ao nginx dentro da rede do Docker. Em alternativa, com #raw("curl"), #raw("node") e #raw("ffmpeg") instalados na máquina: #raw("./videos/test/e2e/smoke.sh").

= Glossário

#tabela(
  colunas: (4cm, 1fr),
  [Termo], [Definição],
  [Biblioteca de vídeos], [Conjunto dos vídeos de um utilizador Registado ou Premium, com o espaço ocupado e o limite do perfil.],
  [Carregamentos recentes], [Painel da biblioteca com os vídeos A carregar, A validar e Rejeitados; estes nunca aparecem na lista da biblioteca.],
  [Estado do vídeo], [A carregar, A validar, Disponível ou Rejeitado.],
  [Pedido de recorte], [Pedido de processamento que aplica a ferramenta de recorte a um vídeo; estados Em fila, A processar, Concluído, Falhou e Cancelado.],
  [Quota diária de operações], [Limite de 5 operações por dia do perfil Registado. Cada recorte consome uma; consultar, carregar, reproduzir e eliminar não consomem.],
  [Transmissão (_stream_)], [Reprodução ativa de um vídeo num leitor aberto; conta para o limite de 1 (Registado) ou 3 (Premium).],
  [URL assinado (_presigned URL_)], [Endereço temporário do armazenamento de objetos, válido no máximo 30 min, que dá acesso só de leitura a um ficheiro.],
  [Pedido parcial (_Range request_, 206)], [Pedido HTTP de apenas uma parte de um ficheiro; permite começar a reproduzir e saltar no vídeo sem o descarregar todo.],
  [SeaweedFS], [Armazenamento de objetos compatível com S3 usado pelo PictuRAS para imagens e vídeos.],
  [ffprobe / FFmpeg], [Ferramentas que inspecionam (ffprobe) e processam (FFmpeg) ficheiros de vídeo.],
  [H.264 / AAC], [Codecs de vídeo e de áudio aceites no MVP.],
  [MVP], [_Minimum Viable Product_: a versão mínima que valida as funcionalidades de vídeo nesta fase.],
)
