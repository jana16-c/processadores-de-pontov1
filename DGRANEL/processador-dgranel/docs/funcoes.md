# Documentação de Funções - Processador de Ponto D'Granel

## Sumário de Funções

### Parser de Texto (Extração de Dados)
- `normalizeSpaces(s)` - Normaliza espaços em branco
- `splitByPeriods(text)` - Divide texto em períodos
- `extractEmployeeName(slice)` - Extrai nome do funcionário
- `extractJourneys(slice, periodStart, periodEnd)` - Extrai jornadas de trabalho

### Utilities de Data
- `parseBRDate(dmy)` - Interpreta data no formato DD/MM/YYYY
- `fmtBRDate(dt)` - Formata data como DD/MM/YYYY
- `addDays(dt, n)` - Adiciona dias a uma data
- `mondayOf(dt)` - Retorna segunda-feira inicial da semana

### Utilities de Horário
- `onlyHHMM(hhmmss)` - Extrai HH:MM de HH:MM:SS
- `toMinutes(hhmm)` - Converte HH:MM para minutos
- `add24(hhmm)` - Adiciona 24 horas ao horário (crossing day)
- `isNextDay(d1, d2)` - Verifica se d2 é dia seguinte de d1

### Domain Logic (Processamento)
- `buildDataModelComEspera(rawText)` - Processa com períodos de espera
- `buildDataModelSemEspera(rawText)` - Processa sem períodos de espera
- `suppressDuplicateTimesInDay(arr)` - Remove horários duplicados

### UI Rendering
- `render(model)` - Renderiza modelo em HTML
- `buildWeeks(periodStart, periodEnd)` - Organiza dias em semanas
- `toTSVForWeek(weekDays, inRangeFn, dayToTimes, weekLabel)` - Formata para TSV
- `escapeHtml(s)` - Sanitiza HTML
- `copyToClipboard(text)` - Copia texto para clipboard

### UI Events
- `updateMode()` - Alterna modo Com/Sem Espera
- `setStatus(msg)` - Define mensagem de status
- `setLoading(on)` - Ativa/desativa indicador de carregamento
- `flashReady()` - Exibe "Pronto!" por 2.5s
- `simulateProgress(msTotal)` - Simula barra de progresso
- `sleep(ms)` - Delay assíncrono

---

## Documentação Detalhada

### 1. `normalizeSpaces(s)`
**Objetivo**: Normalizar todos os tipos de espaços em branco do texto

**Parâmetros**:
- `s` (string) - Texto a normalizar

**Retorna**: string com espaços padronizados

**Detalhes**:
- Converte `\r\n` → `\n`
- Converte `\r` → `\n`
- Remove tabs, form feeds, vertical tabs
- Converte múltiplos espaços em um único espaço
- **Exemplo**: `"texto  123\t456"` → `"texto 123 456"`

```javascript
function normalizeSpaces(s){
  return (s||"").replace(/\r\n/g,"\n").replace(/\r/g,"\n")
    .replace(/[\t\f\v]+/g," ").replace(/ +/g," ");
}
```

---

### 2. `splitByPeriods(text)`
**Objetivo**: Dividir texto em seções por períodos de data

**Parâmetros**:
- `text` (string) - Texto completo do espelho de ponto

**Retorna**: Array de `{ periodStart, periodEnd, slice }`

**Detalhes**:
- Procura por padrão: `Período: DD/MM/YYYY HH:MM:SS à DD/MM/YYYY HH:MM:SS`
- Cria sections contendo o texto entre períodos consecutivos
- **Exemplo**:
```
"Período: 01/03/2026 00:00:00 à 07/03/2026 23:59:59
 dados...
 Período: 08/03/2026 00:00:00 à 14/03/2026 23:59:59
 mais dados..."

// Retorna:
[
  { periodStart: "01/03/2026", periodEnd: "07/03/2026", slice: "Período:... dados..." },
  { periodStart: "08/03/2026", periodEnd: "14/03/2026", slice: "Período:... mais dados..." }
]
```

---

### 3. `extractEmployeeName(slice)`
**Objetivo**: Extrair nome do funcionário da seção de texto

**Parâmetros**:
- `slice` (string) - Seção de texto de um período

**Retorna**: string com nome ou "FUNCIONÁRIO NÃO IDENTIFICADO"

