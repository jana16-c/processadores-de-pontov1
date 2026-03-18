# Catálogo de funções

## Objetivo
Este documento lista as funções principais do sistema, sua responsabilidade,
dependências e potencial de reaproveitamento.

---

## 1. Parser — Extração de dados brutos

### parseInput

**Camada:** parser

**Responsabilidade**
Ler o texto bruto do espelho e converter em dados estruturados por funcionário e por dia.

**Assinatura**
```javascript
parseInput(text: string): ParsedMap
```

**Entrada**
- `text: string` - Texto completo copiado do PDF (pode ter múltiplos espelhos)

**Saída**
- `ParsedMap` - Mapa onde chave é nome e valor é array de DayEntry

**Regras principais**
- Divide texto por "Período de ... até ..."
- Extrai nome do funcionário de campos como "Colaborador:", "Funcionário:"
- Interpreta datas em formato DD.MM.AAAA
- Em dias normais: descarta as 2 primeiras batidas (planejado), preserva resto (real)
- Em DSR/FOLGA/FERIADO: preserva qualquer horário encontrado
- Tratamento de cruzamento de meses: dias reiniciam = próximo mês

**Dependências**
- nenhuma (pura)

**Complexidade**
- O(n) onde n = número de caracteres no texto

**Reaproveitamento**
Alto, mas depende do layout textual do espelho. Mudanças no formato PDF exigem ajuste de regex.

**Riscos**
- Quebra se o PDF mudar estrutura
- Regex pode capturar linhas indesejadas se houver dados malformados

**Exemplo**
```javascript
const text = `Período de 01.11.2016 até 30.11.2016
Colaborador: MURILO AUGUSTO FERRAZ DUTRA
...
11 Seg FIX046A 22:45 07:05 20:51 03:54
12 Dom DSR 15:30
`;
const map = parseInput(text);
// map["MURILO AUGUSTO FERRAZ DUTRA"] = [
//   { data: Date(2016,10,11), times: ["20:51", "03:54"] },
//   { data: Date(2016,10,12), times: ["15:30"], isOffDay: true }
// ]
```

---

## 2. Domain — Regras de negócio

### adjustShifts

**Camada:** domain

**Responsabilidade**
Corrigir jornadas que começam em um dia e terminam no dia seguinte (virada noturna).

**Assinatura**
```javascript
adjustShifts(timeline: DayEntry[]): DayEntry[]
```

**Entrada**
- `timeline: Array<{data: Date, times: string[]}>` - Timeline ordenada por data

**Saída**
- Mesma timeline, com jornadas ajustadas

**Regras principais**
- Se um dia tem número ímpar de batidas, é considerado "aberto"
- Tenta fechar dias abertos puxando batidas do dia seguinte
- Se a primeira batida de amanhã "parece" fechar hoje (é menor ou distância <= 14h), move
- Batidas movidas têm +24h adicionadas (ex: 03:54 → 27:54)
- Ordena datas e horários antes de processar

**Dependências**
- `toMin()` da camada utils

**Complexidade**
- O(n²) no pior caso (pode passar múltiplas vezes ajustando)
- Normalmente O(n) em dados reais

**Reaproveitamento**
Muito alto, é agnóstica ao domínio do espelho.

**Riscos**
- Depende de timeline já estar ordenada por data
- Heurística foi desenhada para layout Usiminas, outros layouts podem exigir ajuste

**Exemplo**
```javascript
const timeline = [
  { data: new Date(2016, 10, 11), times: ["20:51"] },      // ímpar
  { data: new Date(2016, 10, 12), times: ["03:54"] }
];
adjustShifts(timeline);
// Resultado:
// [
//   { data: new Date(2016, 10, 11), times: ["20:51", "27:54"] },
//   { data: new Date(2016, 10, 12), times: [] }
// ]
```

---

### buildWeeksForMonth

**Camada:** domain

**Responsabilidade**
Separar um mês em blocos semanais (seg→dom) visíveis apenas os dias do mês.

**Assinatura**
```javascript
buildWeeksForMonth(year: number, monthIndex: number): Week[]
```

**Entrada**
- `year: number` - Ano completo (ex: 2016)
- `monthIndex: number` - Índice JS (0=jan, 11=dez)

**Saída**
- Array de `{mon: Date, days: Date[]}` - Semanas do mês

