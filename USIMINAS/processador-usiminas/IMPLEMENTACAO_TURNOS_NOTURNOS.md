# 🌙 Implementação: Detecção e Ajuste de Turnos Noturnos

## Resumo das Mudanças

Implementei a capacidade do sistema de **detectar e processar automaticamente turnos noturnos que cruzam a meia-noite**, movendo as batidas de madrugada para o dia seguinte com representação +24h de horário.

## 📋 Problema Identificado

**Caso do dia 10/04/2018 (Terça-feira):**
- Turno planejado: 22:40 - 06:50 (noturno, começa à noite e termina de madrugada)
- Batidas registradas: 02:58, 03:59, 06:52, 22:35
- **Problema:** Batidas de madrugada (02:58, 03:59, 06:52) estavam sendo mantidas no dia 10, quando logicamente pertencem ao dia 11 (próxima madrugada)

## 🔧 Solução Implementada

### 1. Estensão da Estrutura de Dados (parserInput.js)

Adicionei campos ao typedef `DayEntry`:
```javascript
@typedef {{
  data: Date, 
  times: string[], 
  isOffDay: boolean, 
  rawLine: string,
  plannedStart: string|null,    // ← NOVO
  plannedEnd: string|null       // ← NOVO
}} DayEntry
```

**Benefício:** Preserva informações de turno planejado para análise posterior.

### 2. Extração de Horários Planejados (parserInput.js)

Modificado o `parseSection()` para capturar os dois primeiros horários (entrada e saída planejadas):
```javascript
let plannedStart = null;
let plannedEnd = null;

if (temHorarioPlanejado) {
  plannedStart = allTimes[0] || null;
  plannedEnd = allTimes[1] || null;
  realTimes = allTimes.slice(2);
}
```

Esses valores são armazenados na estrutura de cada dia.

### 3. Detecção de Turno Noturno (adjustShifts.js)

Nova função `isNightShift()`:
```javascript
function isNightShift(plannedStart, plannedEnd) {
  if (!plannedStart || !plannedEnd) return false;
  const startMin = toMin(plannedStart);
  const endMin = toMin(plannedEnd);
  // Turno noturno: quando a hora de início > hora de fim (cruza meia-noite)
  return startMin > endMin;
}
```

**Lógica:** Um turno é noturno quando hora_início > hora_fim (ex: 22:40 > 06:50)

### 4. Processamento de Batidas Noturnas (adjustShifts.js) - LÓGICA INVERTIDA

Nova função `procesNightShiftTimes()`:
```javascript
function procesNightShiftTimes(timeline) {
  // Itera a partir do SEGUNDO dia (i=1)
  for (let i = 1; i < timeline.length; i++) {
    const yesterday = timeline[i - 1];
    const today = timeline[i];

    // Verifica se o dia ANTERIOR teve turno noturno
    const yesterdayIsNight = isNightShift(yesterday.plannedStart, yesterday.plannedEnd);
    if (!yesterdayIsNight || yesterday.isOffDay) continue;

    // Verifica se os dias são consecutivos
    if (!isNextCalendarDay(yesterday.data, today.data)) continue;

    // Separa as batidas de HOJE em madrugada (< 12h) e resto
    const morningTimes = [];   // Madrugadas que fecham turno de ontem
    const otherTimes = [];     // Resto (noturnas de hoje)

    for (const time of (today.times || [])) {
      const hourOfDay = Math.floor(toMin(time) / 60);
      
      if (hourOfDay < 12) {
        // Madrugada (< 12:00) → pertence a ONTEM
        morningTimes.push(time);
      } else {
        // Noite (>= 12:00) → pertence a HOJE
        otherTimes.push(time);
      }
    }

    // Move as madrugadas para o DIA ANTERIOR com +24h
    if (morningTimes.length > 0) {
      // Adiciona ao dia anterior
      const movedTimes = morningTimes.map(t => add24ToTime(t));
      yesterday.times = [...(yesterday.times || []), ...movedTimes];
      yesterday.times.sort((a, b) => toMin(a) - toMin(b));
      
      // Remove as madrugadas de hoje
      today.times = otherTimes;
    }
  }
}
```

**Fluxo (CORRIGIDO):**
1. Itera do 2º dia em diante (yesterday/today)
2. Detecta se YESTERDAY teve turno noturno
3. Para cada batida de TODAY, determina se é madrugada (hora < 12)
4. Madrugadas são movidas PARA YESTERDAY com +24h (fecham o turno de ontem)
5. Noites (>= 12h) permanecem em TODAY (iniciam novo turno)

### 5. Integração na Função Principal (adjustShifts.js)