**Detalhes**:
- Procura por padrão: `Funcion(á)rio / Motorista: [NOME] [número]`
- Nome é sequência de letras maiúsculas, acentos e espaços
- Remove espaços duplos do resultado
- **Exemplo**: `"Funcionário / Motorista: JOÃO MARIA SILVA 2023"` → `"JOÃO MARIA SILVA"`

```javascript
const re = /Funcion[aá]rio\s*\/\s*Motorista:\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+?)\s+\d/;
const m = re.exec(slice);
if(m) return m[1].trim().replace(/\s+/g," ");
return "FUNCIONÁRIO NÃO IDENTIFICADO";
```

---

### 4. `extractJourneys(slice, periodStart, periodEnd)`
**Objetivo**: Extrair todas as jornadas e períodos de espera do texto

**Parâmetros**:
- `slice` (string) - Seção de texto contendo jornadas
- `periodStart` (string) - Data inicial do período (DD/MM/YYYY)
- `periodEnd` (string) - Data final do período (DD/MM/YYYY)

**Retorna**: Array de `{ startDate, startTime, endDate, endTime, func, msg }`

**Detalhes**:
- Procura padrão: `Função: [texto] Macro Mensagem: [texto]`
- Busca datas/horas válidas (~1200 chars antes da função)
- Filtra apenas pares dentro do período (±2 dias)
- Valida duração máxima de 14 horas (filtra erros)
- **Exemplo**:
```javascript
{
  startDate: "01/03/2026",
  startTime: "08:00:15",
  endDate: "01/03/2026",
  endTime: "12:00:45",
  func: "Jornada de Trabalho",
  msg: "SAÍDA DO LOCAL DE TRABALHO"
}
```

---

### 5. `parseBRDate(dmy)`
**Objetivo**: Converter DD/MM/YYYY em objeto Date

**Parâmetros**:
- `dmy` (string) - Data em formato DD/MM/YYYY

**Retorna**: Date object ou null se formato inválido

**Detalhes**:
- Valida exatamente 10 caracteres (DD/MM/YYYY)
- Ajusta mês (entrada 1-12, Date usa 0-11)
- **Exemplo**: `"25/12/2025"` → `Date(2025, 11, 25)`

```javascript
function parseBRDate(dmy){
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy);
  if(!m) return null;
  const dd = parseInt(m[1],10), mm = parseInt(m[2],10)-1, yy = parseInt(m[3],10);
  return new Date(yy, mm, dd);
}
```

---

### 6. `fmtBRDate(dt)`
**Objetivo**: Converter Date para formato DD/MM/YYYY

**Parâmetros**:
- `dt` (Date) - Objeto de data

**Retorna**: string no formato DD/MM/YYYY

**Exemplo**: `Date(2025, 11, 25)` → `"25/12/2025"`

---

### 7. `addDays(dt, n)`
**Objetivo**: Adicionar n dias a uma data

**Parâmetros**:
- `dt` (Date) - Data base
- `n` (number) - Dias a adicionar (pode ser negativo)

**Retorna**: Nova Date object

**Nota**: Cria nova instância, não modifica original

```javascript
function addDays(dt, n){
  const d = new Date(dt.getTime());
  d.setDate(d.getDate() + n);
  return d;
}
```

---

### 8. `mondayOf(dt)`
**Objetivo**: Retornar segunda-feira inicial da semana contendo a data

**Parâmetros**:
- `dt` (Date) - Data qualquer da semana

**Retorna**: Date da segunda-feira (getDay() === 1)

**Detalhes**:
- Domingo (0) → segunda anterior (-6 dias)
- Segunda (1) → segunda atual (0 dias)
- Terça a Sábado (2-6) → segunda anterior (diff = 1-7)
- **Exemplo**: `"05/03/2026"` (quarta) → `"02/03/2026"` (segunda)

```javascript
function mondayOf(dt){
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const day = d.getDay(); 
  const diff = (day === 0 ? -6 : 1 - day); 
  d.setDate(d.getDate() + diff);
  return d;
}
```

---

### 9. `onlyHHMM(hhmmss)`
**Objetivo**: Extrair HH:MM de HH:MM:SS

**Parâmetros**:
- `hhmmss` (string) - Horário com segundos

**Retorna**: string HH:MM ou "" se inválido

**Exemplo**: `"14:30:45"` → `"14:30"`

```javascript
function onlyHHMM(hhmmss){
  const m = /^([0-9]{2}):([0-9]{2})/.exec(hhmmss || "");
  return m ? `${m[1]}:${m[2]}` : "";
}
```

---

