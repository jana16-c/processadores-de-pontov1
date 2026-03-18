# Arquitetura - Processador de Ponto D'Granel

## Visão Geral

O **Processador de Ponto D'Granel** é uma aplicação web que automatiza a leitura e processamento de dados de controle de ponto extraídos de PDFs. A ferramenta transforma texto bruto do espelho de ponto em uma estrutura de dados organizada e exibe os horários em formato tabular por semana.

## Principais Objetivos

- **Extrair informações** de espelhos de ponto em formato texto
- **Identificar funcionários** e seus períodos de trabalho
- **Separar jornadas de trabalho** de períodos de espera
- **Organizar dados** por semana/mês para visualização e exportação
- **Suportar dois modos de processamento**:
  - **Com Espera**: Inclui períodos de espera como parte da jornada
  - **Sem Espera**: Considera apenas jornadas de trabalho efetivo

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                      INTERFACE (UI)                         │
│  - Campo textarea para entrada de texto                     │
│  - Seletor de modo (Com/Sem Espera)                        │
│  - Botões de controle (Processar, Limpar)                   │
│  - Área de resultado com tabelas por semana                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  CAMADA DE PROCESSAMENTO                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ PARSER (Extração de dados brutos)                   │    │
│  │  - Normalização de espaços e quebras de linha       │    │
│  │  - Identificação de períodos                        │    │
│  │  - Extração de nomes e jornadas                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                  │
│                            ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ DOMAIN (Lógica de negócio)                          │    │
│  │  - buildDataModelComEspera()                        │    │
│  │  - buildDataModelSemEspera()                        │    │
│  │  - Validação de períodos                           │    │
│  │  - Supressão de duplicatas                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                  │
│                            ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ UTILITIES (Funções auxiliares)                      │    │
│  │  - Manipulação de datas (parseBRDate, fmtBRDate)   │    │
│  │  - Conversão de horários (toMinutes, add24)         │    │
│  │  - Operações de string (normalizeSpaces)           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    ESTRUTURA DE DADOS                        │
│  persons: Map<string, Map<refKey, Reference>>               │
│    └─ Reference:                                             │
│        ├─ refKey: "MM/YYYY"                                 │
│        ├─ periodStart: "DD/MM/YYYY"                         │
│        ├─ periodEnd: "DD/MM/YYYY"                           │
│        └─ days: Map<"DD/MM/YYYY", string[]>                │
│            └─ string[]: ["HH:MM", "HH:MM", ...]            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 CAMADA DE RENDERIZAÇÃO                       │
│  - buildWeeks(): Organiza dias em semanas                   │
│  - render(): Gera estrutura HTML com tabelas                │
│  - toTSVForWeek(): Exporta dados em formato TSV             │
│  - copyToClipboard(): Copia para área de transferência      │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo de Dados

### 1. Entrada
```
PDF → Copiar texto → textarea (raw) → Clique em "Processar texto"
```

### 2. Processamento
```
Texto bruto
    ↓
normalizeSpaces() → splitByPeriods() → para cada período:
    ├─ extractEmployeeName()
    ├─ extractJourneys()
    └─ buildDataModel[ComEspera/SemEspera]()
    ↓
persons Map<nome, Map<refKey, Reference>>
```

### 3. Saída
```
Reference → buildWeeks() → render() → HTML tabular
                              ↓
                        Copiar como TSV
                              ↓
                        Colar no Excel
```

## Componentes Principais

### 1. **Parser de Texto** (`src/parser/`)
Extrai informações bruras do texto do PDF:
- `splitByPeriods()`: Identifica seções por período
- `extractEmployeeName()`: Extrai nome do funcionário
- `extractJourneys()`: Extrai jornadas de trabalho e períodos de espera
- `normalizeSpaces()`: Normaliza o texto

### 2. **Domain Logic** (`src/domain/`)
Implementa regras de negócio:
- `buildDataModelComEspera()`: Processa com períodos de espera inclusos
- `buildDataModelSemEspera()`: Processa apenas jornadas efetivas
- Validação de períodos (máximo 14 horas)
- Supressão de duplicatas e períodos inválidos

### 3. **Utilities** (`src/utilitários/`)
Funções auxiliares de conversão:
- **Data**: `parseBRDate()`, `fmtBRDate()`, `addDays()`, `mondayOf()`
- **Horário**: `onlyHHMM()`, `toMinutes()`, `add24()`
- **String**: `normalizeSpaces()`, `escapeHtml()`

### 4. **UI Rendering** (`src/ui/`)
Renderiza resultados na interface:
- `render()`: Cria estrutura HTML do resultado
- `buildWeeks()`: Organiza dias em semanas
- `toTSVForWeek()`: Formata dados para TSV
- `copyToClipboard()`: Copia para área de transferência
- `escapeHtml()`: Sanitiza HTML

### 5. **Event Handlers** 
- `btnProcess.click()`: Inicia processamento
- `btnClear.click()`: Limpa entrada e saída
- `updateMode()`: Alterna entre modos Com/Sem Espera

## Estrutura de Dados

### Formato do Modelo
```javascript
[
  {
    name: "JOÃO DA SILVA",
    refs: [
      {
        refKey: "03/2026",
        periodStart: "01/03/2026",
        periodEnd: "31/03/2026",
        days: Map {
          "01/03/2026" => ["08:00", "12:00", "13:00", "17:00"],
          "02/03/2026" => ["08:30", "12:30", "13:30", "17:30"],
          ...
        }
      }
    ]
  }
]
```

## Validações Implementadas

| Validação | Descrição |
|-----------|-----------|
| **Período máximo** | Máximo 14 horas entre entrada e saída (detecta erros de extração) |
| **Período válido** | Apenas períodos com início/fim no intervalo definido |
| **Cruzamento de dias** | Ajusta horários que cruzam meia-noite (adiciona 24h) |
| **Duplicatas** | Remove horários duplicados no mesmo dia |
| **Pares válidos** | Remove períodos com entrada = saída |
| **Mínimo de registros** | Requer mínimo 2 registros por período |

## Tratamento de Casos Especiais

### Mudança de Dia
Quando entrada e saída ocorrem em dias diferentes e a saída é menor que entrada:
```javascript
if (startDate !== endDate && isNextDay(startDate, endDate)) {
  if (endTime < startTime) {
    endTime = add24(endTime) // 17:00 → 41:00
  }
}
```

### Período de Espera (Com Espera)
- Substitui saída anterior por saída de espera quando encontra "INICIO DE ESPERA"
- Mantém jornada intacta, só ajusta ponto de saída

### Modo Sem Espera
- Ignora completamente registros de espera
- Mantém apenas jornadas efetivas

## Tecnologias Utilizadas

- **HTML/CSS**: Interface e estilização
- **Vanilla JavaScript**: Processamento e manipulação do DOM
- **Map (ES6)**: Estrutura de dados para organização hierárquica
- **Regex**: Parsing de texto e validação
- **Clipboard API**: Cópia de dados para área de transferência

## Performance

- **Simulação de progresso**: 800ms para melhor UX
- **Processamento lazily**: Construção incremental de estruturas
- **Copy-on-write**: Usa spread operator para evitar mutações

## Pontos de Extensão

1. **Novos Modos**: Criar `buildDataModelXxx()` para novas regras
2. **Novos Parsers**: Adicionar novos padrões regex em `extractEmployeeName()`, `extractJourneys()`
3. **Novos Formatos**: Estender `toTSVForWeek()` para outros formatos (JSON, CSV)
4. **Validações**: Adicionar regras em `buildDataModel()` antes de aceitar períodos
