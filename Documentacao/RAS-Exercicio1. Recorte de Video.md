# 📝 Exercício 1 — Recortar um Intervalo Temporal de um Vídeo
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | {nº do grupo} |
| **Autores** | Francisco Dias (PG63958); Rodrigo Rocha (PG65437); Rodrigo Fernandes (PG64026); Luís Miguel (PG65424); Joaquim Cunha (PG63986) |
| **Data** | 2026-10-05 |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Recorte temporal de vídeo  |
| **Perfil(s) de utilizador abrangido(s)** | **Utilizador registado**. É o perfil em que o recorte tem de respeitar o mecanismo de operações limitadas já existente (5 operações por dia). O perfil Anónimo, por causa das suas operações limitadas, fica fora do âmbito. O perfil Premium segue o mesmo fluxo do que o Registado, mas sem o limite diário.|

**Justificação no contexto do MVP** *(2–3 linhas)*

O recorte temporal de vídeo é uma operação que se espera que esteja implementada em qualquer software de edição de vídeo. Permite ao utilizador obter só a parte do vídeo que lhe interessa, num ficheiro mais pequeno, o que acrescenta bastante valor à experiência do utilizador.


---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Recortar um Intervalo Temporal de um Vídeo|
| **Versão** | v1.0 |
| **Autor** | Francisco Dias, Rodrigo Rocha, Rodrigo Fernandes, Luís Miguel, Quim |
| **Data** | 2026-10-05 |
| **Objetivo** | Permite ao utilizador obter um recorte de um vídeo correspondente a um intervalo temporal de um vídeo na sua biblioteca.|
| **Âmbito** | 	Módulo de vídeo do PictuRAS — ferramenta básica |
| **Ator Principal** | Utilizador Registado |
| **Stakeholders e Interesses** | - **Utilizador**: quer obter a parte do vídeo que lhe interessa<br>- **Proprietário do Sistema**: pretende controlar o custo de processamento e armazenamento do nível gratuito e incentivar a subscrição premium<br>- **Equipa de Desenvolvimento**: valida a cadeia de processamento assíncrono de vídeo |
| **Pré-condições** | - O utilizador tem sessão iniciada<br>- O vídeo já foi submetido com sucesso e está disponível na biblioteca do utilizador |
| **Trigger** | O utilizador seleciona um vídeo e escolhe a opção **Recortar** |


### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a sua biblioteca de vídeos. | Apresenta a lista de vídeos do utilizador e o número de operações restantes no dia.|
| 2 | O utilizador seleciona um vídeo e escolhe **Recortar**. | Verifica que o formato de vídeo é suportado e que não há outro recorte em curso. |
| 3 | — | Abre o ecrã de recorte com reprodutor e duração total do vídeo. |
| 4 | O utilizador define o instante inicial e final do intervalo que quer recortar.| Valida se o intervalo é válido e mostra a duração do vídeo resultante. |
| 5 | O utilizador escolhe o formato de saída (MP4 ou MOV, por omissão é o original) e o nome do novo vídeo. | Mostra o resumo do pedido (vídeo de origem, intervalo, duração resultante, formato, nome e permite pré-visualização do resultado). |
| 6 | O utilizador confirma com **Iniciar Recorte**. | — |
| 7 | — | Valida os limites do perfil, a quota e o espaço de armazenamento, reserva 1 operação e regista o pedido. |
| 8 | — | Coloca o pedido em fila (estado **Em Fila**) e retorna o utilizador para a sua biblioteca.|
| 9 | — | Ao iniciar o processamento, passa o estado para **A processar** e apresenta o progresso (%). |
| 10 | O utilizador consulta o estado do pedido se quiser. | Apresenta o estado atual e o progresso. |
| 11 | — | Ao terminar, guarda o resultado sobrescrevendo o vídeo original na biblioteca, passa o estado para **Concluído** e consome a operação reservada.|
| 12 | — | Notifica o utilizador que o recorte está concluído.|
| 13 | O utilizador abre o vídeo recortado e pode descarregar. | Reproduz o resultado e disponibiliza o descarregamento.|


### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Intervalo igual à duração total| No passo 4, o utilizador abrange o vídeo inteiro → o sistema avisa que o resultado seria uma cópia do original e pede confirmação. Se o utilizador recusar, regressa ao passo 4. |
| FA2 – Cancelar o pedido | O utilizador escolhe **Cancelar**, enquanto o estado for **Em fila** → O sistema pede confirmação, passa o estado para **Cancelado** e regressa à biblioteca.|
| FA3 – Utilizador sai durante o processo| O utilizador fecha a aplicação ou termina a sessão após o passo 6 → O processamento continua. Quando o utilizador regressa, o sistema apresenta uma notificação de conclusão (ou de falha) e o estado atualizado do pedido. |



### 2.4 Exceções


| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| Formato ou codec do vídeo de origem não suportado. | Apresenta "Este formato de vídeo não é suportado para recorte", indica os formatos aceites e não abre o ecrã de recorte. Não consome quota. |
| Intervalo inválido: início >= fim, fim superior à duração do vídeo ou duração do intervalo fora dos limites. | Assinala o erro, indica o motivo e o limite violado e mantém o botão **Iniciar Recorte** desativado. |
| Quota diária esgotada | Apresenta "Atingiu o limite de operações diárias", indica a hora a que a quota é reposta e sugere o perfil Premium. Não cria o pedido. |
| Já existe um recorte do utilizador **Em fila** ou **A processar** | No caso de ser um utilizador **Registado**, apresenta "Já existe um recorte em curso. Aguarde a conclusão" e recusa o pedido. Para os utilizadores **Premium**, o sistema permite a criação de múltiplos pedidos. |
| Falha a meio do processamento (erro do codificador, ficheiro corrompido, falta de recursos...) | Tenta automaticamente uma segunda vez. Se voltar a falhar, passa o estado para **Falhou**, devolve a operação à quota e notifica o utilizador: "Não foi possível concluir o recorte. Tente novamente". |
| O utilizador tenta eliminar o vídeo de origem enquanto o recorte está **Em fila** ou **A processar**| Impede a eliminação e informa que o vídeo está a ser utilizado numa operação. A eliminação só é possível depois de o estado passar para **Concluído**, **Falhou** ou **Cancelado**. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | O vídeo original é substituído pelo recorte realizado. O pedido tem o estado **Concluído**. A operação foi definitivamente contabilizada na quota diária e o utilizador foi notificado. |
| Garantia Mínima | O vídeo original mantém-se inalterado. Não permanece nenhum ficheiro parcial. A operação reservada é devolvida à quota. O pedido fica com o estado **Falhou** ou **Cancelado**. O utilizador é notificado do que aconteceu. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | Os formatos aceites como entrada e como saída do recorte são MP4 e MOV. |
| RN2 | O intervalo selecionado tem duração mínima de 1 segundo e máxima de 2 minutos para utilizadores **Registados** ou do tempo total do vídeo original para utilizadores **Premium**. O instante do fim não pode exceder a duração do vídeo.|
| RN3 | Cada pedido de recorte conta como 1 operação do limite diário do perfil **Registado**, independentemnete da duração do intervalo. A operação é reservada ao submeter o pedido, consumida definitivamente apenas quando o recorte é concluído com sucesso e devolvida se o pedido falhar ou for cancelado.|
| RN4 | Um utilizador **Registado** só pode ter 1 recorte **Em fila** ou **A processar** em simultâneo. |
| RN5 | O resultado sobescreve o vídeo original. O nome por omissão é `{nome_original}recorte{início}-{fim}`. O recorte preserva a resolução e a taxa de fotogramas do original. |
| RN6 | O pedido percorre os estados **Em fila** → **A processar** → **Concluído**, podendo terminar em **Falhou** ou **Cancelado**. O cancelamento só é permitido no estado **Em fila**. |
| RN7 | A falha a meio do processamento leva a uma nova tentativa automática antes do pedido ser marcado como **Falhou**. |


### 2.7 Assunções


| **ID** | **Assunção** |
|--------|--------------|
| A1 | O vídeo de origem está armazenado e acessível ao serviço no momento do pedido e já foi validado durante o carregamento.|
| A2 | O processamento é assíncrono e o tempo de conclusão depende da duração do intervalo e da carga do sistema. |
| A3 | A notificação de conclusão é feita apenas dentro da aplicação. |
| A4 | Cada pedido corta um único intervalo de um único vídeo. |
| A5 | O vídeo recortado é um vídeo comum na biblioteca e pode ser usado como entrada de novas operações. |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | Que limites e que prioridade na fila deve ter o perfil **Premium**? |
| Q2 | O perfil **Anónimo** deve ter acesso a esta funcionalidade? Se sim, como se articula com o facto de não ter biblioteca persistente?|
| Q3 | A operação deve contar sempre como 1, independentemente da duração, ou ser ponderada pela duração do vídeo?|
| Q4 | Por quanto tempo devem ser conservados os vídeos recortados e o histórico de pedidos falhados ou cancelados?|
| Q5 | Faz realmente sentido que o utilizador possa recortar um vídeo e o resultado sobescreva o vídeo original?|

---

## 3. Utilização de agentes de IA


| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| Claude  | Sugestão de Exceções | Revisão Manual |
| Claude  | Sugestão de Regras de Negócio | Revisão Manual e descartamos 3 regras que não achamos adequadas a esta ferramenta.|
| NotebookLM | Revisão do caso de uso, para evitar inconsistências, incoerências e contradições | Revisão Manual |

---

## ✅ Lista de verificação antes de entregar (Exercício 1)

- [X] Secções 0 a 3 preenchidas e texto de ajuda (`>` e `{…}`) removido.
- [X] Funcionalidade de vídeo escolhida **e justificada** no contexto do MVP.
- [X] Ator principal identificado, com o respetivo perfil.
- [X] Caso de uso com fluxo principal, **≥1 fluxo alternativo** e **≥1 exceção específica de vídeo**.
- [X] Pós-condições com garantia de sucesso **e** garantia mínima.
- [X] Regras de negócio e restrições preenchidas.
- [X] Assunções e questões em aberto registadas.
- [X] Utilização de agentes de IA documentada.

---
---

## 4. Esboço de requisitos derivados

> ⛔ **Não preencher no Exercício 1.** Esta secção será trabalhada na aula seguinte, a partir do caso de uso das secções 2.1 a 2.8. Fica aqui para que conheçam o passo seguinte — veja a secção com o mesmo nome no exemplo de vídeo.

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| REQ-VID-{FUNC}-001 | O sistema deve {…} | F | | | | |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|------------------------------|
| {…} | {…} | {…} | {…} |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
| Passo 1 | {…} | REQ-VID-…-001 |
