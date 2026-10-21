#import "../template.typ": *

= Impacto no Sistema Existente

A introdução das funcionalidades de manipulação, reprodução e processamento de vídeo no PictuRAS estende a solução *brownfield* sem descaracterizar a arquitetura nem os mecanismos de base. A tabela seguinte detalha a análise de impacto sobre as entidades, regras e requisitos existentes (identificando as ações de *Manter*, *Estender* e *Alterar*).

#tab([Impacto no sistema existente],
  tabela(
    colunas: (3.4cm, 1.9cm, 1fr, 2.1cm, 2.8cm),
    tamanho: 8.5pt,
    [Elemento existente afetado], [Impacto], [Descrição do impacto], [Caso(s) de uso], [Requisitos],

    [Perfis de utilização (Anónimo, Registado, Premium)],
    [Estender],
    [Os perfis Registado e Premium passam a dispor de biblioteca pessoal de vídeos com quotas diferenciadas de tamanho, duração, resolução e armazenamento (RN10). A reprodução introduz limites de transmissões simultâneas (RN6: 1 para Registado, 3 para Premium). O perfil Anónimo é bloqueado do ecossistema de vídeo e encaminhado para registo.],
    [UC-VID-001, UC-VID-002, UC-VID-003],
    [REQ-VID-LIB-001, 015, 016, 017, 048, 049, 055, REQ-VID-PLAY-001, 029, 030, 039, REQ-VID-TRIM-042, 043],

    [Limite diário de 5 operações (perfil Registado)],
    [Alterar],
    [A semântica de contagem é alterada para suportar tarefas demoradas: o recorte reserva 1 operação na submissão, consome-a no sucesso e devolve-a na falha ou cancelamento (RN3). A consulta da biblioteca, o upload, a reprodução e a eliminação são isentas de quota diária (RN12).],
    [UC-VID-001, UC-VID-002, UC-VID-003],
    [REQ-VID-LIB-034, REQ-VID-PLAY-028, REQ-VID-TRIM-002, 013, 022, 032, 042, 046],

    [Biblioteca do Utilizador e Gestão de Média],
    [Estender],
    [A biblioteca passa a armazenar e gerir vídeos (MP4 e MOV), mantendo uma máquina de estados de ingestão (A carregar, A validar, Disponível, Rejeitado) e metadados técnicos (duração, resolução, codecs). Impede a eliminação de vídeos em uso por pedidos ativos.],
    [UC-VID-001, UC-VID-002, UC-VID-003],
    [REQ-VID-LIB-002, 021, 028, 031, 056, 057, 058, REQ-VID-PLAY-004, 022, REQ-VID-TRIM-020, 048, 055],

    [Armazenamento em Nuvem e Ficheiros],
    [Estender],
    [Suporta ficheiros binários de grande dimensão no armazenamento de objetos (MinIO/S3). Exige limpeza transacional de ficheiros temporários/parciais em cancelamentos ou falhas e controlo do limite total da biblioteca.],
    [UC-VID-001, UC-VID-002, UC-VID-003],
    [REQ-VID-LIB-013, 014, 017, 028, 059, REQ-VID-PLAY-032, REQ-VID-TRIM-054, 056, 062, 063],

    [Mecanismo de Exportação e Download],
    [Estender],
    [O mecanismo de exportação existente é estendido para permitir o descarregamento de vídeos recortados em MP4 e MOV, restringindo o acesso exclusivamente ao utilizador proprietário.],
    [UC-VID-001, UC-VID-002, UC-VID-003],
    [REQ-VID-LIB-032, REQ-VID-PLAY-025, REQ-VID-TRIM-025, 059],

    [Arquitetura de Processamento e Execução Assíncrona],
    [Estender],
    [Introduz uma infraestrutura de fila de trabalhos em segundo plano para vídeo, com máquina de estados (Em fila, A processar, Concluído, Falhou, Cancelado), acompanhamento de progresso %, repetição automática e isolamento do motor FFmpeg.],
    [UC-VID-001],
    [REQ-VID-TRIM-014, 016, 017, 028, 031, 034, 044, 053, 057, 058, 060, 061],

    [Segurança e Entrega de Conteúdos],
    [Estender],
    [A entrega de vídeo passa a utilizar endereços temporários assinados (presigned URLs com TTL ≤ 30 min no MVP) e HTTP Range Requests (206), evitando expor URLs permanentes e sobrecarregar a memória da API.],
    [UC-VID-003],
    [REQ-VID-PLAY-005, 006, 021, 027, 037, 046, 054],

    [Encadeamento de Ferramentas (Pipeline) e Lote (Batch)],
    [Manter],
    [Fora do âmbito do MVP da Fase 1. Cada pedido opera autonomamente sobre um único vídeo. A reprodução e a biblioteca servem de pré-visualização e seleção de entrada/saída sem encadeamento automático.],
    [UC-VID-001, UC-VID-002, UC-VID-003],
    [N/A (Exclusão explicita em A4/A5)],
  ),
)