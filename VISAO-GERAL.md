# Visão Geral — Processadores de Ponto

Repositório com processadores de espelho de ponto para diferentes empresas clientes. Cada processador é uma aplicação HTML+JS autônoma (sem dependências externas, exceto Tora que usa PDF.js).

---

## Características Comuns (todas as empresas)

- **Aplicação HTML única**: Um único arquivo `.html` contém todo o CSS, HTML e JavaScript — sem build, sem servidor.
- **Interface dark mode**: Paleta consistente (`--bg:#0b1220`, `--blue:#4aa3ff`) em todas as versões finais.
- **Seletor de modo**: Todas (exceto Tora) possuem toggle de dois modos via `<input type="radio">` com troca dinâmica de título e reprocessamento automático ao mudar de modo.
- **Renderização por semanas**: Resultado organizado em Funcionário → Referência/Mês → Semanas → Tabela de horários.
- **Exportação TSV**: Botão "Copiar semana" gera texto separado por TAB para colar diretamente no Excel.
- **Feedback de carregamento**: Barra de progresso simulada (`simulateProgress`), loader animado e pill "Pronto!".
- **Botão Limpar tudo**: Reseta textarea e resultado.
- **Tratamento de cruzamento de meia-noite**: Todos detectam quando `endTime < startTime` e somam +24h ao horário de saída para representar madrugada corretamente.
- **Validação de duração máxima**: Pares que cruzam dias com duração > 14h são descartados como inválidos.
- **Agrupamento por mês/semana**: Todos usam `mondayOf()` para calcular a segunda-feira de cada semana e organizar os dias.
- **Sem supressão de dias iguais consecutivos**: Batidas idênticas em dias diferentes (ex.: 15:11–22:50 no dia 12, 13 e 14) são mantidas — cada dia é tratado de forma independente.

---

## Características Únicas por Empresa

---

### D'Granel
**Arquivo:** `DGRANEL/processador_de_ponto_dgranelvfinal.html`

| Característica | Detalhe |
|---|---|
| **Modos** | Com Espera / Sem Espera |
| **Formato de entrada** | Texto copiado do PDF com `Período:`, `Funcionário / Motorista:` e linhas de `Função:` |
| **Identificação de funcionário** | Regex `Funcionário / Motorista: [NOME] \d` |
| **Extração de jornada** | Busca par data/hora imediatamente antes de cada linha `Função: Jornada de Trabalho` |
| **Lógica Com Espera** | Quando uma `Espera` tem entrada igual à saída da `Jornada`, substitui a saída pela saída da Espera (fusão de blocos contíguos) |
| **Agrupamento** | Por referência `MM/YYYY` derivada da data de fim do período |
| **Validação de período** | Filtra datas até ±2 dias fora do período declarado |

---

### Fertran
**Arquivo:** `FERTRAN/processador_de_ponto_fertranvfinal.html`

