# Arquitetura do Processador de Ponto VALE

## Visão Geral

O Processador de Ponto VALE é uma aplicação web que lê dados brutos de um arquivo de ponto em forma de texto (extraído de PDF) e, após processar, exibe os horários organizados em semanas e meses de forma tabular e pronta para cópia visual.

## Fluxo Principal

```
1. [INPUT] Usuário cola texto bruto do PDF no textarea
   ↓
2. [PARSING] parseInput() processa o texto e extrai horários/funcionários
   ↓
3. [VALIDAÇÃO] adjustShifts() ordena cronologicamente
   ↓
4. [RENDERIZAÇÃO] renderPerson() cria a visualização HTML
   ↓
5. [OUTPUT] Usuário lê e copia dados tabela por tabela
```

## Estrutura de Diretórios

```
src/
├── main.js                    # Orquestrador principal (ponto de entrada)
├── domain/                    # Lógica de negócio
│   ├── adjustShifts.js       # Ordenação cronológica
│   ├── buildWeeksForMonth.js # Agrupamento em semanas
│   └── toTSVForWeek.js       # Conversão para TSV (Excel)
├── parser/
│   └── parserInput.js        # Motor de análise de texto
├── ui/
│   ├── renderPerson.js       # Geração de HTML visual
│   └── showError.js          # Exibição de mensagens de erro
└── utilitários/
    ├── clipboard.js          # Cópia para área de transferência
    ├── data.js               # Manipulação de datas
    └── time.js               # Conversão de horários
```

## Módulos Principais

### **main.js** - Orquestrador
- Função: `processData()`
- Papel: Coordena o fluxo completo
  - Captura entrada do usuário
  - Chama parser
  - Aplica ajustes
  - Renderiza resultado
  - Trata erros

### **Parser (parserInput.js)** - Motor de Análise
- Função: `parseInput(text)`
- Responsabilidades:
  - Extrai funcionários do texto
  - Identifica turnos e horários
  - Detecta turnos irregulares e folgas
  - Reconhece códigos de horário contratual
  - Valida e normaliza horários
  - Trata lacunas e fusões de turno
  - Retorna mapa de `{nomeFuncionário: [diasComHorários]}`

### **Domain (Lógica de Negócio)**

#### adjustShifts.js
- Função: `adjustShifts(timeline)`
- Ordena cronologicamente os dias de um funcionário

#### buildWeeksForMonth.js
- Função: `buildWeeksForMonth(year, monthIndex)`
- Agrupa dias em semanas (segunda a domingo)
- Retorna estrutura de semanas com datas

#### toTSVForWeek.js
- Função: `toTSVForWeek(weekDays, daysMap)`
- Converte dados de uma semana para formato TSV (Tab-Separated Values)
- Padroniza colunas para cópia no Excel

### **UI (Apresentação)**

#### renderPerson.js
- Função: `renderPerson(name, timeline, container)`
- Constrói HTML com:
  - Nome do funcionário
  - Agrupamento por mês
  - Tabelas por semana
  - Botões de cópia

#### showError.js
- Função: `showError(message)`
- Exibe mensagens de erro na interface

### **Utilitários**

#### clipboard.js
- Função: `copyToClipboard(text)`
- Copia para área de transferência (navegador)

#### date.js
- `fmtBRDate(dt)`: Formata data para DD/MM/YYYY
- `addDays(dt, n)`: Adiciona/subtrai dias
- `mondayOf(dt)` : Encontra segunda-feira da semana

#### time.js
- `parseToMins(tStr)`: Converte "HH:MM" → minutos
- `formatMins(mins)`: Converte minutos → "HH:MM"

## Fluxo de Dados

### Entrada
texto bruto com padrão:
```
Empregado: NOME DO FUNCIONÁRIO Categoria: ...
seg 01/01/24 00001
entrada1 saída1
ter 02/01/24
entrada1 saída1 entrada2 saída2
...
```

### Estrutura Processada
```javascript
{
  "NOME_FUNCIONÁRIO": [
    {
      data: Date,
      scheduleCode: "00001",
      times: ["08:00", "12:00", "13:00", "17:00"],
      useSchedule: false,
      isOffDay: false,
      hasIrregularMark: false,
      hasMissingExit: false
    },
    ...
  ]
}
```

### Saída
Tabelas HTML visuais com:
- Mês e ano
- Semanas (segunda a domingo)
- Horários em colunas (entrada/saída pares)
- Botões para copiar por semana

## Regras de Processamento

1. **Detecção de Turnos**: Lê "HH:MM" consecutivos, agrupando em pares (entrada/saída)
2. **Turnos Nocturnos**: Detecta quando saída < entrada (cruzamento de madrugada)
3. **Irregular**: Ajusta lógica de pareamento se marcado como "MARCAÇÃO IRREGULAR"
4. **Dia Inteiro**: Se "MARCAÇÃO NÃO REGISTRADA", usa horário contratual
5. **Folga/Feriado**: Marca dias como não trabalháveis
6. **Fusão de Turnos**: Une horários consecutivos sem intervalo em pares

## Padrões e Convenções

- **Datas**: DD/MM/YYYY (brasileiro)
- **Horários**: HH:MM (24h)
- **Nomes**: UPPERCASE
- **Erros**: Exibidos em caixa modal vermelha
- **Sucesso**: Botão muda para "Processado!" temporariamente
