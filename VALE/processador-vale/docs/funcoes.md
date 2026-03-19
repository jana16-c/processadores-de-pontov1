# Referência de Funções do Processador de Ponto VALE

## Ponto de Entrada

### `processData()` - main.js
**Tipo:** Função global (vinculada a `window`)  
**Acionada por:** Evento `onclick` do botão HTML

```javascript
window.processData = function() { ... }
```

**Responsabilidades:**
- Captura texto do textarea (`#raw-data`)
- Desabilita botão durante processamento
- Chama `parseInput()` para processar texto
- Para cada funcionário, chama `adjustShifts()` e `renderPerson()`
- Trata e exibe erros
- Mostra feedback visual de sucesso

**Fluxo:**
1. Valida entrada (não vazia)
2. Itera sobre mapa de funcionários
3. Ordena cronologicamente (adjustShifts)
4. Renderiza resultado (renderPerson)
5. Restaura botão após 2 segundos

---

## Parser - Análise de Texto

### `parseInput(text)` - parserInput.js
**Entrada:** String (texto bruto do PDF)  
**Saída:** Object `{nomeFuncionário: Array<diasComHorários>}`

**Responsabilidades:**
- Normaliza quebras de linha (remove `\r`)
- Extrai nomes de funcionários via regex `Empregado: ...`
- Identifica linhas de dia via padrão `seg|ter|qua|qui|sex|sáb|dom DD/MM/YY`
- Extrai horários e códigos de agendamento
- Detecta marcações irregulares, folgas, feriados
- Une pares de horários (entrada/saída)
- Ajusta turno noturno (saída < entrada)
- Retorna mapa ordenado e validado

**Estrutura Retornada:**
```javascript
{
  "NOME_FUNCIONARIO": [
    {
      data: Date,
      scheduleCode: String | null,
      times: Array<"HH:MM">,
      useSchedule: Boolean,
      isOffDay: Boolean,
      hasIrregularMark: Boolean,
      hasMissingExit: Boolean
    },
    ...
  ]
}
```

---

### `extractTimesStrict(line, dayObj, isFirstLine, isIrregularLine, hasMissingExit, schedules)` - parserInput.js (interna)
**Tipo:** Função auxiliar (não exportada)

**Responsabilidades:**
- Extrai estritamente horários em formato "HH:MM" de uma linha
- Na primeira linha, remove prefixo de dia e data
- Valida padrão `\d{1,2}:\d{2}` para cada token
- Trata marcações irregulares com lógica especial
- Preenche lacunas de saída faltante com horário contratual
- Evita duplicação de linhas subsequentes

**Parâmetros:**
- `isFirstLine`: Se verdadeiro, remove cabeçalho de data
- `isIrregularLine`: Aplica lógica de validação de duração
- `hasMissingExit`: Preenche saída faltante com schedule
- `schedules`: Mapa de horários contratuais por código

---

## Domain - Lógica de Negócio

### `adjustShifts(timeline)` - adjustShifts.js
**Entrada:** Array com objetos de dias  
**Saída:** Array ordenado cronologicamente

```javascript
export function adjustShifts(timeline) {
    timeline.sort((a, b) => a.data - b.data);
    return timeline;
}
```

**Responsabilidade:** Ordena dias da mais antiga para a mais recente.

---

### `buildWeeksForMonth(year, monthIndex)` - buildWeeksForMonth.js
**Entrada:** `year` (número), `monthIndex` (0-11)  
**Saída:** Array de semanas

```javascript
export function buildWeeksForMonth(year, monthIndex) { ... }
```

**Retorna:**
```javascript
[
  {
    mon: Date,         // Segunda-feira da semana
    days: Array<Date>  // Dias úteis daquela semana no mês
  },
  ...
]
```

**Responsabilidades:**
- Encontra primeira e última data do mês
- Para cada dia, identifica segunda-feira da semana
- Agrupa dias por semana (Segunda a Domingo)
- Filtra apenas dias do mês especificado
- Ordena semanas cronologicamente

---

### `toTSVForWeek(weekDays, daysMap)` - toTSVForWeek.js
**Entrada:**
- `weekDays`: Array de Dates (dias da semana)
- `daysMap`: Map `{dataBR: [horários]}`

**Saída:** String com linhas separadas por `\t` e `\n`

```javascript
export function toTSVForWeek(weekDays, daysMap) { ... }
```

**Responsabilidades:**
- Extrai horários de cada dia
- Padroniza colunas (pares entrada/saída)
- Completa linhas curtas com vazios
- Formata como TSV (Tab-Separated Values)
- Responde perfeitamente ao colar no Excel

---

## UI - Apresentação

### `renderPerson(name, timeline, container)` - renderPerson.js
**Entrada:**
- `name`: String (nome do funcionário)
- `timeline`: Array<{data, times}>
- `container`: HTMLElement (div para injetar resultado)