### 10. `toMinutes(hhmm)`
**Objetivo**: Converter HH:MM para minutos desde meia-noite

**Parâmetros**:
- `hhmm` (string) - Horário em HH:MM

**Retorna**: number (minutos) ou null se inválido

**Exemplo**: 
- `"08:30"` → 510 (8*60 + 30)
- `"23:45"` → 1425

---

### 11. `add24(hhmm)`
**Objetivo**: Adicionar 24 horas a um horário (para cruzamento de dias)

**Parâmetros**:
- `hhmm` (string) - Horário em HH:MM

**Retorna**: string com hora aumentada em 24 (ex: "17:00" → "41:00")

**Uso**: Quando saída está em dia diferente e é menor que entrada
```javascript
// 22:00 (noite) → 02:00 (madrugada) = precisa add24
outHHMM = add24(outHHMM) // "02:00" → "26:00"
```

---

### 12. `suppressDuplicateTimesInDay(arr)`
**Objetivo**: Remover pares duplicados de horários no mesmo dia

**Parâmetros**:
- `arr` (Array) - Array de strings HH:MM

**Retorna**: Array com duplicatas removidas

**Detalhes**:
- Remove pares (entrada+saída iguais): ["08:00", "08:00"] → []
- Remove sequências duplicadas
- Exemplo: `["08:00", "08:00", "12:00", "17:00"]` → `["12:00", "17:00"]`

---

### 13. `isNextDay(d1, d2)`
**Objetivo**: Verificar se d2 é exatamente o dia seguinte de d1

**Parâmetros**:
- `d1` (string) - Data em DD/MM/YYYY
- `d2` (string) - Data em DD/MM/YYYY

**Retorna**: boolean

**Detalhes**:
- Valida ambas datas
- Calcula diferença em milissegundos por dia (86400000)
- Retorna true apenas se diferença = 1 dia

---

### 14. `buildDataModelComEspera(rawText)`
**Objetivo**: Processar espelho de ponto INCLUINDO períodos de espera

**Parâmetros**:
- `rawText` (string) - Texto bruto do PDF

**Retorna**: Array de pessoas com suas referências

**Detalhes do Processamento**:
1. Normaliza espaços e quebras de linha
2. Divide por períodos usando `splitByPeriods()`
3. Para cada período:
   - Extrai nome do funcionário
   - Identifica jornadas e esperas
   - Cria Map hierárquico: pessoa → referência → dias
4. **Lógica especial**:
   - Se encontra "INICIO DE ESPERA" dentro de jornada, substitui saída
   - Valida período máximo de 14 horas
   - Remove duplicatas e períodos inválidos

**Estrutura de Saída**:
```javascript
[
  {
    name: "JOÃO SILVA",
    refs: [
      {
        refKey: "03/2026",
        periodStart: "01/03/2026",
        periodEnd: "31/03/2026",
        days: Map { "01/03/2026" => ["08:00", "17:00"], ... }
      }
    ]
  }
]
```

---

### 15. `buildDataModelSemEspera(rawText)`
**Objetivo**: Processar espelho de ponto IGNORANDO períodos de espera

**Parâmetros**:
- `rawText` (string) - Texto bruto do PDF

**Retorna**: Array de pessoas com suas referências

**Detalhes do Processamento**:
1. Similar a `buildDataModelComEspera()`
2. **Diferença principal**: Ignora completamente `isEspera === true`
3. Mantém apenas jornadas efetivas de trabalho
4. Usa `suppressDuplicateTimesInDay()` ao invés de lógica de substituição

---

### 16. `render(model)`
**Objetivo**: Renderizar modelo em HTML tabular com semanas

**Parâmetros**:
- `model` (Array) - Array retornado por `buildDataModel()`

**Detalhes**:
- Verifica se modelo está vazio
- Para cada pessoa:
  - Cria seção com nome
  - Para cada referência:
    - Agrupa dias em semanas
    - Cria tabela com horários
    - Botão para copiar semana como TSV

**HTML Gerado**:
```html
<div class="person">
  <h2>JOÃO SILVA</h2>
  <div class="ref">
    <div class="refhead">Referência: 03/2026</div>
    <div class="weeks">
      <div class="week">
        <div class="weekhead">Semana 01/03/2026 a 07/03/2026</div>
        <table>... horários ...</table>
      </div>
    </div>
  </div>
</div>
```

---

### 17. `buildWeeks(periodStart, periodEnd)`
**Objetivo**: Organizar dias em semanas com segunda-feira como início

