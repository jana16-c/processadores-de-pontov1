# Arquitetura do Processador de Ponto FERTRAN

## Visão Geral

O **Processador de Ponto FERTRAN** é uma aplicação web que converte espelhos de ponto (extraídos de PDFs) em dados estruturados e organizados por semanas. Suporta dois modos de processamento:

- **Com Espera**: Processa jornadas incluindo períodos de espera
- **Sem Espera**: Processa apenas jornadas de trabalho

## Arquitetura de Camadas

```
┌─────────────────────────────────────┐
│   INTERFACE (HTML/UI)               │
│  - Input: Textarea com texto       │
│  - Output: Tabelas por funcionário │
│  - Botões: Processar, Limpar, Copiar│
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   LÓGICA DE PROCESSAMENTO           │
│  - buildDataModelComEspera()        │
│  - buildDataModelSemEspera()        │
│  - extractJourneys()               │
│  - extractEmployeeName()           │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   UTILITÁRIOS (Data, String)        │
│  - parseBRDate(), fmtBRDate()      │
│  - toMinutes(), add24()            │
│  - normalizeSpaces()               │
│  - onlyHHMM()                      │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   RENDERIZAÇÃO & EXPORT             │
│  - buildWeeks()                    │
│  - toTSVForWeek()                  │
│  - render()                        │
│  - copyToClipboard()               │
└─────────────────────────────────────┘
```

## Fluxo de Dados

### 1. Entrada de Dados
```
Texto do Espelho de Ponto
    ↓
normalizeSpaces() → remove espaços/quebras extras
    ↓
splitByPeriods() → divide por períodos (Mês/Ano)
```

### 2. Processamento de Funcionários
```
Para cada período:
    ├─ extractEmployeeName() → extrai nome
    ├─ extractJourneys() → extrai jornadas
    └─ Para cada jornada:
        ├─ Valida datas e horários
        ├─ Ajusta horários noturnos (add24)
        ├─ Remove duplicatas
        └─ Agrupa por mês
```

### 3. Estrutura de Dados
```typescript
Model = [
  {
    name: "João Silva",
    refs: [
      {
        refKey: "03/2026",
        periodStart: "01/03/2026",
        periodEnd: "31/03/2026",
        days: Map {
          "01/03/2026": ["08:00", "12:00", "13:00", "18:00"],
          "02/03/2026": ["08:15", "12:00", "13:00", "17:45"]
        }
      }
    ]
  }
]
```

### 4. Renderização
```
DOM ← BuildWeeks() ← Agrupa dias em semanas
        ↓
    Renderiza tabelas por semana
        ↓
    Adiciona botão "Copiar semana" (TSV)
```

## Dois Motores Principais

### Motor 1: `buildDataModelComEspera()`
**Processa jornadas COM períodos de espera**

- Identifica mensagem: `INICIO DE ESPERA`
- Detecta função: `Jornada de Trabalho` + `Espera`
- Lógica especial: Se há espera, substitui horários de saída

### Motor 2: `buildDataModelSemEspera()`
**Processa apenas jornadas DE TRABALHO**

- Ignora períodos de espera
- Mantém apenas registros com `Jornada de Trabalho`
- Remove duplicatas simples

## Decisões de Design

| Aspecto | Decisão | Motivo |
|---------|---------|--------|
| **Data Format** | DD/MM/YYYY | Padrão brasileiro |
| **Hora Format** | HH:MM (sem segundos) | Leitura em Excel |
| **Timezone** | Local (sem ajuste) | Respeita horários originais |
| **Duplicatas** | Removidas automáticamente | Evita erros de entrada dupla |
| **Horários Noturnos** | add24() para próximo dia | Jornadas que cruzam meia-noite |
| **Validação** | Máximo 14h de diferença | Rejeita registros inválidos |
| **Export** | TSV (Tab-Separated) | Compatível com Excel |

## Padrões Regex Utilizados

```javascript
// Período: "Período: 01/01/2026 à 31/01/2026"
/Per[ií]odo:\s*(\d{2}\/\d{2}\/\d{4})(?:\s+\d{2}:\d{2}:\d{2})?\s*(?:à|-)\s*(\d{2}\/\d{2}\/\d{4})/gi

// Funcionário: "Funcionário: João Silva"
/Funcion[aá]rio(?:\s*\/\s*Motorista)?\s*:\s*([\s\S]+?)(?:\s*CPF\s*:|$)/mi

// Função/Tipo: "Função: Jornada de Trabalho  Tipo: NORMAL"
/Função:?\s*([^\n\r]+?)\s+(?:Macro\s+Mensagem:|Tipo)\s*:?\s*([^\n\r]+)/g

// Data/Hora: "01/01/2026 08:30:45"
/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/g
```

## Validações Importantes

1. **Datas Subsequentes**: Jornada começa e termina em dias diferentes?
   - Se sim e próximo dia: adiciona +24h ao horário de saída

2. **Duração Máxima**: Diferença > 14h (exceto cruzamento de dia)?
   - Se sim: descarta a jornada (registro inválido)

3. **Duplicatas**: Mesmo horário entrada = saída no mesmo dia?
   - Se sim: remove toda a entrada do dia

4. **Duplicatas Duplicadas**: Dois horários iguais em sequência?
   - Se sim: remove ambos

## Casos de Uso Tratados

- ✅ Jornadas normais (08:00-18:00)
- ✅ Jornadas noturnas que cruzam meia-noite
- ✅ Períodos de espera entre jornadas
- ✅ Múltiplos períodos (meses diferentes)
- ✅ Múltiplos funcionários no mesmo documento
- ✅ Remoção automática de duplicatas

## Limitações Conhecidas

- ⚠️ Assume formato específico do PDF (Fertran)
- ⚠️ Máximo 14h por jornada (validação)
- ⚠️ Não suporta jornadas com mais de 2 períodos (entrada/saída)
- ⚠️ Rejeita se períodos estão fora do intervalo esperado