**Responsabilidades:**
- Cria bloco visual com nome do funcionário
- Agrupa dias por mês
- Para cada mês:
  - Calcula semanas via `buildWeeksForMonth()`
  - Exibe cartão com informações do mês
  - Para cada semana:
    - Cria tabela com horários
    - Gera TSV via `toTSVForWeek()`
    - Adiciona botão "Copiar semana"
- Injeta HTML no container

**Estrutura HTML Gerada:**
```
div.result-block
├── div.person-name
└── div.month-card (para cada mês)
    ├── div.card-header (mês, dias do mês)
    └── div.weeks
        └── div.week (para cada semana)
            ├── div.weekhead
            │   ├── div.weektitle
            │   └── button.btn-copy
            └── table.tbl
```

---

### `showError(message)` - showError.js
**Entrada:** String (mensagem de erro)  
**Responsabilidade:** Exibe erro na caixa `#error-box` do DOM

```javascript
export function showError(message) {
    const errBox = document.getElementById('error-box');
    if (errBox) {
        errBox.textContent = message;
        errBox.style.display = 'block';
    }
}
```

---

## Utilitários - Suporte

### `copyToClipboard(text)` - clipboard.js
**Entrada:** String (texto a copiar)  
**Retorna:** Promise

```javascript
export async function copyToClipboard(text) { ... }
```

**Tenta:**
1. API moderna `navigator.clipboard.writeText()`
2. Fallback: `document.execCommand("copy")` (legacy)

---

### `fmtBRDate(dt)` - date.js
**Entrada:** Date  
**Saída:** String `"DD/MM/YYYY"`

```javascript
export function fmtBRDate(dt) { ... }
// Exemplo: new Date(2024, 0, 15) → "15/01/2024"
```

---

### `addDays(dt, n)` - date.js
**Entrada:** Date, número de dias (positivo/negativo)  
**Saída:** Novo Date (original não modificado)

```javascript
export function addDays(dt, n) { ... }
// Exemplo: addDays(new Date(2024, 0, 15), 5) → 20/01/2024
```

---

### `mondayOf(dt)` - date.js
**Entrada:** Date  
**Saída:** Date (segunda-feira daquela semana)

```javascript
export function mondayOf(dt) { ... }
// Exemplo: se 2024-01-17 é quarta, retorna 2024-01-15 (segunda)
```

**Algoritmo:**
- `day = 0` (domingo) → `diff = -6`
- `day > 0` → `diff = 1 - day`
- Adiciona `diff` dias à data

---

### `parseToMins(tStr)` - time.js
**Entrada:** String `"HH:MM"`  
**Saída:** number (minutos totais)

```javascript
export function parseToMins(tStr) { ... }
// Exemplo: "08:30" → 510 (minutos)
```

---

### `formatMins(mins)` - time.js
**Entrada:** number (minutos)  
**Saída:** String `"HH:MM"` (sem limite de 24h)

```javascript
export function formatMins(mins) { ... }
```

**Nota:** Permite horas > 24 para turnos aditivos e noturnos.  
Exemplo: 1500 minutos → "25:00"

---

## Sumário de Dependências

```
main.js
├── parseInput (parserInput.js)
├── adjustShifts (adjustShifts.js)
├── renderPerson (renderPerson.js)
└── showError (showError.js)

parserInput.js
├── parseToMins (time.js)
└── formatMins (time.js)

renderPerson.js
├── fmtBRDate (date.js)
├── buildWeeksForMonth (buildWeeksForMonth.js)
│   ├── addDays (date.js)
│   └── mondayOf (date.js)
├── toTSVForWeek (toTSVForWeek.js)
│   └── fmtBRDate (date.js)
└── copyToClipboard (clipboard.js)

clipboard.js
└── [sem dependências internas]

date.js
└── [sem dependências internas]

time.js
└── [sem dependências internas]
```

---

## Casos de Erro Tratados

1. **Entrada vazia** → "Por favor, cole o texto do PDF."
2. **Nenhum funcionário encontrado** → "Nenhum funcionário ou batida foi encontrado no texto."
3. **Erro na análise** → "Erro ao processar." + log no console
4. **Clipboard indisponível** → Fallback para `execCommand`

---

## Fluxo de Exemplo

```
Entrada: "Empregado: JOÃO DA SILVA Categoria: ...
           seg 01/01/24 00001 08:00 12:00 13:00 17:00
           ter 02/01/24 08:30 12:30"

parseInput()
├── Extrai nome: "JOÃO DA SILVA"
├── Cria dia 01/01/24: times = [08:00, 12:00, 13:00, 17:00]
└── Cria dia 02/01/24: times = [08:30, 12:30]

adjustShifts() → ordena cronologicamente (já está)

renderPerson()
├── Agrupa em janeiro/2024
├── buildWeeksForMonth(2024, 0)
│   └── Retorna semanas
├── Para cada semana:
│   ├── toTSVForWeek() → "08:00\t12:00\t13:00\t17:00\n08:30\t12:30"
│   └── Cria botão "Copiar semana"
└── Injeta HTML no container

Resultado: Tabela visual pronta para copiar
```
