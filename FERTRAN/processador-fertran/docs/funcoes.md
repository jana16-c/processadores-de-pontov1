# Dicionário de Funções

## 📅 Utilidades de Data

### `parseBRDate(dmy: string) → Date | null`
**Converte data no formato DD/MM/YYYY para objeto Date**

```javascript
parseBRDate("15/03/2026") // → Date(2026, 2, 15)
parseBRDate("31/12/2025") // → Date(2025, 11, 31)
parseBRDate("invalid")    // → null
```

- **Parâmetros**: `dmy` - data em string no formato DD/MM/YYYY
- **Retorna**: Objeto Date ou null se inválido
- **Validação**: Verifica regex `/^(\d{2})\/(\d{2})\/(\d{4})$/`
- **Nota**: Mês é 0-indexed (março = 2)

---

### `fmtBRDate(dt: Date) → string`
**Formata data em formato DD/MM/YYYY**

```javascript
fmtBRDate(new Date(2026, 2, 15)) // → "15/03/2026"
```

- **Parâmetros**: `dt` - objeto Date
- **Retorna**: String no formato DD/MM/YYYY
- **Uso**: Exibição e armazenamento consistente

---

### `addDays(dt: Date, n: number) → Date`
**Retorna uma nova data com N dias adicionados**

```javascript
addDays(new Date(2026, 2, 15), 1)  // → 16/03/2026
addDays(new Date(2026, 2, 15), -5) // → 10/03/2026
```

- **Parâmetros**: 
  - `dt` - data base
  - `n` - número de dias (positivo ou negativo)
- **Retorna**: Nova data modificada
- **Nota**: Não modifica data original

---

### `mondayOf(dt: Date) → Date`
**Retorna a segunda-feira da semana contendo a data**

```javascript
mondayOf(new Date(2026, 2, 15)) // → 2026-03-09 (segunda-feira)
// (15/03 é domingo, segunda anterior = 09/03)
```

- **Parâmetros**: `dt` - data qualquer
- **Retorna**: Segunda-feira de aquela semana
- **Cálculo**: Ajusta pelo `day` do JavaScript (0=domingo, 6=sábado)
- **Fórmula**: `diff = (day === 0 ? -6 : 1 - day)`

---

### `isNextDay(d1: string, d2: string) → boolean`
**Verifica se d2 é exatamente o próximo dia de d1**

```javascript
isNextDay("14/03/2026", "15/03/2026") // → true
isNextDay("15/03/2026", "16/03/2026") // → true
isNextDay("15/03/2026", "17/03/2026") // → false
```

- **Parâmetros**: Dates em DD/MM/YYYY
- **Retorna**: true se diferença = 1 dia exato
- **Cálculo**: `diff = (b - a) / 86400000` ms em um dia

---

### `toMinutes(hhmm: string) → number | null`
**Converte HH:MM para minutos totais**

```javascript
toMinutes("08:30") // → 510 (8*60 + 30)
toMinutes("18:45") // → 1125 (18*60 + 45)
toMinutes("25:00") // → null (inválido)
```

- **Parâmetros**: `hhmm` - string HH:MM
- **Retorna**: Número de minutos ou null
- **Uso**: Cálculo de duração de jornadas

---

### `add24(hhmm: string) → string`
**Adiciona 24 horas a um horário HH:MM**

```javascript
add24("08:00") // → "32:00" (formato estendido)
add24("18:30") // → "42:30"
```

- **Parâmetros**: `hhmm` - string HH:MM
- **Retorna**: Horário com +24h
- **Nota**: Não converte para HH:MM de 24h, mantém formato estendido
- **Uso**: Jornadas que cruzam meia-noite

---

## 🔤 Utilidades de String/Texto

### `normalizeSpaces(s: string) → string`
**Remove espaços, quebras de linha e tabulações extras**

```javascript
normalizeSpaces("Texto  com   espaços\r\n\r\n") 
// → "Texto com espaços"
```

- **Conversões**:
  - `\r\n` → `\n`
  - `\r` → `\n`
  - `[\t\f\v]+` → espaço único
  - Múltiplos espaços → espaço único
- **Parâmetros**: `s` - string qualquer
- **Retorna**: String normalizada

---

### `onlyHHMM(hhmmss: string) → string`
**Extrai apenas HH:MM de HH:MM:SS**

```javascript
onlyHHMM("08:30:45") // → "08:30"
onlyHHMM("18:45:00") // → "18:45"
onlyHHMM("invalid")  // → ""
```

- **Parâmetros**: `hhmmss` - string com horário
- **Retorna**: HH:MM ou string vazia
- **Regex**: `/^([0-9]{2}):([0-9]{2})/`

---

### `escapeHtml(s: string) → string`
**Escapa caracteres especiais HTML**

```javascript
escapeHtml("<script>alert('xss')</script>")
// → "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
```

