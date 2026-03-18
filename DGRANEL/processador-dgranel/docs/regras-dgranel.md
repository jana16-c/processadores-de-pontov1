# Regras e Padrões - Processador de Ponto D'Granel

## Identificação de Jornadas

O sistema identifica jornadas baseado em padrões de texto:

### Padrões de Função

| Padrão | Identificação | Ação |
|--------|--------------|------|
| `/Jornada\s+de\s+Trabalho/i` | Jornada efetiva | Adiciona entrada + saída |
| `/Espera/i` | Período de espera | Varia por modo |
| `isJornada && /INICIO\s+DE\s+ESPERA/i` | Espera dentro de jornada | Substitui saída (Com Espera) |

### Estrutura de Período

Cada período contém:
```
Período: DD/MM/YYYY HH:MM:SS à DD/MM/YYYY HH:MM:SS
Funcionário / Motorista: [NOME]
... (múltiplas linhas)
Função: [descrição] Macro Mensagem: [mensagem]
```

## Processamento de Datas

### Padrão de Data
- **Entrada**: `DD/MM/YYYY HH:MM:SS`
- **Saída interna**: Objeto `Date` JavaScript
- **Saída visual**: `DD/MM/YYYY` (apenas data)
- **Horário visual**: `HH:MM` (sem segundos)

### Período Válido
- Intervalo: **±2 dias** do período oficial
- Justificativa: Tolerância para erros de OCR/extração
- Filtro: Se período oficial é 01/03 a 31/03, aceita 27/02 a 02/04

### Duração Máxima
- **Limite**: 14 horas (840 minutos)
- **Justificativa**: Detecta erros de extração de horários
- **Aplicação**: Períodos que cruzam dias e ultrapassam 14h são descartados

### Cruzamento de Dia
Quando entrada e saída estão em dias diferentes:
```
Se startDate ≠ endDate AND isNextDay(startDate, endDate):
  Se endTime < startTime (em minutos):
    endTime = add24(endTime)  // "02:00" → "26:00"
```

**Exemplo**: 
- Entrada: 22:00 (terça)
- Saída: 02:00 (quarta)
- Calcula-se como: 22:00 a 26:00 (4 horas) ✓

## Modos de Processamento

### Modo "Com Espera" (com_espera)

**Objetivo**: Incluir períodos de espera na jornada total

**Processamento**:
1. Identifica jornadas normais: `[entrada, saída]`
2. Identifica períodos de espera
3. Se "INICIO DE ESPERA" dentro de jornada:
   - Substitui o ponto de saída anterior pelo ponto de espera
4. Se espera isolada:
   - Ignora (precisaria de jornada anterior)

**Exemplo**:
```
08:00 - Entrada
12:00 - Saída para almoço
13:00 - Entrada retorno
16:00 - Início de espera (saída anterior = 16:00)
17:00 - Saída de espera

Resultado: [08:00, 12:00, 13:00, 17:00]
(A saída de espera 17:00 substitui o 16:00)
```

**Apropriado para**:
- Cálculo de horas de trabalho + espera de cliente
- Relatórios que diferenciam trabalho e espera
- Análise de produtividade bruta

### Modo "Sem Espera" (sem_espera)

**Objetivo**: Considerar apenas jornadas efetivas de trabalho

**Processamento**:
1. Procura apenas por: `Jornada de Trabalho`
2. Ignora completamente qualquer "Espera"
3. Remove duplicatas usando `suppressDuplicateTimesInDay()`
4. Mantém pares entrada/saída consecutivos

**Exemplo**:
```
08:00 - Entrada
12:00 - Saída para almoço
13:00 - Entrada retorno
16:00 - Espera (IGNORADA)
17:00 - Saída

Resultado: [08:00, 12:00, 13:00, 17:00]
(Espera é completamente ignorada)
```

**Apropriado para**:
- Cálculo de horas efetivas apenas
- Conformidade com metas de horas lídas
- Controle disciplinar

## Validações Aplicadas

### 1. Período Mínimo
**Regra**: Array de horários deve ter mínimo 2 elementos
```javascript
if (pairs.length < 2) continue;  // Descarta
```

### 2. Duplicatas no Dia
**Problema**: Mesmo horário aparece múltiplas vezes
```javascript
// Antes: ["08:00", "08:00", "12:00", "12:00"]
suppressDuplicateTimesInDay()
// Depois: ["12:00"]  (remove pares iguais)
```

### 3. Entrada = Saída
**Problema**: Período onde entrada e saída são idênticas
```javascript
if (arr.length === 2 && arr[0] === arr[1]) {
  refObj.days.set(d, []);  // Limpa dia inteiro
}
```

### 4. Filtro de Range de Datas
```javascript
const rangeStart = periodStart - 2 dias
const rangeEnd = periodEnd + 2 dias

pairs = pairs.filter(p => rangeStart ≤ p.date ≤ rangeEnd)
```

## Estrutura de Referência (Mês)

**Formato de Chave**: `MM/YYYY`
- **MM**: Mês com 2 dígitos (01-12)
- **YYYY**: Ano com 4 dígitos
- **Exemplo**: "03/2026" para março de 2026

**Período Associado**:
- Pode abranger múltiplos meses se documento contém dados além do mês de referência
- Exemplo: Período oficial 27/02/2026 a 02/03/2026 → refKey = "03/2026" (data fim)

## Organização de Semanas

### Definição ISO
- Segunda-feira (Monday) = 1º dia da semana
- Domingo = 7º dia da semana

