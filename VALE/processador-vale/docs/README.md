# Documentação do Processador de Ponto VALE v1

Bem-vindo à documentação técnica do **Processador de Ponto VALE**. Este projeto é uma aplicação web que processa dados de ponto em PDF e apresenta os horários em formato tabular pronto para cópia no Excel.

## 📁 Estrutura da Documentação

### 1. **[arquitetura.md](arquitetura.md)** - Visão Geral do Sistema
Leia isto primeiro para entender:
- **Fluxo principal** de processamento
- **Estrutura de diretórios** do projeto
- **Módulos principais** e suas responsabilidades
- **Fluxo de dados** de entrada até saída
- **Regras de processamento** implementadas
- **Padrões e convenções** usados no código

### 2. **[funcoes.md](funcoes.md)** - Referência de Funções
Referência detalhada de cada função:
- Assinatura e parâmetros
- Responsabilidades e comportamento
- Exemplos de entrada/saída
- Casos de erro tratados

### 3. **[regras-vale.md](regras-vale.md)** - Regras de Negócio
Documenta as regras específicas do ponto VALE:
- Como turnos são identificados
- Tratamento de marcações irregulares
- Folgas, feriados e licenças
- Ajustes para turnos noturnos
- Fusão de turnos contínuos

---

## 🚀 Início Rápido

### Para Usuários
1. Abra `index.html` ou `indexmaquinista.html` no navegador
2. Cole o texto extraído do PDF de ponto
3. Clique em **"Processar"**
4. Clique em **"Copiar semana"** para cada semana que desejar
5. Cole no Excel

### Para Desenvolvedores
1. Leia [arquitetura.md](arquitetura.md) para entender o design
2. Leia [funcoes.md](funcoes.md) para referência técnica
3. Explore o código em `src/` - cada arquivo tem comentários detalhados
4. Veja [regras-vale.md](regras-vale.md) para lógica de negócio

---

## 📊 Estrutura do Código

```
src/
├── main.js                 # Ponto de entrada - orquestra o fluxo
│
├── parser/
│   └── parserInput.js     # Motor de análise de texto bruto
│
├── domain/                # Lógica de negócio
│   ├── adjustShifts.js    # Ordenação cronológica
│   ├── buildWeeksForMonth.js  # Agrupamento em semanas
│   └── toTSVForWeek.js    # Conversão para Excel (TSV)
│
├── ui/                    # Apresentação visual
│   ├── renderPerson.js    # Geração de HTML
│   └── showError.js       # Exibição de erros
│
└── utilitários/           # Funções auxiliares
    ├── clipboard.js       # Cópia para área de transferência
    ├── data.js            # Manipulação de datas
    └── time.js            # Conversão de horários
```

---

## 🔄 Fluxo Principal

```
[ENTRADA]
Texto bruto do PDF
    ↓
[PARSING]
parseInput() → extrai nomes, dias, horários
    ↓
[VALIDAÇÃO]
adjustShifts() → ordena cronologicamente
    ↓
[ESTRUTURAÇÃO]
buildWeeksForMonth() → agrupa em semanas
    ↓
[RENDERIZAÇÃO]
renderPerson() → cria HTML + botões
    ↓
[SAÍDA]
Tabelas visuais + funcionalidade de copiar
```

---

## 🎯 Principais Componentes

### **Parsing** (parserInput.js)
- Extrai funcionários via padrão "Empregado: ..."
- Identifica dias via "seg DD/MM/YY"
- Valida horários "HH:MM"
- Reconhece códigos de turno, marcações irregulares, folgas
- Ajusta turnos noturnos automaticamente

### **Lógica de Negócio** (domain/)
- Ordena dias cronologicamente
- Agrupa mês em semanas (seg-dom)
- Formata para TSV (cópia no Excel)

### **UI** (ui/)
- Renderiza HTML com nome do funcionário
- Cria cards por mês
- Cria tabelas por semana
- Adiciona botões de cópia

### **Utilitários**
- Manipulação de datas (formato BR)
- Conversão de horários (minutos ↔ HH:MM)
- Cópia para clipboard (com fallback)

---

## ⚙️ Tecnologias

- **Linguagem**: JavaScript (ES6+)
- **Frontend**: HTML + CSS (sem frameworks)
- **Padrão**: Modular (módulos ES6)
- **Compatibilidade**: Navegadores modernos + IE11 (fallback clipboard)

---

## 🐛 Tratamento de Erros

| Erro | Mensagem | Ação |
|------|----------|------|
| Textarea vazio | "Por favor, cole o texto do PDF." | Valida entrada |
| Nenhum dado | "Nenhum funcionário ou batida foi encontrado..." | Valida parsing |
| Erro geral | "Erro ao processar." | Log no console |

---

## 📝 Comentários no Código

Cada arquivo `.js` possui:
1. **Cabeçalho do módulo** - responsabilidade geral
2. **Comentários de função** - assinatura, parâmetros, exemplos
3. **Comentários inline** - lógica complexa ou não-óbvia
4. **Exemplos** - entrada/saída para facilitar uso

---

## 🔗 Ver Também

- [regras-vale.md](regras-vale.md) - Regras de processamento específicas
- Código comentado em `src/`

---

**Última atualização**: 17 de março de 2026  
**Versão**: v1 (processador-vale)
