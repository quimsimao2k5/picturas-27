#import "../template.typ": *

== Realização e verificação dos requisitos

A tabela indica, por grupo de requisitos, os componentes que os realizam (Capítulo 8) e os testes que os verificam (Capítulo 10). Os testes automáticos foram executados a 22/10/2026 sobre o _commit_ #raw("fec44f6"): 97 testes, 97 passam. O teste ponta a ponta foi executado a 23/10/2026: 42 verificações, 42 passam. Cada teste tem no nome o identificador dos requisitos que verifica; o resultado completo está em #raw("evidencias/testes-automaticos-2026-10-22.txt").

#tab([Realização e verificação dos requisitos da extensão de vídeo],
  tabela(
    colunas: (3.1cm, 1fr, 2cm, 2.6cm, 3.2cm),
    tamanho: 8.5pt,
    [Requisitos], [Componente(s)], [Estado], [Teste(s)], [Resultado / observações],
    [REQ-VID-LIB-015, 017, 018, 035, 037, 038, 041, 050], [#raw("videos"): #raw("uploadRules"), #raw("VideoLibraryService"); _frontend_: #raw("upload-video-dialog")], [Implementado], [TST-LIB-01], [Passa],
    [REQ-VID-LIB-008, 022–029, 059], [#raw("VideoLibraryService"), #raw("mediaProbe"), #raw("videoValidator"), SeaweedFS], [Implementado], [TST-LIB-02], [Passa],
    [REQ-VID-LIB-014, 016, 019–021, 030, 036, 046, 047, 051–056, 061], [#raw("videoValidator"), #raw("VideoLibraryService"); _frontend_: #raw("recent-uploads")], [Implementado], [TST-LIB-03, TST-LIB-04], [Passa],
    [REQ-VID-LIB-012, 013, 039, 043, 044], [#raw("VideoLibraryService"), #raw("api_gateway") (_upload_ em _streaming_)], [Implementado], [TST-LIB-05], [Passa],
    [REQ-VID-LIB-057, 058, 062; UC-VID-002/RN13], [#raw("VideoLibraryService"), #raw("users") (apagar conta)], [Implementado], [TST-LIB-06, TST-LIB-07], [Passa],
    [REQ-VID-LIB-001–007, 009–011, 031, 034, 040, 042, 045, 060], [_Frontend_: página #raw("/dashboard/videos"), #raw("upload-video-dialog"), #raw("video-details-dialog")], [Implementado], [TST-LIB-08 (manual)], [Passa. REQ-VID-LIB-010 e 040 (tempos) sem medição formal (Secção 10.3)],
    [REQ-VID-LIB-032, 033, 048, 049; REQ-VID-PLAY-029–031, 054; REQ-VID-TRIM-059], [#raw("api_gateway") (#raw("auth.checkToken"), #raw("auditUnauthenticated")), serviço #raw("videos"), coleção #raw("security_events")], [Implementado], [TST-SEC-01], [Passa],
    [REQ-VID-PLAY-001–006, 024–028, 032, 037, 046, 047], [#raw("PlaybackService"), #raw("objectStorage"), nginx #raw("/s3"), SeaweedFS], [Implementado], [TST-PLAY-01], [Passa],
    [REQ-VID-PLAY-039, 048, 055, 056], [#raw("PlaybackService"), coleção #raw("playback_sessions"); _frontend_: #raw("video-player")], [Implementado], [TST-PLAY-02], [Passa],
    [REQ-VID-PLAY-021–023, 033, 053], [#raw("PlaybackService"); _frontend_: #raw("video-player")], [Implementado], [TST-PLAY-03, TST-PLAY-04], [Passa],
    [REQ-VID-PLAY-007–013, 015–020, 034–036, 038, 040, 042–045, 049–052], [_Frontend_: #raw("video-player"), #raw("video-player-dialog")], [Implementado], [TST-PLAY-05 (manual)], [Passa em Chrome, Firefox e Safari. Tempos (034–036, 044, 045) sem medição formal],
    [REQ-VID-PLAY-014, 041], [—], [Retirados], [—], [—],
    [REQ-VID-TRIM-012–016, 020–022, 051, 052, 054, 055], [#raw("ProcessingService"), #raw("trimTool"), #raw("ffmpegAdapter"), SeaweedFS], [Implementado], [TST-TRIM-01], [Passa],
    [REQ-VID-TRIM-026, 027, 036–041, 050], [#raw("trimTool"), #raw("ProcessingService"); _frontend_: #raw("trim-video-dialog")], [Implementado], [TST-TRIM-02], [Passa],
    [REQ-VID-TRIM-002, 013, 042, 043, 062, 063], [#raw("ProcessingService"), #raw("quotaClient"), #raw("users")], [Implementado], [TST-TRIM-03, TST-TRIM-04], [Passa],
    [REQ-VID-TRIM-028–034, 044–047, 056, 058], [#raw("ProcessingService") (fila e _worker_), #raw("ffmpegAdapter")], [Implementado], [TST-TRIM-05 a TST-TRIM-08], [Passa. Tempo de processamento (058) sem medição formal],
    [REQ-VID-TRIM-007–010, 023, 025, 035], [#raw("trimTool"), #raw("ProcessingService"); _frontend_: #raw("trim-notifier"), #raw("download-video-button")], [Implementado], [TST-TRIM-09, TST-TRIM-10], [Passa],
    [REQ-VID-TRIM-003–006, 011, 017–019, 024, 053, 057], [_Frontend_: #raw("trim-video-dialog"), #raw("processing-requests")], [Implementado], [TST-TRIM-11 (manual)], [Passa. Tempo de resposta (057) sem medição formal],
    [REQ-VID-TRIM-060, 061], [Contrato de ferramenta (#raw("trimTool")) e adaptador (#raw("ffmpegAdapter"))], [Implementado], [Inspeção de código], [Cumprido: só o adaptador lança o FFmpeg],
    [REQ-VID-TRIM-001, 048, 049], [—], [Referências], [ver REQ-VID-LIB-002, 057, 058], [—],
  ),
)