- **Conversões**: `&`, `<`, `>`, `"`, `'`
- **Uso**: Segurança na renderização de nomes
- **Parâmetros**: `s` - string qualquer

---

## 🔍 Análise de Texto

### `splitByPeriods(text: string) → Array<{periodStart, periodEnd, slice}>`
**Divide o texto por períodos (Mês/Ano)**

```javascript
splitByPeriods(texto)
// Retorna: [
//   { periodStart: "01/01/2026", periodEnd: "31/01/2026", slice: "..." },
//   { periodStart: "01/02/2026", periodEnd: "28/02/2026", slice: "..." }
// ]
```

- **Regex Principal**: `/Per[ií]odo:\s*(\d{2}\/\d{2}\/\d{4})(?:\s+\d{2}:\d{2}:\d{2})?\s*(?:à|-)\s*(\d{2}\/\d{2}\/\d{4})/gi`
- **Se não encontrar períodos**: Usa primeiro/último datas encontradas
- **Parâmetros**: `text` - texto completo do espelho
- **Retorna**: Array de objetos com período e slice

---

### `extractEmployeeName(slice: string) → string`
**Extrai nome do funcionário do texto da seção**

```javascript
extractEmployeeName(texto)
// → "João Silva"
```

- **Regex**: `/Funcion[aá]rio(?:\s*\/\s*Motorista)?\s*:\s*([\s\S]+?)(?:\s*CPF\s*:|$)/mi`
- **Limpeza**:
  - Remove quebras de linha extras
  - Remove números após CPF
  - Converte quebras em espaços
  - Normaliza espaços duplicados
- **Padrão**: "Funcionário: NOME CPF:"
- **Retorna**: Nome do funcionário ou "FUNCIONÁRIO" como padrão

---

### `cleanSliceForParsing(s: string) → string`
**Remove linhas de cabeçalho/rodapé do documento**

```javascript
cleanSliceForParsing("Pagina 1 de 10\n...\nDocumento assinado...")
// Remove padrões de paginação
```

- **Remove**:
  - `Pagina X de Y`
  - Linhas de assinatura digital
  - Números de folha (`Fls.:`)

---

### `extractJourneys(slice: string, periodStart: string, periodEnd: string) → Array<Journey>`
**Extrai registros de jornadas e esperas**

```javascript
extractJourneys(texto, "01/03/2026", "31/03/2026")
// Retorna: [
//   {
//     startDate: "01/03/2026",
//     startTime: "08:30:45",
//     endDate: "01/03/2026",
//     endTime: "18:45:00",
//     func: "Jornada de Trabalho",
//     msg: "NORMAL"
//   }
// ]
```

- **Regex de Busca**: `/Função:?\s*([^\n\r]+?)\s+(?:Macro\s+Mensagem:|Tipo)\s*:?\s*([^\n\r]+)/g`
- **Contexto**: Procura 1200 caracteres anteriores
- **Filtro de Período**: Descarta se fora do intervalo ±35 dias
- **Filtro de Duração**: Remove se > 14h (exceto cruzamento de dia)
- **Parâmetros**:
  - `slice` - texto da seção
  - `periodStart` - DD/MM/YYYY
  - `periodEnd` - DD/MM/YYYY
- **Retorna**: Array de objetos Journey

---

## 🏗️ Modelagem de Dados

### `buildDataModelComEspera(rawText: string) → Array<Person>`
**Processa texto COM tratamento de períodos de espera**

**Lógica**:
1. Normaliza texto
2. Divide por períodos
3. Para cada funcionário:
   - Extrai jornadas
   - Identifica `Jornada de Trabalho`
   - Identifica `Espera`
   - Se espera dentro de jornada: substitui horário de saída
   - Remove duplicatas
   - Agrupa por mês

**Estrutura de Saída**:
```javascript
[
  {
    name: "João Silva",
    refs: [
      {
        refKey: "03/2026",
        periodStart: "01/03/2026",
        periodEnd: "31/03/2026",
        days: Map {
          "01/03/2026": ["08:00", "12:00", "13:00", "18:00"]
        }
      }
    ]
  }
]
```

---

### `buildDataModelSemEspera(rawText: string) → Array<Person>`
**Processa texto SEM incluir períodos de espera**

**Lógica**:
1. Normaliza texto
2. Divide por períodos
3. Para cada funcionário:
   - Extrai jornadas
   - **Ignora** períodos de espera
   - Mantém apenas `Jornada de Trabalho`
   - Remove duplicatas
   - Agrupa por mês

**Diferenças**:
- Não faz ajuste de espera nos horários
- Simples remoção de duplicatas
- Saída idêntica em estrutura

---

## 🎨 Renderização e Export

### `buildWeeks(periodStart: string, periodEnd: string) → Array<Week>`
**Constrói array de semanas para o período**

```javascript
buildWeeks("01/03/2026", "31/03/2026")
// Retorna semanas de março agrupadas
```