**Parâmetros**:
- `periodStart` (string) - DD/MM/YYYY
- `periodEnd` (string) - DD/MM/YYYY

**Retorna**: Array de `{ mon: Date, days: Date[] }` ordenado

**Detalhes**:
- Cria array de datas entre período
- Agrupa por segunda-feira inicial usando `mondayOf()`
- Cada semana contém 7 dias (2ª a domingo)
- **Exemplo para período 01/03 a 07/03/2026**:
```javascript
[
  {
    mon: Date(2026, 2, 2), // 02/03/2026 (segunda)
    days: [Date, Date, ..., Date] // 7 dias
  }
]
```

---

### 18. `toTSVForWeek(weekDays, inRangeFn, dayToTimes, weekLabel)`
**Objetivo**: Formatar semana em formato TSV para Excel

**Parâmetros**:
- `weekDays` (Array) - Array de dates da semana
- `inRangeFn` (Function) - Callback para filtrar dias válidos
- `dayToTimes` (Map) - Map de data → Array de horários
- `weekLabel` (string) - Label da semana (opcional)

**Retorna**: string no formato TSV (tab-separated values)

**Exemplo**:
```
Semana	Semana 01/03/2026 a 07/03/2026
01/03/2026	08:00	12:00	13:00	17:00
02/03/2026	08:30	12:30	13:30	17:30
```

**Uso**: Copiar direto para Excel mantendo formatação tabular

---

### 19. `escapeHtml(s)`
**Objetivo**: Sanitizar string para uso seguro em HTML

**Parâmetros**:
- `s` (string) - Texto a escapar

**Retorna**: string com caracteres HTML escapados

**Conversões**:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#39;`

---

### 20. `copyToClipboard(text)`
**Objetivo**: Copiar texto para área de transferência (async)

**Parâmetros**:
- `text` (string) - Texto a copiar

**Retorna**: Promise<void>

**Detalhes**:
- Usa Clipboard API se disponível (navegadores modernos)
- Fallback: cria textarea temporário e usa `execCommand("copy")`
- Remove elemento do DOM após uso

---

### 21. `updateMode()`
**Objetivo**: Alterna título e modo de processamento

**Detalhes**:
- Lê valor do radio button selecionado
- Atualiza título da página
- Atualiza título da janela (browser tab)
- **Títulos**:
  - "Com Espera": Inclui períodos de espera
  - "Sem Espera": Apenas jornadas efetivas

---

### 22. `setStatus(msg)`
**Objetivo**: Exibir mensagem de status

**Detalhes**:
- Define `elStatus.textContent`
- Se msg vazio, limpa status anterior
- Usado para feedback: "Carregando... 75%", "Copiado para..."

---

### 23. `setLoading(on)`
**Objetivo**: Ativar/desativar indicador de carregamento

**Detalhes**:
- `on=true`: Mostra spinner animado, desabilita botão
- `on=false`: Esconde spinner, reabilita botão

---

### 24. `flashReady()`
**Objetivo**: Exibir "Pronto!" brevemente

**Detalhes**:
- Mostra pill sinalizado
- Desaparece após 2.5 segundos
- Indica sucesso do processamento

---

### 25. `simulateProgress(msTotal)`
**Objetivo**: Simular barra de progresso para melhor UX

**Parâmetros**:
- `msTotal` (number) - Duração em ms (padrão 900)

**Retorna**: Promise que resolve quando tempo termina

**Detalhes**:
- Atualiza status a cada frame: "Carregando... 0%"
- Nunca atinge 100% antes de resolver
- Melhora percepção de responsividade

---

### 26. `sleep(ms)`
**Objetivo**: Delay assíncrono

**Parâmetros**:
- `ms` (number) - Milissegundos

**Retorna**: Promise que resolve após delay

**Uso**: `await sleep(1000)` para aguardar 1 segundo

---

### 27. Event Listeners

#### `btnProcess.click()`
**Fluxo**:
1. Valida se textarea tem texto
2. Ativa modo loading
3. Simula progresso por 800ms
4. Chama buildDataModel baseado no modo
5. Renderiza resultado
6. Mostra "Pronto!"

#### `btnClear.click()`
**Ação**: Limpa textarea, output e status

#### `document.querySelector('button').click()` (Copiar Semana)
**Fluxo**:
1. Gera TSV da semana
2. Copia para clipboard
3. Muda texto do botão para "Copiado"
4. Desabilita botão por 2.5s
5. Restaura estado original
