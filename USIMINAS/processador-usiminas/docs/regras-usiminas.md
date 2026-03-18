# Regras de Negócio USIMINAS

## 1. Período de fechamento

**Regra:** O espelho de ponto da Usiminas é emitido para um período mensal (ou corrido).

- Período típico: 1º ao último dia do mês
- Podem cruza meses: p.ex. "01.11.2016 até 30.11.2016"
- O sistema detecta automaticamente se cruza meses
- Dias após a data final são ignorados

**Implementação:**
- Arquivo: `src/parser/parserInput.js` (extrai período)
- Validação: `entryDate <= periodEndDate`

---

## 2. Batidas planejadas vs reais

**Regra:** Em dias normais, o espelho contém informações que NÃO queremos:

**Layout típico de linha normal:**
```
11 Seg FIX046A 22:45 07:05 20:51 03:54
                ^^^^^ ^^^^^ └────┘ └────┘
           código planejado   reais
```

- **22:45 07:05** → Horários planejados (DESCARTADOS)
- **20:51 03:54** → Horários reais (PRESERVADOS)

**Implementação:**
- Se linha tem padrão "dia dia-semana CÓDIGO HH:MM HH:MM ..." 
  → Ignora primeiros 2 horários
- Se linha NÃO tem padrão acima (DSR/FOLGA), preserva TODOS

---

## 3. Dias especiais: DSR, FOLGA, FERIADO

**Regra:** Dias especiais podem ter batidas reais mesmo não sendo dia de trabalho.

**Exemplos:**

```
// Dia normal (sem batida):
12 Dom FOLGA
    └──→ SEM horários, resultará em array vazio []

// Dia especial com batida (exceção):
13 Seg DSR 15:30
    └─────────────→ HÁ horário, preservar! times = ["15:30"]

// Feriado com trabalho:
25 Qua FERIADO 08:00 12:00 13:00 17:00
    └────────────────────────────────→ Preservar tudo
```

**Contexto:**
- DSR (Descanso em Repouso) — dia que o empregado não trabalha mas pode ter compensação
- FOLGA — dia livre do mês
- FERIADO — feriado nacional/estadual com possível trabalho

**Implementação:**
- Detecta linha com `/FOLGA|DSR|FERIADO/i`
- Se isOffDay = true e há horários, os preserva
- Se nenhum horário, deixa array vazio

---

## 4. Virada noturna (labor de um dia para o outro)

**Regra:** Trabalho noturno que cruza meia-noite deve ser registrado no "dia-base" (quando começou).

**Cenário típico:**

```
Joranda: Entra 20:51 de segunda, sai 03:54 de terça

PDF mostra:
  11 Seg ... 20:51
  12 Ter ... 03:54
           └─ Isso é saída de segunda, não entrada de terça!

Resultado esperado:
  11 Seg [20:51, 27:54]  ← batida de terça + 24h
  12 Ter [...]  ← Se houver outra entrada de terça
```

**Lógica de detecção:**

1. Se um dia tem **ímpar** de batidas → dia "aberto"
2. Se dia aberto E próximo dia também ímpar → virada noturna confirmada
3. Se dia aberto E próximo dia par, E primeira batida < última de hoje E intervalo ≤ 14h → provavelmente virada

**Transformação:**
- Primeira batida do dia seguinte é movida para o dia anterior
- Ao mover, adiciona +24h ao horário (ex: 03:54 → 27:54)

**Implementação:**
- Arquivo: `src/domain/adjustShifts.js`
- Função: `adjustShifts(timeline)`
- Depende de: `toMin()` para comparar horários

**Exemplo de processamento:**

```javascript
// Entrada
const timeline = [
  { data: Date(11/11/2016), times: ["20:51"] },      // ímpar
  { data: Date(12/11/2016), times: ["03:54", "08:15"] } // começa par
];

// Lógica:
// 1. Dia 11 tem ímpar (1 batida)
// 2. Dia 12 tem par (2 batidas)
// 3. Primeira de 12 (03:54) < última de 11 (20:51)? SIM
// 4. Intervalo: (03:54 + 24h) - 20:51 = ~7h? SIM ≤ 14h
// 5. Puxar 03:54 para dia 11 com +24h

// Saída
const adjusted = [
  { data: Date(11/11/2016), times: ["20:51", "27:54"] },  // 03:54 + 24h
  { data: Date(12/11/2016), times: ["08:15"] }  // 03:54 removido
];
```

