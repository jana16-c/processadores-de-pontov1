# Documentação - Processador de Ponto FERTRAN

## 📁 Estrutura da Documentação

```
docs/
├── README.md              # Este arquivo
├── arquitetura.md         # Visão geral da arquitetura
├── funcoes.md            # Dicionário completo de funções
└── guia-rapido.md        # (em breve) Guia rápido para usuários

src/
├── utilidades-data.js     # Funções de manipulação de datas
├── analise-texto.js       # Funções de análise de texto
├── modelagem.js          # Motores de processamento (COM/SEM ESPERA)
├── renderizacao.js        # Renderização em HTML e export TSV
└── ui.js                 # Controle de interface e eventos
```

## 🚀 Começar

### Para Usuários
Se você está usando o processador:
1. Abra o arquivo HTML (`processador_de_ponto_fertranvfinal.html`)
2. Cole o espelho de ponto (copiado do PDF)
3. Escolha o modo: **Com Espera** ou **Sem Espera**
4. Clique em **Processar texto**
5. Copie cada semana diretamente para o Excel

### Para Desenvolvedores
Se você está trabalhando com o código:
1. Leia [arquitetura.md](arquitetura.md) para entender a estrutura geral
2. Consulte [funcoes.md](funcoes.md) para detalhes de funções específicas
3. Revise os arquivos em `src/` - cada um documenta seu módulo:
   - `utilidades-data.js` - funções de data/hora
   - `analise-texto.js` - parsing e extração
   - `modelagem.js` - lógica de processamento
   - `renderizacao.js` - geração de HTML e export
   - `ui.js` - eventos e controles

## 📚 Arquivo por Arquivo

### `arquitetura.md`
- **O quê**: Visão geral da arquitetura do projeto
- **Contém**:
  - Diagrama de camadas
  - Fluxo de dados passo-a-passo
  - Estrutura de dados (TypeScript-like)
  - Dois motores principais (COM ESPERA vs SEM ESPERA)
  - Decisões de design
  - Padrões Regex utilizados
  - Validações importantes
  - Casos de uso tratados
  - Limitações conhecidas
- **Quando Usar**: Entender como tudo se conecta, visão de 30.000 pés

### `funcoes.md`
- **O quê**: Dicionário completo com todas as ~20 funções
- **Formato**:
  - Nome e assinatura
  - Descrição clara
  - Exemplos de uso
  - Parâmetros detalhados
  - Valor de retorno
  - Lógica interna
- **Quando Usar**: Implementar, refatorar, ou debugar funções específicas

### `src/utilidades-data.js`
- **Funções**:
  - `parseBRDate()` - DD/MM/YYYY → Date
  - `fmtBRDate()` - Date → DD/MM/YYYY
  - `addDays()` - adiciona dias
  - `mondayOf()` - segunda-feira da semana
  - `isNextDay()` - valida dias consecutivos
  - `toMinutes()` - HH:MM → minutos
  - `add24()` - adiciona 24h ao horário
- **Uso**: Independente, pode ser reutilizado em outro projeto

### `src/analise-texto.js`
- **Funções**:
  - `normalizeSpaces()` - limpa espaços/quebras
  - `onlyHHMM()` - extrai HH:MM de HH:MM:SS
  - `splitByPeriods()` - divide por mês/ano
  - `extractEmployeeName()` - extrai nome funcionário
  - `cleanSliceForParsing()` - remove paginação
  - `extractJourneys()` - extrai jornadas/esperas
  - `suppressDuplicateTimesInDay()` - remove duplicatas
- **Uso**: Core de parsing, altamente personalizado para Fertran

### `src/modelagem.js`
- **Funções**:
  - `buildDataModelComEspera()` - Motor 1: inclui espera
  - `buildDataModelSemEspera()` - Motor 2: apenas jornada
- **Uso**: Lógica de negócio, implementa dois fluxos diferentes
- **Nota**: Ambas funções retornam a mesma estrutura de dados