- **Cálculo**: Define segunda-feira como início de semana
- **Filtro**: Inclui apenas dias do mês solicitado
- **Estrutura**:
  ```javascript
  {
    mon: Date,  // segunda-feira
    days: [Date, Date, ...] // seg-dom do mês
  }
  ```

---

### `toTSVForWeek(weekDays: Date[], inRangeFn, dayToTimes, weekLabel) → string`
**Converte semana para formato TSV (Tab-Separated Values)**

```javascript
toTSVForWeek(dias, sempre true, mapa, "Semana 09-15/03")
// Retorna: "Semana\t09-15/03\n08:00\t12:00\n13:00\t18:00\n..."
```

- **Formato**: Colunas separadas por TAB
- **Uso**: Copiar direto para Excel
- **Parâmetros**: Array de Date, função de filtro, Map dia→ horários

---

### `render(model: Array<Person>) → void`
**Renderiza modelo de dados no DOM**

**Funcionamento**:
1. Limpa `#out`
2. Para cada funcionário:
   - Cria elemento com nome
   - Para cada referência (mês):
     - Cria box com período
     - Para cada semana:
       - Cria tabela com horários
       - Adiciona botão "Copiar semana"
3. Insere no DOM

**Estrutura HTML**:
```html
<div class="person">
  <h2>João Silva</h2>
  <div class="ref">
    <div class="refhead">...</div>
    <div class="week">
      <div class="weekhead">
        <button>Copiar semana</button>
      </div>
      <table><!-- horários --></table>
    </div>
  </div>
</div>
```

---

### `copyToClipboard(text: string) → Promise`
**Copia texto para a área de transferência**

```javascript
await copyToClipboard("08:00\t12:00\n13:00\t18:00")
```

- **Tenta**: API Clipboard moderna
- **Fallback**: Textarea + execCommand (navegadores antigos)
- **Retorna**: Promise resolvida quando copiado

---

## 🚀 Controle de UI

### `setStatus(msg: string) → void`
**Atualiza mensagem de status**

```javascript
setStatus("Processando...")
setStatus() // Limpa
```

- **Alvo**: Elemento `#status`
- **Uso**: Feedback de operações longas

---

### `setLoading(on: boolean) → void`
**Exibe/oculta spinner de carregamento**

```javascript
setLoading(true)  // Mostra spinner, desabilita botão
setLoading(false) // Oculta spinner, habilita botão
```

- **Afeta**: Elementos `#loader` e `#btnProcess`

---

### `flashReady() → void`
**Mostra notificação "Pronto!" por 2.5 segundos**

```javascript
flashReady() // Exibe pill por 2.5s
```

- **Alvo**: Elemento `#pillReady`

---

### `simulateProgress(msTotal = 900) → Promise`
**Simula barra de progresso durante processamento**

```javascript
await simulateProgress(800) // Progress fake por 800ms
```

- **Atualiza**: Status a cada frame
- **Usa**: requestAnimationFrame

---

## 📊 Utilidades Adicionais

### `suppressDuplicateTimesInDay(arr: string[]) → string[]`
**Remove horários duplicados consecutivos**

```javascript
suppressDuplicateTimesInDay(["08:00", "08:00", "12:00", "12:00"])
// → ["08:00", "12:00"]
```

- **Lógica**: Remove pares duplicados (entrada=saída)
- **Preserva**: Horários válidos (entrada ≠ saída)

---

### `fmtExcelTime(hhmm: string) → string`
**Formata horário para export**

```javascript
fmtExcelTime("08:30") // → "08:30"
```

- **Atualmente**: Retorna valor tal qual
- **Uso**: Extensível para futuros formatos

---

## 🎯 Fluxo de Eventos

### Click em "Processar texto"
```
btnProcess.click
  ↓
setLoading(true)
  ↓
simulateProgress(800ms)
  ↓
buildDataModel() [ComEspera ou SemEspera]
  ↓
render(model)
  ↓
flashReady()
  ↓
setLoading(false)
```

### Click em "Copiar semana"
```
button.click
  ↓
toTSVForWeek() → TSV string
  ↓
copyToClipboard(tsv)
  ↓
setStatus("Copiado!")
  ↓
Habilita após 2.5s
```

---

## 📝 Constantes e Valores Fixos

| Constante | Valor | Uso |
|-----------|-------|-----|
| MAX_PAIR_MIN | 14 × 60 = 840 | Máximo minutos por jornada |
| CONTEXT_BACK | 1200 | Caracteres para buscar pares de horário |
| NEAR_PAIRS | 600 | Distância máxima para considerar par válido |
| RANGE_DAYS | ±35 | Dias de tolerância para período |
| FLASH_READY_MS | 2500 | Duração da notificação "Pronto!" |
| PROGRESS_MS | 800-900 | Tempo de progresso simulado |