**Regras principais**
- Semana sempre começa na segunda-feira
- Semana sempre termina no domingo (quando presente)
- Dias fora do mês são removidos
- Primeira e última semana do mês podem ser incompletas

**Dependências**
- `addDays()`, `mondayOf()` da camada utils

**Complexidade**
- O(d) onde d = dias do mês (~30)

**Reaproveitamento**
Muito alto, é completamente genérica.

**Exemplo**
```javascript
buildWeeksForMonth(2016, 9)  // outubro 2016
// Retorna algo como:
// [
//   { mon: Date(2016, 9, 3), days: [Date(3), Date(4), ..., Date(9)] },
//   { mon: Date(2016, 9, 10), days: [Date(10), ..., Date(16)] },
//   ...
// ]
```

---

### toTSVForWeek

**Camada:** domain

**Responsabilidade**
Converter uma semana de batidas em formato TSV (tab-separated) para exportar no Excel.

**Assinatura**
```javascript
toTSVForWeek(weekDays: Date[], daysMap: Map<string, string[]>): string
```

**Entrada**
- `weekDays: Date[]` - Dias da semana (em ordem)
- `daysMap: Map<string, string[]>` - Map dd/mm/aaaa → horários

**Saída**
- `string` - Texto TSV com linhas separadas por `\n`, colunas por `\t`

**Regras principais**
- Uma linha por dia
- Uma coluna por batida
- Se um dia tem ímpar de batidas, adiciona coluna vazia
- Todas as linhas padronizadas para o número máximo de colunas

**Dependências**
- `fmtBRDate()` da camada utils

**Complexidade**
- O(d × b) onde d = dias da semana, b = batidas máximas

**Reaproveitamento**
Muito alto, é agnóstica.

**Exemplo**
```javascript
const weekDays = [new Date(2016, 10, 11), new Date(2016, 10, 12)];
const daysMap = new Map([
  ["11/11/2016", ["20:51", "03:54"]],
  ["12/11/2016", ["08:00", "12:00", "13:00", "17:00"]]
]);
toTSVForWeek(weekDays, daysMap);
// Resultado:
// "20:51\t03:54\n08:00\t12:00\t13:00\t17:00"
```

---

## 3. UI — Renderização e interação

### renderPerson

**Camada:** ui

**Responsabilidade**
Montar a visualização HTML de um funcionário com seus meses e semanas, inserir na página.

**Assinatura**
```javascript
renderPerson(name: string, timeline: DayEntry[], container: HTMLElement): void
```

**Entrada**
- `name: string` - Nome do funcionário
- `timeline: DayEntry[]` - Timeline já processada (parseada + ajustada)
- `container: HTMLElement` - Elemento pai onde inserir

**O que faz**
1. Agrupa timeline por mês
2. Para cada mês, chama `buildWeeksForMonth()`
3. Para cada semana, chama `toTSVForWeek()` para gerar TSV
4. Monta seção visual com:
   - Título com nome e período
   - Abas/botões para cada semana
   - Botão "Copiar" para cada semana
   - Evento de clique copia TSV para clipboard

**Dependências**
- `buildWeeksForMonth()`, `toTSVForWeek()` do domain
- `fmtBRDate()` do utils
- `copyToClipboard()` do utils
- DOM nativo

**Complexidade**
- O(m × w × d) onde m = meses, w = semanas, d = dias

**Reaproveitamento**
Baixo, é específica da UI Usiminas. Outras interfaces precisarão de reescrita.

---

### showError

**Camada:** ui

**Responsabilidade**
Exibir mensagens de erro na tela para o usuário.

**Assinatura**
```javascript
showError(msg: string): void
```

**O que faz**
1. Localiza elemento #error-box na página
2. Define texto para a mensagem
3. Torna visível (display = block)

**Exemplo**
```javascript
showError("Nenhum funcionário encontrado no texto.");
```

---

## 4. Utils — Funções auxiliares

### fmtBRDate

**Camada:** utils/date

**Responsabilidade**
Formatar uma data no padrão brasileiro DD/MM/AAAA.

**Assinatura**
```javascript
fmtBRDate(dt: Date): string
```

**Entrada**
- `dt: Date` - Data JavaScript

**Saída**
- `string` - Formato "dd/mm/aaaa"

