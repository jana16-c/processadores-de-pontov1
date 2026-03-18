# Processador de Ponto D'Granel

Aplicação web para processamento automatizado de espelhos de ponto extraídos em PDF, transformando texto bruto em dados estruturados organizados por semana e exportáveis para Excel.

## 📋 Documentação Completa

A documentação foi organizada em 4 arquivos principais:

### 1. **[arquitetura.md](docs/arquitetura.md)** 📐
Visão geral da arquitetura e componentes:
- Diagrama de fluxo de dados
- Componentes principais (Parser, Domain, UI, Utilities)
- Estrutura de dados
- Validações implementadas
- Pontos de extensão

### 2. **[funcoes.md](docs/funcoes.md)** 🔧
Documentação detalhada de TODAS as 27 funções:
- **Parser** (5 funções): normalizeSpaces, splitByPeriods, extractEmployeeName, extractJourneys, onlyHHMM
- **Utilities** (10 funções): parseBRDate, fmtBRDate, addDays, mondayOf, isNextDay, toMinutes, add24, escapeHtml, suppressDuplicateTimesInDay, sleep
- **Domain** (2 funções): buildDataModelComEspera, buildDataModelSemEspera
- **UI Rendering** (7 funções): render, buildWeeks, toTSVForWeek, copyToClipboard, e handlers
- **Utilities adicionais**: setStatus, setLoading, flashReady, simulateProgress

Cada função inclui:
- Objetivo
- Parâmetros detalhados
- Retorno esperado
- Exemplos de uso
- Comentários sobre lógica especial

### 3. **[regras-dgranel.md](docs/regras-dgranel.md)** ⚙️
Regras específicas do negócio:
- Padrões de identificação de jornadas
- Processamento de datas (período válido, duração máxima, cruzamento de dias)
- **Dois modos de processamento**:
  - **Com Espera**: Inclui períodos de espera na jornada
  - **Sem Espera**: Apenas jornadas efetivas
- Validações aplicadas
- Organização de semanas
- Exportação em formato TSV
- Exemplos práticos com cenários reais

## 📂 Estrutura de Código Fonte

Código documentado e comentado por módulo:

```
src/
├── main.js                      # Entrada, orchestração e overview completo
├── parser/
│   └── parser.js               # Extração de dados brutos (5 funções)
├── utilitários/
│   └── utilities.js            # Funções auxiliares (10 funções)
├── domain/
│   └── domain.js               # Lógica de negócio (2 funções)
└── ui/
    └── renderer.js             # Renderização e UI (7 funções)
```

Cada arquivo `.js` contém:
- JSDoc completo com `@param`, `@returns`, `@example`
- Comentários explicativos para lógica complexa
- Referências às validações aplicadas
- Exemplos de entrada/saída

## 🚀 Como Usar

### 1. Interface
```
Abra processador_de_ponto_dgranelvfinal.html no navegador
```

### 2. Processamento
```
1. Cole texto do PDF no textarea
2. Escolha modo: "Com Espera" ou "Sem Espera"
3. Clique "Processar texto"
4. Revise resultados na tabela
```

### 3. Exportação para Excel
```
1. Clique "Copiar semana"
2. Abra Excel ou Goolge Sheets
3. Cole com Ctrl+V
4. Dados já formatados em tabela
```

## 📊 Fluxo de Processamento

```
Texto PDF (copiar)
    ↓
normalizeSpaces() → Limpa espaços
    ↓
splitByPeriods() → Divide por período
    ↓
extractEmployeeName() → Extrai nomes
    ↓
extractJourneys() → Extrai jornadas
    ↓
buildDataModel[ComEspera/SemEspera]()
    ├─ Validações (período máximo, duplicatas)
    ├─ Lógica especial (cruzamento dias, espera)
    └─ Estrutura hierárquica
    ↓
render() → Cria tabelas HTML
    ↓
buildWeeks() → Agrupa por semana
    ↓
toTSVForWeek() → Formata TSV
    ↓
copyToClipboard() → Copia para Excel
```

## 🔑 Funções Principais

| Função | Módulo | Propósito |
|--------|--------|-----------|
| `buildDataModelComEspera()` | domain.js | Processa COM períodos de espera |
| `buildDataModelSemEspera()` | domain.js | Processa SEM períodos de espera |
| `extractJourneys()` | parser.js | Extrai jornadas do texto |
| `render()` | renderer.js | Cria estrutura HTML com tabelas |
| `copyToClipboard()` | renderer.js | Copia para Excel (TSV) |

## ⚡ Características

✅ **Dois modos de processamento**
- Com Espera: Inclui períodos de espera
- Sem Espera: Apenas jornadas efetivas

