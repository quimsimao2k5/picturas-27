# Resumo das medições — final

### S1 — Bloqueio pela legendagem

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| curto_sozinho_total_s | 5 | 3.63 | 3.53 | 3.9 | 0.34 |
| curto_com_legendagem_espera_s | 5 | 6.51 | 4.46 | 9.57 | 2.86 |
| curto_com_legendagem_total_s | 5 | 17.06 | 12.32 | 18.82 | 3.92 |
| atraso_causado_pela_legendagem_s | 5 | 13.53 | 8.47 | 14.91 | 3.85 |
| legendagem_total_s | 5 | 135.63 | 120.21 | 146.44 | 17.71 |

### S2 — Carga concorrente

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| N=1 · makespan_s | 5 | 3.84 | 3.75 | 4.11 | 0.29 |
| N=1 · debito_videos_min | 5 | 15.63 | 14.6 | 15.99 | 1.15 |
| N=1 · max_videos_em_processamento_simultaneo | 5 | 1 | 1 | 1 | 0.0 |
| N=1 · tempo_medio_conclusao_s | 5 | 3.84 | 3.75 | 4.11 | 0.29 |
| N=1 · tempo_max_conclusao_s | 5 | 3.84 | 3.75 | 4.11 | 0.29 |
| N=1 · espera_media_s | 5 | 0.38 | 0.36 | 0.45 | 0.06 |
| N=1 · trabalhos_com_erro | | 0 | | | |
| N=2 · makespan_s | 5 | 6.03 | 5.6 | 8.34 | 2.33 |
| N=2 · debito_videos_min | 5 | 19.89 | 14.39 | 21.41 | 5.97 |
| N=2 · max_videos_em_processamento_simultaneo | 5 | 2 | 1 | 2 | 1.0 |
| N=2 · tempo_medio_conclusao_s | 5 | 5.87 | 5.45 | 6.07 | 0.38 |
| N=2 · tempo_max_conclusao_s | 5 | 6.03 | 5.6 | 8.34 | 2.32 |
| N=2 · espera_media_s | 5 | 0.53 | 0.48 | 2.28 | 1.73 |
| N=2 · trabalhos_com_erro | | 0 | | | |
| N=4 · makespan_s | 5 | 14.09 | 11.84 | 15.25 | 2.48 |
| N=4 · debito_videos_min | 5 | 17.04 | 15.73 | 20.28 | 3.24 |
| N=4 · max_videos_em_processamento_simultaneo | 5 | 3 | 2 | 3 | 0.5 |
| N=4 · tempo_medio_conclusao_s | 5 | 10.97 | 8.86 | 12.05 | 2.37 |
| N=4 · tempo_max_conclusao_s | 5 | 14.08 | 11.77 | 15.21 | 2.48 |
| N=4 · espera_media_s | 5 | 3.17 | 2.79 | 3.33 | 0.48 |
| N=4 · trabalhos_com_erro | | 0 | | | |
| N=8 · makespan_s | 5 | 25.53 | 22.32 | 30.23 | 5.69 |
| N=8 · debito_videos_min | 5 | 18.8 | 15.88 | 21.51 | 3.98 |
| N=8 · max_videos_em_processamento_simultaneo | 5 | 3 | 3 | 3 | 0.0 |
| N=8 · tempo_medio_conclusao_s | 5 | 16.96 | 14.5 | 19.89 | 4.06 |
| N=8 · tempo_max_conclusao_s | 5 | 25.45 | 22.03 | 30.11 | 5.8 |
| N=8 · espera_media_s | 5 | 8.86 | 7.51 | 10.67 | 2.22 |
| N=8 · trabalhos_com_erro | | 0 | | | |

### S3 — Adaptação à carga

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| replicas_video_max | 5 | 5 | 5 | 5 | 0.0 |
| variacao_replicas_video | 5 | 2 | 2 | 2 | 0.0 |
| max_videos_a_espera | 5 | 9 | 9 | 9 | 0.0 |
| max_videos_em_processamento_simultaneo | 5 | 3 | 3 | 3 | 0.0 |
| cpu_video_medio_na_rajada_pct | 5 | 356.44 | 348.87 | 365.57 | 9.33 |
| duracao_rajada_s | 5 | 172.05 | 163.67 | 194.35 | 16.59 |

### S4 — Tempo de edição / duração

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| sample_10s_720p.mp4 · total_s | 5 | 3.91 | 3.7 | 4.79 | 0.67 |
| sample_10s_720p.mp4 · razao_tempo_duracao | 5 | 0.39 | 0.37 | 0.48 | 0.07 |
| 02_curto_720p_30s.mp4 · total_s | 5 | 10.54 | 10.21 | 13.53 | 1.84 |
| 02_curto_720p_30s.mp4 · razao_tempo_duracao | 5 | 0.35 | 0.34 | 0.45 | 0.06 |
| 01_demo_1080p_150s.mp4 · total_s | 5 | 137.93 | 116.19 | 167.44 | 31.54 |
| 01_demo_1080p_150s.mp4 · razao_tempo_duracao | 5 | 0.92 | 0.77 | 1.12 | 0.21 |

### M3 — Isolamento de falhas

| Métrica | n | Mediana | Mín. | Máx. | IQR |
|---|---|---|---|---|---|
| referencia_s2_n4_tempo_max_s | | 14.08 | | | |
| curtos_afetados_pct | 5 | 0.0 | 0.0 | 75.0 | 75.0 |
| curtos_falhados_por_rep | 5 | 0 | 0 | 0 | 0.0 |
| curtos_total_s | 20 | 18.81 | 6.36 | 29.07 | 18.13 |
| legendagens_concluidas | | 5/5 | | | |

### M1 — Impacto de uma mudança

| Mudança | Ficheiros | Componentes | Unidades a reconstruir | Unidades a reiniciar | Funcionalidades de vídeo interrompidas | (responsabilidades técnicas) |
|---|---|---|---|---|---|---|
| C1 | 1 | docker-compose.yaml | — | video_subtitles | 1 (legendagem) | 3 |
| C2 | 1 | Tools/video_subtitles | video_subtitles | video_subtitles | 1 (legendagem) | 3 |
| C3 | 6 | Tools/video_effects, frontend, projects | frontend, projects, video_effects | frontend, projects, video_effects | 1 (edicao) | 4 |

### M2 — Acoplamento estático

- Unidades implantáveis com responsabilidades de vídeo: 3
- Máximo de funcionalidades de vídeo numa unidade (edição, legendagem, extração): 1 — {'video_effects': ['edicao'], 'video_subtitles': ['legendagem'], 'video_frames': ['extracao_fotogramas']}
- Máximo de responsabilidades técnicas numa unidade (detalhe): 4
- Python de vídeo: 778 SLOC, CC média 3.1, CC máx. 20, funções com CC > 10: 4
- Efeitos duplicados entre imagem e vídeo: 8