---

## 5. Cruzamento de meses

**Regra:** Se o período cruza meses, o sistema identifica automaticamente quando muda de mês.

**Cenário:**

```
Período: 01.11.2016 até 30.11.2016
Dias: 1, 2, ..., 30 (novembro)

Mas depois aparece:
Dias: 1, 2, 3... (dezembro, reiniciou)

Lógica de detecção:
- Se lastParsedDay > currentDay → mudou de mês
```

**Implementação:**
- Arquivo: `src/parser/parserInput.js`
- Lógica "rolling month": rastreia mês atual conforme dias reiniciam

**Exemplo:**

```
Período: 01.11.2016 até 31.12.2016
Dias do PDF: 1..30 (nov), 1..31 (dez)

Processamento:
- Dia 15: novembro/2016
- Dia 28: novembro/2016
- Dia 1 (volta): DETECTA MUDANÇA → dezembro/2016
- Dia 15: dezembro/2016
```

---

## 6. Agrupamento semanal

**Regra:** O sistema agrupa dias em semanas de segunda a domingo para facilitar cópia no Excel.

**Semana padrão:**
```
Segunda: 07/11/2016
Terça:   08/11/2016
Quarta:  09/11/2016
Quinta:  10/11/2016
Sexta:   11/11/2016
Sábado:  12/11/2016
Domingo: 13/11/2016
```

**Semanas incompletas:**
- Primeira semana do mês pode não começar na segunda (p.ex. se 1º é quarta)
- Última semana do mês pode não terminar no domingo

**Implementação:**
- Arquivo: `src/domain/buildWeeksForMonth.js`
- Função: detecta segunda-feira (mondayOf) e constrói blocos

---

## 7. Formato de saída: TSV

**Regra:** O sistema exporta semanas em formato TSV (Tab-Separated Values) para colar no Excel.

**Formato:**

```
HH:MM <TAB> HH:MM <TAB> HH:MM <TAB> HH:MM
HH:MM <TAB> HH:MM
HH:MM <TAB> HH:MM <TAB> HH:MM
...
```

**Regras TSV:**
1. Campos separados por `\t` (TAB)
2. Linhas separadas por `\n`
3. Se um dia tem ímpar de batidas, completa com campo vazio
4. Todas as linhas padronizadas para o mesmo número de colunas

**Exemplo:**

```
20:51	27:54
08:00	12:00	13:00	17:00
08:15	12:30	13:45	18:00
```

**Implementação:**
- Arquivo: `src/domain/toTSVForWeek.js`
- Função: monta linhas com maxCols padronizadas

---

## 8. Ordem de processamento

```
Entrada: Texto bruto do PDF
    ↓
1. parseInput()
   → ParsedMap { "NOME": [DayEntry, ...], ...}
    ↓
2. adjustShifts()
   → Timeline com jornadas noturnas fechadas
    ↓
3. renderPerson()
   → Agrupa por mês
   → buildWeeksForMonth() (para cada mês)
   → toTSVForWeek() (para cada semana)
   → Monta HTML com botões de cópia
    ↓
Saída: Página interativa com dados estruturados
```

---

## 9. Casos especiais e edge cases

| Caso | Comportamento |
|------|---------------|
| **Dia com 0 batidas** | Ignorado, não aparece na saída |
| **Dia com 1 batida (ímpar)** | Tenta fechar com primeira de amanhã |
| **Dia com 3 batidas (ímpar)** | Pode ser meia-noite dupla ou erro |
| **Período com feriado prolongado** | DSRs agrupados são preservados |
| **Espelho com múltiplos funcionários** | Processados separadamente em ordem alfabética |
| **Horário inválido (99:99)** | Não é validado, parser preserva como está |
| **Linha malformada** | Pode ser ignorada se não bate regex |

---

## 10. Fluxo de validação (ausente)

**Nota importante:** O sistema NÃO valida:
- Horários inválidos
- Jornadas biologicamente impossíveis
- Duplicação de batidas
- Ordenação incorreta

Essas validações podem ser adicionadas em uma camada de "validação" futura.

Responsabilidade atual: **transformar e reorganizar**, não julgar.

