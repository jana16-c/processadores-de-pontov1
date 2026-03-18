# Estrutura de Módulos — src/

## Visão geral da organização

A pasta `src/` está organizada em 4 camadas lógicas:
- **parser/** — Entrada de dados brutos
- **domain/** — Lógica de negócio
- **ui/** — Renderização e interação
- **utilitários/** — Funções auxiliares

Cada módulo tem responsabilidades bem definidas e pode ser testado isoladamente.

---

## CAMADA 1: parser/

**Responsável por:** Converter texto bruto em estrutura de dados

### Arquivo: parserInput.js

```javascript
import { parseInput, parseSection } from './parser/parserInput.js'
```

**Função principal:** `parseInput(text: string): ParsedMap`

**O que faz:**
- Divide o texto por períodos ("Período de ... até ...")
- Para cada período, chama parseSection()
- Retorna mapa com todos os funcionários

**Estrutura da saída:**
```javascript
{
  "NOME FUNCIONÁRIO": [
    { data: Date, times: ["HH:MM", ...], isOffDay: boolean },
    ...
  ],
  "OUTRO FUNCIONÁRIO": [...]
}
```

**Regras importantes:**
- Remove horários planejados (2 primeiros de dias normais)
- Preserva todos os horários de dias especiais (DSR/FOLGA)
- Trata cruzamento de meses automaticamente

**Dependências:** nenhuma (pura)

---

## CAMADA 2: domain/

**Responsável por:** Aplicar regras de negócio e estruturar dados

### Arquivo: adjustShifts.js

```javascript
import { adjustShifts } from './domain/adjustShifts.js'
```

**Função:** `adjustShifts(timeline: DayEntry[]): DayEntry[]`

**O que faz:**
- Corrige jornadas quebradas entre dias (virada noturna)
- Fecha dias com número ímpar de batidas
- Adiciona +24h em horários de madrugada

**Exemplo:**
```
Entrada:  Dia 11: [20:51] (ímpar)  |  Dia 12: [03:54] (primeira de amanhã)
Saída:    Dia 11: [20:51, 27:54]   |  Dia 12: [] (03:54 foi movido com +24h)
```

**Dependências:** `toMin()` do utilitários

---

### Arquivo: buildWeeksForMonth.js

```javascript
import { buildWeeksForMonth } from './domain/buildWeeksForMonth.js'
```

**Função:** `buildWeeksForMonth(year: number, monthIndex: number): Week[]`

**O que faz:**
- Divide um mês em semanas (segunda→domingo)
- Remove dias fora do mês
- Retorna semanas em ordem

**Exemplo:**
```javascript
buildWeeksForMonth(2016, 9)  // outubro 2016
// [
//   { mon: Date(seg 3 out), days: [3, 4, ..., 9] },
//   { mon: Date(seg 10 out), days: [10, ..., 16] },
//   ...
// ]
```

**Dependências:** `addDays()`, `mondayOf()` do utilitários

---

### Arquivo: toTSVForWeek.js

```javascript
import { toTSVForWeek } from './domain/toTSVForWeek.js'
```

**Função:** `toTSVForWeek(weekDays: Date[], daysMap: Map): string`

**O que faz:**
- Converte uma semana em formato TSV
- Padroniza colunas (adiciona vazios se necessário)
- Retorna string pronta para copiar no Excel

**Exemplo de saída:**
```
20:51	03:54
08:00	12:00	13:00	17:00
```

**Dependências:** `fmtBRDate()` do utilitários

---

## CAMADA 3: ui/

**Responsável por:** Renderização HTML e interação com usuário

### Arquivo: renderperson.js

```javascript
import { renderPerson } from './ui/renderperson.js'
```

**Função:** `renderPerson(name: string, timeline: DayEntry[], container: HTMLElement): void`

**O que faz:**
1. Agrupa timeline por mês
2. Para cada mês, monta seção visual
3. Para cada semana, cria botão "Copiar"
4. Anexa HTML ao container

**Comportamento de clique:**
- Botão "Copiar semana" → Copia TSV para clipboard
- Mostra feedback visual (botão muda cor)

**Dependências:**
- `buildWeeksForMonth()`, `toTSVForWeek()` do domain
- `fmtBRDate()` do utilitários
- DOM nativo

---

### Arquivo: showError.js

```javascript
import { showError } from './ui/showError.js'
```

**Função:** `showError(msg: string): void`

**O que faz:**
- Localiza #error-box no HTML
- Define o texto da mensagem
- Torna visível (display = 'block')

**Exemplo de uso:**
```javascript
showError("Nenhum funcionário encontrado");
```

---

## CAMADA 4: utilitários/

**Responsável por:** Funções genéricas de suporte

### Arquivo: date.js

**Funções:**
```javascript
import { fmtBRDate, addDays, mondayOf } from './utilitários/date.js'
```

| Função | O que faz | Exemplo |
|--------|-----------|---------|
| `fmtBRDate(date)` | Formata data como dd/mm/aaaa | `fmtBRDate(Date(11/11))` → "11/11/2016" |
| `addDays(date, n)` | Soma N dias | `addDays(Date(31/12), 1)` → Date(01/01 próximo ano) |
| `mondayOf(date)` | Retorna segunda da semana | `mondayOf(Date(ter 15))` → Date(seg 14) |

### Arquivo: time.js

**Funções:**
```javascript
import { toMin } from './utilitários/time.js'
```

| Função | O que faz | Exemplo |
|--------|-----------|---------|
| `toMin(str)` | "HH:MM" → minutos | `toMin("07:30")` → 450 |

### Arquivo: clipboard.js

**Responsabilidade:** (pendente) Cópia para área de transferência

---

## FLUXO COMPLETO: do texto ao resultado

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário cola PDF no textarea                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Clica botão "Processar"  → eventListener processData()   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. parseInput(texto)  [PARSER]                              │
│    Saída: { "NOME": [DayEntry, ...], ... }                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼ (para cada funcionário)
┌─────────────────────────────────────────────────────────────┐
│ 4. adjustShifts(timeline)  [DOMAIN]                         │
│    Saída: timeline ajustada (jornadas noturnas fechadas)   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. renderPerson(nome, timeline, container)  [UI]           │
│    5a. Para cada mês: buildWeeksForMonth()  [DOMAIN]       │
│    5b. Para cada semana: toTSVForWeek()     [DOMAIN]       │
│    5c. Monta HTML, adiciona event listeners                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. HTML renderizado + botões funcionais                     │
│    Usuário pode copiar cada semana para Excel              │
└─────────────────────────────────────────────────────────────┘
```

---

## Dependências entre módulos

```
              parser/
                │
                ▼
        ┌──────────────────┐
        │                  │
    domain/             ui/renderperson.js
        │                  │
        ├── adjus tShifts  │
        ├── buildWeeks     ├──→ domain/buildWeeksForMonth
        └── toTSVForWeek   └──→ domain/toTSVForWeek
                  │
                  ▼
            utilitários/
         (date.js, time.js)
```

**Regra importante:**
- **domain** pode usar **utilitários**, mas não UI
- **parser** é puro, não depende de nada
- **ui** depende de **domain** e **utilitários**, mas não do **parser**

---

## Testabilidade

Cada módulo foi desenhado para ser testável isoladamente:

```
✅ parseInput())      → entrada: string | saída: ParsedMap
✅ adjustShifts()     → entrada: DayEntry[] | saída: DayEntry[]
✅ buildWeeksForMonth() → entrada: number, number | saída: Week[]
✅ toTSVForWeek()     → entrada: Date[], Map | saída: string
✅ fmtBRDate()        → entrada: Date | saída: string
✅ toMin()            → entrada: string | saída: number
```

Ver `tests/` para exemplos.

---

## Dúvidas comuns

**P: Por que `clipboard.js` está vazio?**
R: Implementação pode usar Clipboard API ou fallback para exec('copy'). Deixado para complementar.

**P: Posso reutilizar `domain/` em outro projeto?**
R: Sim! Domain é agnóstico. Apenas troque o parser e a UI.

**P: Como adicionar novas regras de negócio?**
R: Crie novo arquivo em `domain/` com função pura, sem dependência na UI.

**P: Por que não há validação nos utilitários?**
R: Responsabilidade do parser. Utilitários assumem entrada válida.