| Característica | Detalhe |
|---|---|
| **Modos** | Com Espera / Sem Espera |
| **Formato de entrada** | Similar ao D'Granel, mas com variações de layout de PDF |
| **Extração de nome** | Suporte a CPF embutido no cabeçalho |
| **Tolerância temporal** | Aceita datas até ±35 dias fora do período declarado (mais permissivo que D'Granel) |
| **Referência dinâmica** | `getRefForDate()` — se dia ≥ 16, atribui ao próximo mês (período de apuração 16–15) |
| **Limpeza de texto** | `cleanSliceForParsing()` remove páginas, firma digital e documentos antes de parsear |
| **Agrupamento** | Por mês real do calendário (não pelo período declarado no PDF) |

---

### Usiminas
**Arquivo:** `USIMINAS/processadorusiminasvfinal.html`

| Característica | Detalhe |
|---|---|
| **Modos** | Padrão (V1) / Versão 2 (V2) |
| **Formato de entrada** | Linhas com dia da semana + data + código + horários; sem campo `Função:` |
| **PASSO 0 — Turno noturno misto** | Separa horas de madrugada (< 12h) de horas noturnas (≥ 12h); move madrugadas para o dia anterior com +24h — lógica única no portfolio |
| **Intervalo de refeição** | Input `HH:MM` para inserir pausa de refeição; divide a jornada em dois blocos automaticamente |
| **V1 vs V2** | V1 usa mês real; V2 usa período de apuração 16–15 com `getRefForDate()` |
| **Marcações especiais** | Detecta `FOLGA`, `DSR`, `FERIADO`, `MARCA IRREGULAR`, `s/Marcação de Saída` |
| **Identificação de funcionário** | Regex flexível: `Colaborador`, `Funcionário` ou `Nome` seguido de `:` |

---

### Vale
**Arquivo:** `VALE/processadorpontovalevfinal.html`

| Característica | Detalhe |
|---|---|
| **Modos** | Padrão / Maquinista |
| **Formato de entrada** | Linhas com código de empregado + horários + anotações de irregularidade |
| **Modo Maquinista** | Parser específico para viagens com **rubricas válidas** (011, 026, 110–115, 120, 130–135, 140, 211) — ignora eventos sem rubrica reconhecida |
| **Horário planejado** | Fallback para horário planejado quando saída está faltando (`hasMissingExit`) |
| **Intervalo de refeição** | Input `HH:MM` para inserir pausa de refeição (igual ao Usiminas) |
| **Irregularidades** | Campo `MARCA IRREGULAR` e `s/Marcação de Saída` tratados com flag específica |
| **Agrupamento** | Por mês real do calendário |

---

### Lenarge
**Arquivo:** `LENARGE/processador-lenarge/processador_de_ponto_lenargevfinal.html`

| Característica | Detalhe |
|---|---|
| **Modos** | Com Espera / Apenas Condução |
| **Formato de entrada** | Relatório de rastreamento veicular com placa, local, duração e KM |
| **Extração de eventos** | 7 tipos: `Início de Viagem`, `Fim de Viagem`, `Condução`, `Refeição`, `Repouso`, `Espera`, `Parada` |
| **Overflow de 24h** | Suporte a notação `HH:MM+1d` (ex.: `02:05+1d` → `26:05`) |
| **Detecção de madrugada** | Por rastreamento de `lastMin`; se salto para trás > 60 min (com lastMin > 120), soma +24h |
| **KM e placa** | Armazena `kmStart`, `kmEnd`, `kmDist` e placa por evento (disponíveis na estrutura interna) |
| **Período expandido** | Se dados extrapolam o período declarado, `displayEnd` é estendido automaticamente |
| **Modo Apenas Condução** | Filtra exclusivamente eventos de `Condução`, ignorando Espera, Repouso, Parada e Refeição |

---

### Tora
**Arquivo:** `TORA/processadortorav1.html`

| Característica | Detalhe |
|---|---|
| **Modo** | Único (sem seletor de modo) |
| **Formato de entrada** | **Upload de arquivo PDF** (drag-and-drop ou clique) — único do portfolio |
| **Engine** | Usa `PDF.js` (lib externa) para extrair `textContent` com coordenadas XY de cada item |
| **Mapeamento por zona X** | Colunas detectadas por faixa de coordenada horizontal: Entrada (0–200), Saída (200–350), Refeição (350–520), Espera (520–750) |
| **Tolerância de linha** | Itens com coordenada Y dentro de ±4px são agrupados na mesma linha |
| **4 colunas nomeadas** | Único processador com header de tabela: `Entrada`, `Saída`, `Refeição`, `Espera` |
| **Sem textarea** | Não aceita texto colado — requer o arquivo PDF original |
| **Refeição automática** | Valor extraído diretamente do PDF; sem input manual |

---

## Tabela Comparativa Rápida

| | D'Granel | Fertran | Usiminas | Vale | Lenarge | Tora |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Seletor de modo | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Input textarea | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Upload PDF | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Intervalo refeição | ❌ | ❌ | ✅ | ✅ | ❌ | auto |
| Refeição nas colunas | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Espera nas colunas | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Fusão com Espera | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Turno noturno misto (PASSO 0) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Modo Maquinista / Rubricas | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Rastreamento KM / Placa | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Período 16–15 | ❌ | ✅ | ✅ (V2) | ❌ | ❌ | ❌ |
| Período expandido automático | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