### `src/renderizacao.js`
- **Funções**:
  - `buildWeeks()` - agrupa dias em semanas
  - `toTSVForWeek()` - prepara para Excel
  - `render()` - renderiza HTML completo
  - `escapeHtml()` - segurança (XSS)
  - `copyToClipboard()` - copia para clipboard
- **Uso**: Apresentação, não mexe em dados

### `src/ui.js`
- **Funções**:
  - `setStatus()` - atualiza feedback
  - `setLoading()` - mostra/oculta spinner
  - `flashReady()` - notificação "Pronto!"
  - `simulateProgress()` - progress bar visual
  - `updateMode()` - alterna Com/Sem Espera
  - `handleProcessClick()` - orquestra todo fluxo
  - `handleClearClick()` - limpa tudo
- **Uso**: Eventos e controle, vinculado ao HTML

## 🔄 Fluxo Típico de Processamento

```
Usuário cola texto
    ↓
[ui.js] handleProcessClick() inicia
    ↓
[analise-texto.js] normalizeSpaces() limpa
    ↓
[analise-texto.js] splitByPeriods() divide por mês
    ↓
Para cada período:
  ├─ [analise-texto.js] extractEmployeeName() → nome
  ├─ [analise-texto.js] extractJourneys() → jornadas
  └─ [modelagem.js] buildDataModel???() → dados estruturados
    ↓
[renderizacao.js] buildWeeks() agrupa em semanas
    ↓
[renderizacao.js] render() → HTML
    ↓
Usuário clica "Copiar semana"
    ↓
[renderizacao.js] toTSVForWeek() → TSV
    ↓
[renderizacao.js] copyToClipboard() → Cola no Excel
```

## 🎯 Casos de Uso Comuns

### "Quero entender como a app processa datas"
→ Leia `src/utilidades-data.js` + seção de "Fluxo" em arquitetura.md

### "Como ele extrai jornadas do PDF?"
→ Leia `src/analise-texto.js` + função `extractJourneys()` em funcoes.md

### "Qual é a diferença entre Com Espera e Sem Espera?"
→ Leia `src/modelagem.js` + seção "Dois Motores" em arquitetura.md

### "Por que meu horário ficou 32:00?"
→ Leia `add24()` em funcoes.md - é para jornadas que cruzam meia-noite

### "Por que algumas jornadas não aparecem?"
→ Leia "Validações Importantes" em arquitetura.md - máximo 14h, período válido, etc.

### "Como copiar para Excel?"
→ Leia `toTSVForWeek()` e `copyToClipboard()` em funcoes.md - é TSV (Tab-Separated)

## 📝 Convenções de Código

### Nomes de Variáveis
- `hhmm` - horário em formato HH:MM
- `hhmmss` - horário completo HH:MM:SS
- `dmy` - data em formato DD/MM/YYYY
- `dt` - objeto Date
- `arr` - array genérico

### Padrões Regex Utilizados
Todos documentados em arquitetura.md, seção "Padrões Regex Utilizados"

### Tipo de Dados Principais
```
Date - objeto nativo JavaScript
Map - estrutura chave-valor eficiente
Array - para horários, dias, semanas, etc.
```

## 🧪 Testando

Para testar localmente:
1. Abra `processador_de_ponto_fertranvfinal.html` em um navegador
2. Cole um espelho de ponto (arquivo em `testes/` pode ter exemplos)
3. Processe e verifique saída

## ⚠️ Limitações e Futuros

| Limitação | Motivo | Possível Solução |
|-----------|--------|----------------|
| Máximo 14h por jornada | Validação | Aumentar limite se necessário |
| Formato PDF específico Fertran | Muito customizado | Extrair regex para config |
| Sem suporte a múltiplas jornadas/dia | Não é padrão | Adicionar suporte se surgir demanda |
| Sem persistência de dados | Tudo em memória | Adicionar localStorage/indexedDB |

## 📞 Suporte

Para dúvidas específicas:
1. Procure pelo nome da função em `funcoes.md`
2. Leia o arquivo `src/` correspondente (documentado)
3. Verifique o exemplo na função
4. Consulte `arquitetura.md` para contexto geral

---

**Última atualização**: Março 2026
**Versão**: v14 (Com Espera) + vFinal