**Regras**
- Sempre 2 dígitos para dia e mês
- Sempre 4 dígitos para ano
- Zero-padded

**Uso principal**
- Chave de mapas por dia
- Títulos visuais
- Identificação de semanas

**Exemplo**
```javascript
fmtBRDate(new Date(2016, 10, 11))  // "11/11/2016"
```

---

### addDays

**Camada:** utils/date

**Responsabilidade**
Somar N dias a uma data, retornando nova instância sem mutar a original.

**Assinatura**
```javascript
addDays(dt: Date, n: number): Date
```

**Entrada**
- `dt: Date` - Data base
- `n: number` - Dias a somar (pode ser negativo)

**Saída**
- `Date` - Nova instância

**Regras**
- Não altera `dt`
- Transições automáticas de mês/ano (nativo de Date)

**Exemplo**
```javascript
addDays(new Date(2016, 11, 31), 1)   // 01/01/2017
addDays(new Date(2016, 10, 15), -3)  // 12/11/2016
```

---

### mondayOf

**Camada:** utils/date

**Responsabilidade**
Retornar a segunda-feira da semana contendo a data informada.

**Assinatura**
```javascript
mondayOf(dt: Date): Date
```

**Entrada**
- `dt: Date` - Qualquer dia da semana

**Saída**
- `Date` - Segunda-feira da mesma semana

**Regras**
- Segunda → Segunda
- Terça-Domingo → Segunda anterior
- Novo objeto, não altera entrada

**Exemplo**
```javascript
mondayOf(new Date(2016, 10, 15))  // segunda da semana de 15/11/2016
```

---

### toMin

**Camada:** utils/time

**Responsabilidade**
Converter horário textual HH:MM em minutos absolutos.

**Assinatura**
```javascript
toMin(str: string): number
```

**Entrada**
- `str: string` - Formato "HH:MM"

**Saída**
- `number` - Minutos totais

**Regras**
- Aceita horários normais: "07:30" → 450
- Aceita horários estendidos: "27:54" → 1674 (virada noturna)

**Uso principal**
- Comparar horários
- Ordenar batidas do dia
- Detectar virada noturna

**Exemplo**
```javascript
toMin("07:30")  // 450
toMin("27:54")  // 1674
```

---

### add24ToTime

**Camada:** utils/time

**Responsabilidade**
Adicionar 24 horas a um horário textual (para representar virada noturna).

**Assinatura**
```javascript
add24ToTime(hhmm: string): string
```

**Entrada**
- `hhmm: string` - Horário normal em formato "HH:MM"

**Saída**
- `string` - Horário com +24h (horas podem ser > 23)

**Uso principal**
- Converter batidas de madrugada para representação no "dia anterior"
- Transformar "03:54" → "27:54" quando é saída de jornada noturna

**Exemplo**
```javascript
add24ToTime("03:54")   // "27:54"
add24ToTime("12:30")   // "36:30"
```

---

### isNextCalendarDay

**Camada:** utils/date

**Responsabilidade**
Verificar se duas datas são dias calendário consecutivos.

**Assinatura**
```javascript
isNextCalendarDay(a: Date, b: Date): boolean
```

**Entrada**
- `a: Date` - Data anterior
- `b: Date` - Data a verificar

**Saída**
- `boolean` - true se b é exatamente o dia após a

**Uso principal**
- Detectar pares de dias consecutivos em adjustShifts()
- Validar que operações de virada noturna são aplicáveis

**Implementação importante**
- Usa UTC para evitar bugs em transição do Horário de Verão
- Ignora horas/minutos (compara apenas dia/mês/ano)

**Exemplo**
```javascript
isNextCalendarDay(Date(11/11), Date(12/11))  // true
isNextCalendarDay(Date(11/11), Date(13/11))  // false
```

---

## 5. Fluxo completo

**Entrada do usuário:**
1. Usuário cola texto do PDF
2. Clica "Processar"

**Processamento:**
```
processData()
  → parseInput(texto) → ParsedMap
  → para cada funcionário:
      → adjustShifts(timeline) → timeline ajustada
      → renderPerson(nome, timeline, container)
         → buildWeeksForMonth() para cada mês
         → toTSVForWeek() para cada semana
         → renderiza com botões de cópia
```

**Saída:**
- HTML renderizado com funcionários, meses e semanas
- Botões funcionais para copiar semanalmente para o Excel