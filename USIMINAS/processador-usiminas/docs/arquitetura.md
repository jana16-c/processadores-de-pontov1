# Arquitetura do Processador de Ponto Usiminas

## 1. Visão geral

Este projeto processa texto bruto extraído de espelhos de ponto da Usiminas e transforma esse conteúdo em uma estrutura organizada por:

- funcionário
- mês calendário
- semanas de segunda a domingo
- batidas formatadas para visualização e cópia em TSV

O sistema foi dividido em módulos para facilitar:

- manutenção
- testes
- reaproveitamento em outros processadores
- isolamento de regras de negócio
- documentação técnica

---

## 2. Objetivo principal

O objetivo do sistema é interpretar relatórios textuais de espelho de ponto e produzir uma saída confiável para análise e exportação, respeitando regras específicas do layout Usiminas, como:

- remoção das batidas planejadas
- manutenção de batidas reais em dias como DSR/FOLGA/FERIADO
- tratamento de virada noturna
- separação correta por mês real
- agrupamento semanal para colagem no Excel

---

## 3. Organização em camadas

A arquitetura foi separada em quatro camadas principais, cada uma com responsabilidades claras e bem definidas.

### 3.1 parser

Responsável por ler o texto bruto e extrair os dados estruturados básicos.

**Arquivo:** `src/parser/parserInput.js`

**Responsabilidades:**
- identificar funcionário
- identificar período do relatório
- identificar linhas de dias
- extrair horários
- decidir quais horários são batidas reais (remove planejadas)
- preservar batidas em dias especiais (DSR/FOLGA/FERIADO)

**Regras principais:**
- Nome extraído de campos como "Colaborador:", "Funcionário:" ou "Nome:"
- Período lido do cabeçalho em formato "Período de DD.MM.AAAA até DD.MM.AAAA"
- Cruzamento de meses: dias maiores = mês inicial, menores = mês final
- Dias normais: primeiras 2 batidas são descartadas (planejado), resto é real
- Dias especiais (DSR/FOLGA/FERIADO): qualquer horário é preservado

**Não deve:**
- Renderizar HTML ou qualquer saída visual
- Validar horários profundamente
- Aplicar regras de negócio complexas

### 3.2 domain

Responsável por aplicar as regras de negócio da Usiminas após o parsing.

**Arquivos:**
- `src/domain/adjustShifts.js`
- `src/domain/buildWeeksForMonth.js`
- `src/domain/toTSVForWeek.js`

**Responsabilidades:**
- Corrigir jornadas quebradas entre dias consecutivos
- Estruturar semanas visíveis do mês
- Converter dados para formato TSV para exportação

**Regras principais:**
- **adjustShifts:** Fecha jornadas com número ímpar de batidas puxando do dia seguinte
- **buildWeeksForMonth:** Remove dias fora do mês, mantendo semanas seg→dom
- **toTSVForWeek:** Padroniza colunas com tabs, pronto para copiar no Excel

### 3.3 ui

Responsável por renderização na tela e interação com o usuário.

**Arquivos:**
- `src/ui/renderperson.js`
- `src/ui/showError.js`

**Responsabilidades:**
- Montar visualização dos funcionários
- Exibir semanas com botões de cópia
- Mostrar mensagens de erro
- Executar ações do usuário (processar, copiar)

**Não deve:**
- Aplicar lógica de negócio complexa
- Modificar dados brutos

### 3.4 utilitários

Funções auxiliares reutilizáveis para manipulação de dados primitivos.

**Arquivo:** `src/utilitários/`

**Responsabilidades:**
- Manipulação de horários (conversão para minutos, comparações)
- Formatação de datas (padrão brasileiro)
- Cálculos com datas (soma de dias, descobrir segunda-feira)
- Cópia para área de transferência

---

## 4. Fluxo de dados

O processamento segue este fluxo:

```
Texto bruto (PDF)
    ↓
[parseInput]  → ParsedMap { nomeFuncionário: Timeline[] }
    ↓
[adjustShifts]  → Timeline ajustada (jornadas fechadas)
    ↓
[renderPerson]  → HTML com meses e semanas
    ↓
Exibição visual + botões de cópia
```

### 4.1 Estrutura de dados