Adicionada chamada a `procesNightShiftTimes()` como **primeira passada**:
```javascript
export function adjustShifts(timeline) {
  // ... inicialização ...

  // PRIMEIRA PASSADA: Processa turnos noturnos
  procesNightShiftTimes(timeline);

  // SEGUNDA PASSADA: Ajusta turnos abertos (ímpar de batidas)
  // ... lógica existente ...
}
```

## 📊 Resultado Esperado

**Dia 09/04/2018:**
- **Antes:** [22:36]
- **Depois:** [22:36, 26:58, 27:59, 30:52]
  - 22:36 (de 09/04: batida noturna)
  - 26:58, 27:59, 30:52 = madrugadas de 10/04 com +24h

**Dia 10/04/2018:**
- **Antes:** [02:58, 03:59, 06:52, 22:35]
- **Depois:** [22:35]
  - 02:58, 03:59, 06:52 foram movidas para 09/04 (fecham turno anterior)
  - 22:35 fica (entrada do novo turno)

**Dia 11/04/2018:**
- **Antes:** [02:57, 03:58, 06:45, 22:36]
- **Depois:** [22:36, 26:57, 27:58, 30:45]
  - 22:36 (de 11/04: batida noturna)
  - 26:57, 27:58, 30:45 = madrugadas de 12/04 com +24h

## 🐛 Correção Realizada (v2)

**Problema na v1:** A lógica estava invertida - movia madrugadas PARA o próximo dia, quando deveria ter movido PARA o dia anterior.

**Solução na v2:** 
- Inverteu a iteração: agora começa do 2º dia (i=1) comparando com o anterior
- Checa se o dia ANTERIOR tem turno noturno
- Move as madrugadas de HOJE para ONTEM (não para amanhã)
- Resultado: turno noturno fica com todas suas batidas (entrada noturna + madrugada de fechamento)

**Exemplo da Correção:**
```
v1 (ERRADO):
09 → [22:36] + nada
10 → [02:58, 03:59, 06:52, 22:35] movia para 11

v2 (CORRETO):
09 → [22:36, 26:58, 27:59, 30:52] recebe madrugadas de 10
10 → [22:35] mantém só batidas noturnas
```

## 🎯 Vantagens

1. ✅ **Automático:** Detecta turnos noturnos sem intervenção
2. ✅ **Preciso:** Usa informação de turno planejado para decisão
3. ✅ **Reversível:** Batidas mostram a hora original +24h
4. ✅ **Compatível:** Mantém lógica de ajuste de turnos abertos (ímpar)
5. ✅ **Robusto:** Funciona mesmo se parser já extrai dados em ordem errada

## 🔄 Fluxo Completo Atualizado

```
Texto PDF
   ↓
parserInput() [APRIMORADO]
  - Extrai plannedStart, plannedEnd
   ↓
adjustShifts() [APRIMORADO]
  PASSADA 1: procesNightShiftTimes()
    - Para cada dia (começando no dia 2)
    - Se dia anterior teve turno noturno
    - Puxa as MADRUGADAS de hoje (< 12h) para ONTEM com +24h
    - Remove essas madrugadas de hoje
  PASSADA 2: Ajusta turnos abertos (par/ímpar)
   ↓
renderPerson()
  - Renderiza timeline corrigida
   ↓
Saída TSV/HTML
```

**Exemplo de Transformação:**
```
ANTES:
09/04: [22:36]
10/04: [02:58, 03:59, 06:52, 22:35]  ← Madrugadas
11/04: [02:57, 03:58, 06:45, 22:36]
12/04: [03:56, 05:40, 06:45]

DEPOIS:
09/04: [22:36, 26:58, 27:59, 30:52]  ← Madrugadas de 10 com +24h
10/04: [22:35]                        ← Madrugadas removidas
11/04: [22:36, 26:57, 27:58, 30:45]  ← Madrugadas de 12 com +24h
12/04: [03:56, 05:40, 06:45]         ← Madrugadas removidas
```

## 📝 Arquivos Modificados

1. **src/parser/parserInput.js**
   - Estendeu typedef DayEntry
   - Extrair plannedStart, plannedEnd

2. **src/domain/adjustShifts.js**
   - Adicionou isNightShift()
   - Adicionou procesNightShiftTimes()
   - Integrou nova passada ao adjustShifts()

## ✅ Testes

Arquivo de teste criado: `test-night-shift.html`
- Pode ser aberto no navegador
- Simula o caso do dia 10/04/2018
- Valida movimento correto de batidas

## 🚀 Próximos Passos (Opcional)

- [ ] Adicionar suporte a "super-noturnos" (múltiplas madrugadas separadas)
- [ ] Permitir configuração do limiar de hora (atualmente 12:00)
- [ ] Adicionar logs de debug para rastrear movimentos
- [ ] Testes unitários completos
