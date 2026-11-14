# Resumo das medições — baseline

### S1 — Bloqueio pela legendagem

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| curto_sozinho_total_s | 5 | 3.88 | 3.54 | 4.44 | 0.65 |
| curto_com_legendagem_espera_s | 5 | 141.01 | 123.29 | 165.0 | 35.26 |
| curto_com_legendagem_total_s | 5 | 144.69 | 126.55 | 168.68 | 36.05 |
| atraso_causado_pela_legendagem_s | 5 | 140.7 | 123.01 | 165.1 | 35.75 |
| legendagem_total_s | 5 | 141.77 | 123.99 | 165.79 | 35.43 |

### S2 — Carga concorrente

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| N=1 · makespan_s | 5 | 3.77 | 3.76 | 3.94 | 0.12 |
| N=1 · debito_videos_min | 5 | 15.91 | 15.22 | 15.97 | 0.51 |
| N=1 · max_videos_em_processamento_simultaneo | 5 | 1 | 1 | 1 | 0.0 |
| N=1 · tempo_medio_conclusao_s | 5 | 3.77 | 3.76 | 3.94 | 0.12 |
| N=1 · tempo_max_conclusao_s | 5 | 3.77 | 3.76 | 3.94 | 0.12 |
| N=1 · espera_media_s | 5 | 0.4 | 0.36 | 0.43 | 0.06 |
| N=1 · trabalhos_com_erro | | 0 | | | |
| N=2 · makespan_s | 5 | 7.17 | 6.54 | 14.28 | 4.54 |
| N=2 · debito_videos_min | 5 | 16.73 | 8.41 | 18.36 | 6.45 |
| N=2 · max_videos_em_processamento_simultaneo | 5 | 1 | 1 | 1 | 0.0 |
| N=2 · tempo_medio_conclusao_s | 5 | 5.46 | 4.97 | 9.53 | 2.78 |
| N=2 · tempo_max_conclusao_s | 5 | 7.17 | 6.54 | 14.26 | 4.52 |
| N=2 · espera_media_s | 5 | 2.14 | 1.91 | 2.78 | 0.63 |
| N=2 · trabalhos_com_erro | | 0 | | | |
| N=4 · makespan_s | 5 | 13.68 | 13.58 | 14.18 | 0.34 |
| N=4 · debito_videos_min | 5 | 17.55 | 16.92 | 17.67 | 0.43 |
| N=4 · max_videos_em_processamento_simultaneo | 5 | 1 | 1 | 1 | 0.0 |
| N=4 · tempo_medio_conclusao_s | 5 | 8.65 | 8.6 | 8.98 | 0.2 |
| N=4 · tempo_max_conclusao_s | 5 | 13.67 | 13.57 | 14.17 | 0.35 |
| N=4 · espera_media_s | 5 | 5.4 | 5.36 | 5.6 | 0.15 |
| N=4 · trabalhos_com_erro | | 0 | | | |
| N=8 · makespan_s | 5 | 28.56 | 27.33 | 30.33 | 1.81 |
| N=8 · debito_videos_min | 5 | 16.8 | 15.83 | 17.56 | 1.05 |
| N=8 · max_videos_em_processamento_simultaneo | 5 | 1 | 1 | 1 | 0.0 |
| N=8 · tempo_medio_conclusao_s | 5 | 16.3 | 15.55 | 17.2 | 1.0 |
| N=8 · tempo_max_conclusao_s | 5 | 28.48 | 27.21 | 30.2 | 1.77 |
| N=8 · espera_media_s | 5 | 12.9 | 12.28 | 13.58 | 0.82 |
| N=8 · trabalhos_com_erro | | 0 | | | |

### S3 — Adaptação à carga

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| replicas_video_max | 5 | 1 | 1 | 1 | 0.0 |
| variacao_replicas_video | 5 | 0 | 0 | 0 | 0.0 |
| max_videos_a_espera | 5 | 9 | 9 | 9 | 0.0 |
| max_videos_em_processamento_simultaneo | 5 | 1 | 1 | 1 | 0.0 |
| cpu_video_medio_na_rajada_pct | 5 | 318.96 | 312.3 | 320.75 | 6.27 |
| duracao_rajada_s | 5 | 158.84 | 143.58 | 166.78 | 18.62 |

### S4 — Tempo de edição / duração

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| sample_10s_720p.mp4 · total_s | 5 | 3.91 | 3.62 | 4.02 | 0.31 |
| sample_10s_720p.mp4 · razao_tempo_duracao | 5 | 0.39 | 0.36 | 0.4 | 0.03 |
| 02_curto_720p_30s.mp4 · total_s | 5 | 11.52 | 10.35 | 11.77 | 1.13 |
| 02_curto_720p_30s.mp4 · razao_tempo_duracao | 5 | 0.38 | 0.34 | 0.39 | 0.04 |
| 01_demo_1080p_150s.mp4 · total_s | 5 | 134.73 | 116.62 | 150.27 | 30.41 |
| 01_demo_1080p_150s.mp4 · razao_tempo_duracao | 5 | 0.9 | 0.78 | 1.0 | 0.2 |

### M3 — Isolamento de falhas

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| referencia_s2_n4_tempo_max_s | | 13.67 | | | |
| curtos_afetados_pct | 5 | 100.0 | 100.0 | 100.0 | 0.0 |
| curtos_falhados_por_rep | 5 | 0 | 0 | 0 | 0.0 |
| curtos_total_s | 20 | 132.81 | 122.72 | 142.93 | 7.24 |
| legendagens_concluidas | | 5/5 | | | |

### M1 — Impacto de uma mudança

| Mudança | Ficheiros | Componentes | Unidades a reconstruir | Unidades a reiniciar | Funcionalidades de vídeo interrompidas | (responsabilidades técnicas) |
|---|---|---|---|---|---|---|
| C1 | 1 | docker-compose.yaml | — | video_tool | 3 (edicao, extracao_fotogramas, legendagem) | 6 |
| C2 | 1 | Tools/video | video_tool | video_tool | 3 (edicao, extracao_fotogramas, legendagem) | 6 |
| C3 | 6 | Tools/video, frontend, projects | frontend, projects, video_tool | frontend, projects, video_tool | 3 (edicao, extracao_fotogramas, legendagem) | 6 |

### M2 — Acoplamento estático

- Unidades implantáveis com responsabilidades de vídeo: 1
- Máximo de funcionalidades de vídeo numa unidade (edição, legendagem, extração): 3 — {'video_tool': ['edicao', 'extracao_fotogramas', 'legendagem']}
- Máximo de responsabilidades técnicas numa unidade (detalhe): 6
- Python de vídeo: 722 SLOC, CC média 3.87, CC máx. 22, funções com CC > 10: 6
- Efeitos duplicados entre imagem e vídeo: 8