**DayEntry (dia parseado):**
```javascript
{
  data: Date,           // Data JavaScript
  times: string[],      // ["HH:MM", "HH:MM"] horários do dia
  isOffDay: boolean,    // true se FOLGA/DSR/FERIADO
  rawLine: string       // Linha bruta do PDF (DEBUG)
}
```

**ParsedMap (mapa de funcionários):**
```javascript
{
  "NOME DO FUNCIONÁRIO": [DayEntry, DayEntry, ...],
  "OUTRO FUNCIONÁRIO": [...]
}
```

---

## 5. Regras de negócio importantes

### 5.1 Identificação de batidas reais vs planejadas

Em linhas normais, o layout Usiminas apresenta:
```
11 Seg Código 07:00 17:00 [batidas reais...]
            ^^^^^^ ^^^^^^ 
             estas são descartadas (planejado)
```

Em dias especiais (DSR/FOLGA/FERIADO):
```
12 Dom DSR 15:30
        ^^^^^ tipo especial
               ^^^^^ preservado (real)
```

### 5.2 Virada noturna

Quando uma jornada cruza meia-noite, é registrada em dois dias:

**Antes (parseado):**
- Dia 11: `[20:51]` (ímpar)
- Dia 12: `[03:54]` (batida da madrugada de hoje)

**Depois (adjustShifts):**
- Dia 11: `[20:51, 27:54]` (+ 24h na saída)
- Dia 12: `[]` (limpo)

### 5.3 Cruzamento de meses

Se o período é "01.11.2016 até 30.11.2016" mas há dias reiniciando de 1, 2, ... significa:
- Dias 1-30 → novembro/2016
- Dia 1 após dia 30 → dezembro/2016

---

## 6. Reaproveitamento de componentes

O projeto foi estruturado para ser facilmente adaptado a outros processadores:

- **parseInput** pode ser reaproveitada com ajustes de regex
- **adjustShifts** é agnóstica ao processador
- **buildWeeksForMonth** é genérica
- **toTSVForWeek** é genérica
- Apenas `ui/` precisa ser reescrita por design
- Utilitários em `utilitários/` são totalmente reutilizáveis

---

## 7. Testes

Testes unitários estão em `tests/`:
- `tests/parseInput.test.js` - Validar parsing
- `tests/adjustShifts.test.js` - Validar ajuste de jornadas
- `tests/fixtures/` - Dados de exemplo para testes

Cada módulo deve ser testável independentemente.

Essa camada deve:
- ser pequena
- não conter regra específica do layout Usiminas, salvo quando inevitável
- ser altamente reutilizável

Arquivos:
- `src/utils/date.js`
- `src/utils/time.js`
- `src/utils/clipboard.js`

---

### 3.4 ui

Responsável exclusivamente pela interface.

Responsabilidades:
- mostrar mensagens de erro
- montar blocos HTML
- criar botões e interações visuais
- exibir resultados por pessoa, mês e semana

Essa camada não deve:
- decidir regra de negócio
- interpretar texto bruto
- reimplementar lógica do parser

Arquivos:
- `src/ui/renderPerson.js`
- `src/ui/showError.js`

---

### 3.5 main

Responsável por orquestrar o fluxo da aplicação.

Responsabilidades:
- receber ação do usuário
- ler o textarea
- chamar parser
- chamar regras de negócio
- chamar renderização
- controlar estado visual do botão de processar

Arquivo:
- `src/main.js`

---

## 4. Fluxo de dados

O fluxo principal do sistema é o seguinte:

1. O usuário cola o texto do espelho no campo da interface.
2. O botão “Processar” chama `processData()`.
3. `processData()` lê o texto e chama `parseInput(text)`.
4. `parseInput()` transforma o texto em um mapa por funcionário.
5. Para cada funcionário:
   - os dias são ordenados
   - `adjustShifts()` corrige batidas entre dias
6. `renderPerson()` agrupa os dados por mês e por semana.
7. A interface exibe os blocos e permite copiar cada semana em TSV.

---

## 5. Estrutura de dados principal

A estrutura mais importante do sistema é a timeline de dias por funcionário.

Exemplo:

```js
[
  {
    data: new Date(2016, 11, 11),
    times: ["20:51", "27:54"]
  },
  {
    data: new Date(2016, 11, 12),
    times: []
  }
]