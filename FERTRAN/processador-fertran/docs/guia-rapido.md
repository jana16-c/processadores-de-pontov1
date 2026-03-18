# Guia Rápido - Cheat Sheet

## 🚀 Início Rápido (Usuários)

```
1. Abrir arquivo HTML
2. Colar espelho de ponto (Ctrl+V)
3. Escolher: Com Espera vs Sem Espera
4. Clicar "Processar texto"
5. Clicar "Copiar semana" para cada semana
6. Cola no Excel (Ctrl+V)
```

## 🔍 Referência Rápida de Funções

### Datas
| Função | Entrada | Saída | Exemplo |
|--------|---------|-------|---------|
| `parseBRDate()` | "15/03/2026" | Date | `new Date(2026, 2, 15)` |
| `fmtBRDate()` | Date | "15/03/2026" | `"15/03/2026"` |
| `addDays()` | Date, 5 | Date | `15/03 + 5 = 20/03` |
| `toMinutes()` | "08:30" | 510 | `8*60+30` |
| `add24()` | "08:00" | "32:00" | For meia-noite |
| `isNextDay()` | "14/03", "15/03" | true | Dias consecutivos |

### Texto
| Função | O que faz |
|--------|-----------|
| `normalizeSpaces()` | Remove espaços/quebras extras |
| `onlyHHMM()` | "08:30:45" → "08:30" |
| `splitByPeriods()` | Divide por Período: DD/MM/YYYY à DD/MM/YYYY |
| `extractEmployeeName()` | "Funcionário: João Silva" → "João Silva" |
| `extractJourneys()` | Busca "Função: ... Tipo: ..." |
| `suppressDuplicateTimesInDay()` | Remove duplicatas de horários |

### Processamento
| Função | Modo |
|--------|------|
| `buildDataModelComEspera()` | Inclui períodos de espera ✓ |
| `buildDataModelSemEspera()` | IGNORA períodos de espera |

### Renderização
| Função | Retorna |
|--------|---------|
| `buildWeeks()` | Semanas agrupadas do período |
| `toTSVForWeek()` | TSV formatado para Excel |
| `render()` | HTML renderizado no DOM |
| `copyToClipboard()` | Copia texto para área transferência |

## 📊 Estrutura de Dados

### Modelo Final
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
          "01/03/2026": ["08:00", "12:00", "13:00", "18:00"],
          "02/03/2026": ["08:15", "12:00", "13:00", "17:45"]
        }
      }
    ]
  }
]
```

## ⚙️ Modos de Processamento

### COM ESPERA ✅
**Quando usar**: Se a empresa registra períodos de espera (Fertran comum)
```
Lê: "Jornada de Trabalho" + "Espera"
Resultado: Jornada com possível ajuste de saída
```

### SEM ESPERA ⛔
**Quando usar**: Se quer apenas trabalho efetivo (desprezar espera)
```
Lê: APENAS "Jornada de Trabalho"
Ignora: "Espera" completamente
```

## 🎨 Elementos HTML

| ID | Elemento | Uso |
|----|----------|-----|
| `raw` | textarea | Input (espelho) |
| `btnProcess` | button | Processar |
| `btnClear` | button | Limpar |
| `out` | div | Output (resultado) |
| `status` | div | Feedback |
| `loader` | div | Spinner |
| `mode-com_espera`, `mode-sem_espera` | radio | Seletor modo |

## 🔧 Regex Principais

| Padrão | Busca |
|--------|-------|
| `/Per[ií]odo:\s*(\d{2}\/\d{2}\/\d{4})(?:\s+\d{2}:\d{2}:\d{2})?\s*(?:à\|-)\s*(\d{2}\/\d{2}\/\d{4})/gi` | Períodos |
| `/Funcion[aá]rio(?:\s*\/\s*Motorista)?\s*:\s*([\s\S]+?)(?:\s*CPF\s*:\|$)/mi` | Nome funcionário |
| `/Função:?\s*([^\n\r]+?)\s+(?:Macro\s+Mensagem:\|Tipo)\s*:?\s*([^\n\r]+)/g` | Função + Tipo |
| `/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/g` | Data + Hora |

## 🎯 Validações Chave

| Validação | Condição | Ação |
|-----------|----------|------|
| **Período** | Data fora de ±35 dias | Descarta jornada |
| **Duração** | > 14h (não cruzamento) | Descarta jornada |
| **Próximo Day** | Começa um dia, termina próximo | add24() ao horário saída |
| **Duplicatas** | Entrada = Saída mesmo dia | Remove dia inteiro |
| **Pares Duplos** | Dois horários iguais sequencial | Remove ambos |

## 💾 Formato Export

### TSV (Tab-Separated Values)
```
08:00	12:00	13:00	18:00
08:15	12:00	13:00	17:45
09:00	12:30	14:00	18:15
```
**Como**: Cole direto no Excel, as abas viram colunas

### Estrutura Tabela HTML
```html
<table>
  <tr>
    <td>08:00</td>
    <td>12:00</td>
    <td>13:00</td>
    <td>18:00</td>
  </tr>
  <!-- mais dias -->
</table>
```

## 🐛 Debug Rápido

| Problema | Causa | Solução |
|----------|-------|---------|
| "Nenhuma batida encontrada" | Texto inválido | Copiar melhor do PDF |
| Horário fica 32:00 | Jornada cruzou meia-noite | Normal, adiciona 24h |
| Funcionário "FUNCIONÁRIO" | Não extraiu nome | Verificar padrão no PDF |
| Falta dias no resultado | Fora período ±35 dias | Verificar data em espelho |
| Horário cortado | Máximo 14h | Jornada muito longa |

## 📊 Exemplo de Entrada Válida

```
Período: 01/03/2026 à 31/03/2026

Funcionário: João Silva
CPF: 123.456.789-00

01/03/2026
08:30:45

Função: Jornada de Trabalho  Tipo: NORMAL

18:45:00

---

02/03/2026
08:15:30

Função: Jornada de Trabalho  Tipo: NORMAL

17:30:00
```

## 🚀 Performance

| Operação | Tempo Estimado |
|----------|---|
| Parse + Processamento | 800ms (simulado) |
| Render HTML | < 100ms |
| Copiar semana | Instantâneo |
| Total | ~1 segundo |

## 💡 Dicas

- **Dica 1**: Cole TUDO do espelho, app extrai o que precisa
- **Dica 2**: Se falta semana, pode estar fora da data esperada
- **Dica 3**: Escolha modo correto (Com/Sem Espera) antes de processar
- **Dica 4**: Copiar semana = TSV pronto para Excel, não precisa formatar
- **Dica 5**: Se algo estranha, verifique console.log (F12)

---

**Mais informações**: Leia `README.md` ou `funcoes.md`