✅ **Validações robustas**
- Período máximo 14 horas
- Cruzamento de dias automático
- Filtro de período (±2 dias)
- Remoção de duplicatas

✅ **Exportação para Excel**
- Formato TSV (Tab-Separated Values)
- Ctrl+V direto no Excel funciona
- Semanas organizadas automaticamente

✅ **Interface responsiva**
- Modo escuro por padrão
- Indicador de progresso
- Feedback visual ("Pronto!")

## 📐 Estrutura de Dados Retornada

```javascript
[
  {
    name: "JOÃO SILVA",
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

## 🎯 Validações Implementadas

| Validação | Descrição |
|-----------|-----------|
| Período Máximo | <14 horas (detecta erros OCR) |
| Cruzamento Dias | Ajusta horários automáticamente |
| Duplicatas | Remove sequências iguais |
| Pares Inválidos | Remove entrada=saída |
| Filtro Range | ±2 dias do período oficial |

## 📝 Requisitos de Texto

O PDF deve conter:
- ✓ `Período: DD/MM/YYYY HH:MM:SS à DD/MM/YYYY HH:MM:SS`
- ✓ `Funcionário / Motorista: [NOME]`
- ✓ `Função: [descrição] Macro Mensagem: [mensagem]`
- ✓ Datas e horas: `DD/MM/YYYY HH:MM:SS`

## 🔄 Exemplos Práticos

### Dia Normal
```
08:00 ─ Entrada
12:00 ─ Saída almoço
13:00 ─ Entrada retorno
17:00 ─ Saída

Resultado: [08:00, 12:00, 13:00, 17:00] ✓
```

### Com Espera (Modo "Com Espera")
```
08:00 ─ Entrada
16:00 ─ Saída (+ espera)
16:00 ─ Início de espera
18:30 ─ Fim de espera

Resultado: [08:00, 18:30] ✓
(Saída substitída por fim de espera)
```

### Cruzamento de Dia
```
22:00 (terça) ─ Entrada
02:00 (quarta) ─ Saída

Sistema detecta → Ajusta saída para 26:00
Resultado: [22:00, 26:00] = 4 horas ✓
```

## 🌍 Navegadores Suportados

- Chrome 66+
- Firefox 63+
- Safari 13.1+
- Edge 79+
- Fallback para navegadores antigos

## ⚙️ Performance

| Operação | Tempo |
|----------|-------|
| Normalização | <50ms |
| Split de períodos | <50ms |
| Extração | 100-500ms |
| Renderização | 100-300ms |
| **Total** | **300-1000ms** |

Simulação UI de progresso: 800ms (melhora UX)

## 📚 Documentação Adicional

- **[main.js](src/main.js)**: Overview completo com comentários detalhados
- **[parser.js](src/parser/parser.js)**: Funções de extração com exemplos
- **[utilities.js](src/utilitários/utilities.js)**: Utilities de data, hora e strings
- **[domain.js](src/domain/domain.js)**: Lógica de negócio (2 modos)
- **[renderer.js](src/ui/renderer.js)**: Renderização e UI

## 📞 Informações do Projeto

- **Versão**: 1.0.0
- **Empresa**: D'Granel RH
- **Data**: Março de 2026
- **Linguagem**: Vanilla JavaScript (HTML, CSS, JS)
- **Dependências**: Nenhuma (zero dependências!)

## 🎓 Estrutura de Documentação

```
docs/
├── arquitetura.md       # Visão geral e componentes
├── funcoes.md           # 27 funções detalhadas
├── regras-dgranel.md    # Regras de negócio específicas
└── README.md            # Este arquivo
```

## 🔗 Ficheiros Principais

- `processador_de_ponto_dgranelvfinal.html` - APP pronta para uso
- `docs/arquitetura.md` - Documentação técnica
- `docs/funcoes.md` - Referência de funções
- `docs/regras-dgranel.md` - Regras de processamento
- `src/main.js` - Overview e orquestração
- `src/parser/parser.js` - Parser de texto
- `src/domain/domain.js` - Lógica de negócio
- `src/ui/renderer.js` - Interface
- `src/utilitários/utilities.js` - Funções auxiliares

## ✨ Próximas Melhorias Sugeridas

- [ ] Upload de arquivo (ao invés de colar)
- [ ] Suporte a múltiplos formatos de PDF
- [ ] Exportar em JSON/CSV
- [ ] Modo de análise com estatísticas
- [ ] Histórico com LocalStorage
- [ ] Sincronização com Google Sheets
- [ ] Validação de entrada com feedback visual

---

**Documentação completa e pronta para uso! Todos os módulos estão comentados e estruturados.**
