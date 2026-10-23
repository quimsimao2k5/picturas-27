#import "../template.typ": *

= Testes e Validação do MVP

#orientacao[
  Os critérios de aceitação da ERS (_Dado… Quando… Então…_) são a base dos testes. Cada requisito implementado
  deve ter pelo menos um teste (automático ou manual) com resultado registado. Para os requisitos não
  funcionais, registem o valor medido face ao *Alvo*, sempre que aplicável.
]

== Estratégia e ambiente de testes

A validação combina três tipos de teste:

- *Testes automáticos* (#raw("node --test"), 97 testes em #raw("videos/test/*.test.js")) sobre os _services_ do serviço #raw("videos"). Usam repositórios em memória no lugar do MongoDB e do SeaweedFS, mas o FFmpeg e o ffprobe são reais e os vídeos de teste são gerados na hora: MP4 H.264/AAC 320×240, MOV sem áudio, vídeo MPEG-4 Part 2, áudio MP3, conteúdo Matroska com extensão #raw(".mp4"), 1080×1920 vertical, 3840×2160, ficheiros truncados (com o índice no início e no fim) e _bytes_ que não são vídeo. Nos testes de concorrência e cancelamento usa-se um FFmpeg simulado que nunca termina, para que os pedidos fiquem no estado em que estão. O nome de cada teste começa pelos requisitos que verifica.
- *Teste ponta a ponta* (#raw("videos/test/e2e/smoke.sh"), 42 verificações) com #raw("curl") sobre a aplicação completa levantada com #raw("docker compose"): nginx → _gateway_ → serviços → SeaweedFS. Cobre os três casos de uso, o isolamento entre utilizadores, os pedidos parciais (206), a assinatura adulterada, o limite de transmissões e a eliminação de conta.
- *Testes manuais* da interface em Chrome, Firefox e Safari, para os requisitos de apresentação e interação (leitor, ecrã de recorte, painéis).

Execução registada: testes automáticos a 22/10/2026, _commit_ #raw("fec44f6"), Node.js 22 e FFmpeg 6.1 — 97 testes, 97 passam, 0 ignorados (#raw("evidencias/testes-automaticos-2026-10-22.txt")). Para os correr com a aplicação levantada: #raw("docker compose exec videos npm test").

Teste ponta a ponta executado a 23/10/2026 dentro do contentor #raw("videos") (que já tem #raw("curl"), Node.js e FFmpeg), com a aplicação completa levantada: 42 verificações, 42 passam, 0 falham. O #raw("smoke.sh") tem uma 43.ª verificação (não ficam vídeos na base de dados depois de apagar a conta), que só corre quando o comando #raw("docker") está disponível; dentro do contentor não está, por isso não foi executada. Esse comportamento (RN13) é coberto pelo TST-LIB-07.

== Testes realizados

#tab([Testes e resultados],
  tabela(
    colunas: (2cm, 1.9cm, 1fr, 3.2cm, 1.6cm),
    tamanho: 8.5pt,
    [ID], [Tipo], [Descrição (Dado… Quando… Então…)], [Requisito(s)], [Resultado],
    [TST-LIB-01], [Automático], [Dado um ficheiro .avi ou .mkv, com tipo MIME que não é de vídeo, ou maior do que o limite do perfil ou do espaço livre, quando se pede o _upload_, então é recusado antes de criar registo e de enviar _bytes_.], [REQ-VID-LIB-015, 017, 018, 035, 037, 038, 041, 050], [Passa],
    [TST-LIB-02], [Automático], [Dado um MP4 H.264/AAC válido, quando o _upload_ termina, então o vídeo fica Disponível, com duração, resolução e tamanho registados, e conta no espaço ocupado.], [REQ-VID-LIB-008, 022–029, 059], [Passa],
    [TST-LIB-03], [Automático], [Dado um vídeo MPEG-4, com áudio MP3, truncado, que não é vídeo, ou acima da duração ou da resolução do perfil, quando é validado, então fica Rejeitado com o motivo, só aparece no painel de carregamentos recentes e não ocupa espaço.], [REQ-VID-LIB-014, 016, 019–021, 030, 036, 046, 047, 051–054, 056, 061], [Passa],
    [TST-LIB-04], [Automático], [Dado um vídeo 1080×1920 vertical (ou 1920×1080 com rotação de 90°), quando é validado para um Registado, então é aceite; um 3840×2160 é recusado ao Registado e aceite ao Premium.], [REQ-VID-LIB-055], [Passa],
    [TST-LIB-05], [Automático], [Dado um _upload_ em curso, quando é cancelado, a ligação cai, chegam menos ou mais _bytes_ do que o declarado, o armazenamento falha ou a sessão expira, então não fica registo Disponível nem ficheiro temporário.], [REQ-VID-LIB-012, 013, 039, 043, 044], [Passa],
    [TST-LIB-06], [Automático], [Dado um vídeo origem de um recorte em fila ou a processar, quando se tenta eliminar, então é recusado; sem recorte ativo, é eliminado e o espaço libertado. Um rejeitado pode ser dispensado do painel.], [REQ-VID-LIB-057, 058, 062], [Passa],
    [TST-LIB-07], [Automático], [Dado um utilizador com vídeos, um _upload_ a decorrer e recortes, quando a conta é apagada, então todos os seus vídeos, ficheiros, pedidos e sessões são removidos.], [UC-VID-002/RN13], [Passa],
    [TST-LIB-08], [Manual], [Dado um Registado na biblioteca, quando escolhe um ficheiro, o substitui, cancela antes de enviar, acompanha o progresso, fecha a janela durante a validação e consulta os detalhes, então a interface mostra nome, formato, tamanho, progresso, resultado e metadados.], [REQ-VID-LIB-001–007, 009, 011, 031, 042, 060], [Passa],
    [TST-SEC-01], [Automático], [Dado um utilizador B e um Anónimo, quando tentam ler, reproduzir, recortar, cancelar ou eliminar vídeos e pedidos de um utilizador A, então recebem 401 ou 403 e a tentativa fica registada.], [REQ-VID-LIB-032, 033, 048, 049; REQ-VID-PLAY-029–031, 054; REQ-VID-TRIM-059], [Passa],
    [TST-PLAY-01], [Automático], [Dado o dono de um vídeo Disponível, quando inicia a reprodução, então recebe um URL assinado válido no máximo 30 min, sem parâmetros extra, e a reprodução não altera o vídeo nem a quota.], [REQ-VID-PLAY-001, 003, 005, 024, 028, 032, 037], [Passa],
    [TST-PLAY-02], [Automático], [Dado um Registado com um leitor aberto, quando abre outro, então é recusado; ao fechar o leitor ou ao fim de 45 s sem sinal a vaga é libertada; no mesmo navegador a nova reprodução substitui a anterior de imediato. O Premium tem até 3.], [REQ-VID-PLAY-039, 048, 055, 056], [Passa],
    [TST-PLAY-03], [Automático], [Dado um URL perto de expirar, quando o leitor renova, então recebe outro; se o vídeo foi apagado entretanto, a renovação informa que já não existe; uma sessão terminada responde 410.], [REQ-VID-PLAY-021, 022, 053], [Passa],
    [TST-PLAY-04], [Automático], [Dado um vídeo apagado, não Disponível, sem ficheiro ou com tamanho diferente do registado, quando se pede a reprodução, então é recusada com o motivo.], [REQ-VID-PLAY-004, 022, 023, 033], [Passa],
    [TST-PLAY-05], [Manual], [Dado um vídeo Disponível, quando se usa play/pausa, _seek_ para fora do _buffer_, volume, velocidade de 0,5× a 2×, ecrã inteiro, repetição e se fecha o leitor, então cada ação é aplicada e o leitor liberta a transmissão (Chrome, Firefox e Safari).], [REQ-VID-PLAY-006–013, 015–020, 042, 043], [Passa],
    [TST-TRIM-01], [Automático], [Dado um vídeo Disponível, quando se pede um recorte válido, então o pedido fica Em fila, é processado e guardado como vídeo novo, com a mesma resolução e fps, duração ± 1 s, áudio AAC, e o original fica intacto.], [REQ-VID-TRIM-012–016, 020–022, 051, 052, 054, 055], [Passa],
    [TST-TRIM-02], [Automático], [Dado um intervalo com início depois do fim, fora da duração ou menor que 1 s, ou o vídeo inteiro sem confirmação, quando se submete, então é recusado com o motivo; um vídeo que não é H.264 não abre o ecrã de recorte.], [REQ-VID-TRIM-026, 027, 036–041], [Passa],
    [TST-TRIM-03], [Automático], [Dado um Registado sem operações ou com 1 recorte ativo, ou um Premium com 3, quando pede outro, então é recusado sem gastar quota.], [REQ-VID-TRIM-042, 043], [Passa],
    [TST-TRIM-04], [Automático], [Dado que o resultado estimado não cabe na biblioteca, quando se submete, então é recusado sem gastar quota; se o tamanho real não couber no fim, o pedido falha, a operação é devolvida e nada é guardado.], [REQ-VID-TRIM-062, 063], [Passa],
    [TST-TRIM-05], [Automático], [Dado um FFmpeg que falha, quando o pedido é processado, então há uma repetição automática; à segunda falha o pedido fica Falhou, sem ficheiros parciais e com a operação devolvida.], [REQ-VID-TRIM-044–046, 056], [Passa],
    [TST-TRIM-06], [Automático], [Dado um pedido em fila ou a processar, quando o utilizador cancela, então o FFmpeg é terminado, a operação devolvida e o pedido fica Cancelado; um pedido terminado não pode ser cancelado; a origem não pode ser apagada com o pedido ativo.], [REQ-VID-TRIM-028–033, 048, 049], [Passa],
    [TST-TRIM-07], [Automático], [Dados 6 pedidos de dois utilizadores Premium, quando entram na fila, então 5 processam e o 6.º espera; quando uma vaga se liberta, o 6.º arranca.], [REQ-VID-TRIM-058; UC-VID-001/A6], [Passa],
    [TST-TRIM-08], [Automático], [Dado um reinício do serviço com pedidos A processar, quando o serviço arranca, então voltam à fila e terminam.], [REQ-VID-TRIM-034], [Passa],
    [TST-TRIM-09], [Automático], [Dado um recorte sem nome, quando termina, então o resultado chama-se #raw("{original}_recorte_{início}-{fim}"); com nome ou formato MOV escolhidos, são respeitados.], [REQ-VID-TRIM-007–010], [Passa],
    [TST-TRIM-10], [Automático], [Dado um pedido terminado, quando o utilizador é notificado, então o pedido fica marcado como visto e não volta a ser notificado.], [REQ-VID-TRIM-023, 035], [Passa],
    [TST-TRIM-11], [Manual], [Dado um vídeo Disponível, quando o utilizador abre o ecrã de recorte, define o intervalo, vê o resumo, submete, acompanha o progresso, recebe a notificação, reproduz e descarrega o resultado, então a interface responde a cada passo.], [REQ-VID-TRIM-003–006, 011, 017–019, 024, 025, 047], [Passa],
    [TST-E2E-01], [Ponta a ponta], [Dada a aplicação levantada, quando se corre #raw("smoke.sh"), então as 42 verificações dos três casos de uso e da eliminação de conta passam.], [Ver nomes das verificações no #raw("smoke.sh")], [Passa (42/42)],
  ),
)

== Limitações e defeitos conhecidos

- *Metas de tempo não medidas formalmente:* progresso do _upload_ e tempo de validação (REQ-VID-LIB-010, 040), início da reprodução, _seek_, deteção de falha e capacidade (REQ-VID-PLAY-034–036, 044, 045), resposta à submissão e tempo de processamento do recorte (REQ-VID-TRIM-057, 058). O comportamento foi observado nos testes manuais, mas não há valores medidos face ao alvo.
- *Prioridade Premium na fila de recortes:* não implementada; a fila é por ordem de chegada (UC-VID-001, Q1).
- *Escala do processamento:* a fila é interna a um só contentor (DA-02).
- *Defeitos da solução de base* encontrados durante a integração: Capítulo 11.