### Função mondayOf()
Retorna segunda-feira inicial da semana:
- Entrada: qualquer date
- Saída: date da segunda-feira da mesma semana

### Exemplo
```
Período: 01/03 a 07/03/2026

01/03 (sábado)  ─┐
02/03 (domingo) ─┤ Semana 1
03/03 (segunda) ─┤
04/03 (terça)   ─┤
05/03 (quarta)  ─┤
06/03 (quinta)  ─┤
07/03 (sexta)   ─┘

MondayOf(01/03) = 02/03 (ISO: 02/03 é segunda?)
→ Semana: 02/03 a 08/03
  (segunda 02 a domingo 08)
```

## Exportação para Excel (TSV)

### Formato TSV (Tab-Separated Values)
```
Semana	Semana 01/03/2026 a 07/03/2026
01/03/2026	08:00	12:00	13:00	17:00
02/03/2026	08:30	12:30	13:30	17:30
03/03/2026			
04/03/2026	09:00	13:00	14:00	18:00
```

### Características
- Delimitador: Tabulação (`\t`)
- Quebra de linha: `\n`
- Pares de horários: Entrada e saída em colunas consecutivas
- Dias sem jornada: Linhas vazias (exceto primeira coluna)
- Compatível com: Ctrl+V direto no Excel

### Cópia Automática
```javascript
await copyToClipboard(tsvCopy);
// Colado no Excel mantém formatação tabular
```

## Limpeza de Espaços

### normalizeSpaces()
Converte múltiplos tipos de quebra de linha e espaços:

```javascript
"texto\r\n123\r456 789\t\t900"
↓ normalizeSpaces()
"texto 123 456 789 900"
```

**Conversões**:
- `\r\n` (Windows) → `\n` (Universal)
- Tabs `\t` → Espaço
- Form feeds `\f`, vertical tabs `\v` → Espaço
- Múltiplos espaços → Um único espaço

## Tratamento de Erros

### Casos Não Tratados (Descartados)
1. Período sem funcionário identificado → "FUNCIONÁRIO NÃO IDENTIFICADO"
2. Período sem jornadas → Ignorado completamente
3. Período sem horários válidos → Ignorado
4. Jornada > 14 horas → Descartada
5. Horário malformado → Ignorado

### Feedback ao Usuário
- Se nenhum dado processado: "Nenhum período/jornada encontrado"
- Se erro durante processamento: "Não consegui interpretar o texto"
- Se sucesso: "Pronto!" (flash por 2.5s)

## Exemplos Práticos

### Cenário 1: Dia Normal
```
Período: 01/03/2026 00:00:00 à 01/03/2026 23:59:59
Funcionário/Motorista: JOÃO SILVA
Função: Jornada de Trabalho
Macro Mensagem: ENTRADA NO LOCAL DE TRABALHO
01/03/2026 08:00:15

Função: Jornada de Trabalho
Macro Mensagem: SAÍDA DO LOCAL DE TRABALHO
01/03/2026 12:00:45

Função: Jornada de Trabalho
Macro Mensagem: ENTRADA NO LOCAL DE TRABALHO
01/03/2026 13:00:30

Função: Jornada de Trabalho
Macro Mensagem: SAÍDA DO LOCAL DE TRABALHO
01/03/2026 17:30:00

Resultado: [08:00, 12:00, 13:00, 17:30]
```

### Cenário 2: Com Espera (Modo Com Espera)
```
Período: 02/03/2026 00:00:00 à 02/03/2026 23:59:59
Funcionário/Motorista: MARIA SANTOS
Função: Jornada de Trabalho
Macro Mensagem: ENTRADA
02/03/2026 09:00:00

Função: Jornada de Trabalho
Macro Mensagem: SAÍDA
02/03/2026 16:00:00

Função: Jornada de Trabalho
Macro Mensagem: INICIO DE ESPERA
02/03/2026 16:00:00

Função: Espera
Macro Mensagem: FIM DE ESPERA
02/03/2026 18:30:00

Resultado (Com Espera): [09:00, 18:30]
(Saída 16:00 substituída por fim de espera 18:30)

Resultado (Sem Espera): [09:00, 16:00]
(Espera ignorada, saída original mantida)
```

### Cenário 3: Cruzamento de Dia
```
Período: 03/03/2026 00:00:00 à 04/03/2026 23:59:59
Funcionário/Motorista: PEDRO OLIVEIRA
Função: Jornada de Trabalho
Macro Mensagem: ENTRADA
03/03/2026 22:00:00

Função: Jornada de Trabalho
Macro Mensagem: SAÍDA
04/03/2026 02:00:00

Processamento:
- startDate = 03/03, endDate = 04/03 (dia diferente)
- isNextDay(03/03, 04/03) = true
- endTime = 02:00, startTime = 22:00 (02 < 22)
- Aplica add24(): 02:00 → 26:00
- Valida duração: 26:00 - 22:00 = 4 horas < 14h ✓

Resultado: [22:00, 26:00]
(No Excel: 22h00 a 26h00 = 4 horas)
```

## Performance Esperada

| Operação | Tempo Esperado |
|----------|----------------|
| Normalização de texto | < 50ms |
| Split de períodos | < 50ms |
| Extração de nomes | < 20ms |
| Extração de jornadas | 100-500ms (depende de tamanho) |
| Build de modelo | 50-200ms |
| Renderização HTML | 100-300ms |
| **Total** | **300-1000ms** |

**Simulação UI**: 800ms (melhora percepção de responsividade)
