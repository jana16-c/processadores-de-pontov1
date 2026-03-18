# Processador de Ponto Usiminas

Aplicação para processar espelhos de ponto em PDF da Usiminas e exportar dados estruturados para análise e cópia no Excel.

## 📋 Objetivo

Transformar relatórios textuais de espelho de ponto em dados organizados por:
- Funcionário
- Mês
- Semana (seg→dom)
- Batidas para cópia direta no Excel (formato TSV)

---

## 🚀 Como usar

1. **Abra** o arquivo `index.html` no navegador
2. **Cole** o texto completo do PDF do espelho de ponto no textarea
3. **Clique** em "Processar"
4. **Copie** cada semana desejada com o botão "Copiar semana"
5. **Cole** no Excel/Sheets

---

## 📚 Documentação

### Para entender o projeto:

| Documento | Objetivo |
|-----------|----------|
| **[arquitetura.md](docs/arquitetura.md)** | Visão geral da estrutura em camadas e responsabilidades |
| **[funcoes.md](docs/funcoes.md)** | Catálogo detalhado de cada função (entrada, saída, regras) |
| **[regras-usiminas.md](docs/regras-usiminas.md)** | Regras específicas do sistema Usiminas (batidas, virada, etc) |

### Para entender o código:

| Documento | Foco |
|-----------|------|
| **[src/MODULOS.md](src/MODULOS.md)** | Explicação de cada módulo e dependências |
| **Comentários no código** | JSDoc detalhado em cada função |

### Para começar a modificar:

1. Leia [arquitetura.md](docs/arquitetura.md) para visão geral
2. Leia [src/MODULOS.md](src/MODULOS.md) para entender dependências
3. Leia o módulo específico que quer modificar
4. Consulte [funcoes.md](docs/funcoes.md) para detalhes de cada função

---

## 🗂️ Estrutura do projeto

```
processador-usiminas/
├── index.html              # Interface HTML (versão atual)
├── indexv2.html            # Versão alternativa
├── jsconfig.json           # Config para editor
├── package.json            # Metadados do projeto
│
├── src/                    # Código-fonte
│   ├── main.js             # Ponto de entrada (processData())
│   ├── MODULOS.md          # 📖 Guia de módulos
│   │
│   ├── parser/             # Camada 1: Extração de dados brutos
│   │   └── parserInput.js  # Função parseInput()
│   │
│   ├── domain/             # Camada 2: Lógica de negócio
│   │   ├── adjustShifts.js      # Fecha jornadas noturnas
│   │   ├── buildWeeksForMonth.js # Estrutura semanas
│   │   └── toTSVForWeek.js       # Formato TSV para Excel
│   │
│   ├── ui/                 # Camada 3: Renderização
│   │   ├── renderperson.js # Monta visual do funcionário
│   │   └── showError.js    # Exibe erros
│   │
│   └── utilitários/        # Camada 4: Funções auxiliares
│       ├── date.js         # Manipulação de datas
│       ├── time.js         # Conversão de horários
│       └── clipboard.js    # Cópia para área de transferência
│
├── docs/                   # Documentação
│   ├── arquitetura.md      # 📖 Visão geral técnica
│   ├── funcoes.md           # 📖 Catálogo de funções
│   └── regras-usiminas.md  # 📖 Regras de negócio
│
└── tests/                  # Testes unitários
    ├── parseInput.test.js
    ├── adjustShifts.test.js
    └── fixtures/           # Dados de teste
```

---

## 🔄 Fluxo de dados

```
┌──────────────────────────┐
│ 1. Texto do PDF          │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│ 2. parseInput()  [PARSER]               │
│    ↓ Extrai funcionários e dias         │
│    ↓ Remove batidas planejadas          │
│    ↓ Detecta cruzamento de meses        │
└───────────┬───────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│ 3. adjustShifts()  [DOMAIN]             │
│    ↓ Fecha jornadas noturnas            │
│    ↓ Converte para +24h                 │
└───────────┬───────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│ 4. renderPerson()  [UI]                │
│    ├─ buildWeeksForMonth()  [DOMAIN]   │
│    ├─ toTSVForWeek()  [DOMAIN]         │
│    └─ Monta HTML + botões              │
└───────────┬───────────────────────────────┘
            │
            ▼
┌──────────────────────────┐
│ 5. Página interativa     │
│    com botões de cópia   │
└──────────────────────────┘
```

---

## 🎯 Arquitetura em camadas

### Camada 1: Parser (src/parser/)
**Responsabilidade:** Converter texto bruto → dados estruturados

- `parseInput()` — Única função pública
- Dependências: nenhuma (pura)
- Saída: ParsedMap { "NOME": [DayEntry, ...], ... }

### Camada 2: Domain (src/domain/)
**Responsabilidade:** Aplicar regras de negócio

- `adjustShifts()` — Fecha jornadas noturnas
- `buildWeeksForMonth()` — Organiza em semanas
- `toTSVForWeek()` — Converte para TSV
- Dependências: utilitários apenas

### Camada 3: UI (src/ui/)
**Responsabilidade:** Renderizar e interagir

- `renderPerson()` — Monta visual do funcionário
- `showError()` — Exibe mensagens de erro
- Dependências: domain + utilitários + DOM

### Camada 4: Utilitários (src/utilitários/)
**Responsabilidade:** Funcões genéricas de suporte

- `fmtBRDate()`, `addDays()`, `mondayOf()` — Datas
- `toMin()` — Conversão de horários
- Dependências: nenhuma (pura)

---

## 🔍 Conceitos-chave

### Batida real vs planejada

Em dias normais, o espelho contém:
```
11 Seg FIX046A 22:45 07:05 20:51 03:54
                     ↑    ↑    ↑    ↑
                 planejado|__real__|
```

O processador **descarta** os 2 primeiros (planejado) e **preserva** os demais (real).

Em dias especiais (DSR/FOLGA), **preserva tudo**.

### Virada noturna

Quando um empregado trabalha de noite:
```
Entra 20:51 (segunda) → Sai 03:54 (terça)
```

O sistema:
1. Detecta que terça tem 1 batida (ímpar)
2. Move 03:54 para segunda com transformação: 03:54 + 24h = 27:54
3. Resultado: segunda tem [20:51, 27:54] (fechada)

### Cruzamento de meses

Se período é "01.11 até 30.11" mas há dias como 1, 2, ... após 28-30-31:
1. Sistema detecta reinício de dias
2. Muda mês automaticamente
3. Dias 1-15 (2º período) → dezembro

---

## 🧪 Testes

Testes estão em `tests/`:

```bash
# Executar testes (require Node.js)
npm test
```

**Estrutura esperada:**
- `parseInput.test.js` — Testes de parsing
- `adjustShifts.test.js` — Testes de ajuste de jornadas
- `fixtures/` — Dados de exemplo

---

## 🚧 Próximas melhorias

- [ ] Implementar `clipboard.js` (cópia para área de transferência)
- [ ] Validação de horários (24:00 é inválido?)
- [ ] Detecção de jornadas biologicamente impossíveis
- [ ] Modo escuro/claro
- [ ] Exportação em outros formatos (CSV, JSON)
- [ ] Testes de UI
- [ ] Dark mode

---

## 📖 Guia de leitura recomendado

**Se quer entender o projeto:**
1. [arquitetura.md](docs/arquitetura.md) — 5 minutos
2. Este README — 3 minutos
3. [regras-usiminas.md](docs/regras-usiminas.md) — 5 minutos

**Se quer modificar uma função:**
1. [src/MODULOS.md](src/MODULOS.md) — Para ver dependências
2. [funcoes.md](docs/funcoes.md) — Para ver especificação
3. O comentário JSDoc no arquivo — Para contexto

**Se quer adicionar nova funcionalidade:**
1. [arquitetura.md](docs/arquitetura.md) — Para decidir em qual camada
2. [src/MODULOS.md](src/MODULOS.md) — Para entender dependências
3. Crie novo arquivo com JSDoc detalhado

---

## 📝 Notas de desenvolvimento

- **Imutabilidade:** Funções em `domain/` e `utilitários/` não mutam entrada
- **Pureza:** `parseInput()` e utilitários são funções puras
- **Testabilidade:** Cada módulo pode ser testado isoladamente
- **Reaproveitamento:** Domain e utilitários são agnósticos ao processador

---

## 📞 Suporte

Para dúvidas sobre:
- **Funcionamento:** Consulte [funcoes.md](docs/funcoes.md)
- **Regras Usiminas:** Consulte [regras-usiminas.md](docs/regras-usiminas.md)
- **Arquitetura:** Consulte [arquitetura.md](docs/arquitetura.md)
- **Módulos:** Consulte [src/MODULOS.md](src/MODULOS.md)

---

**Última atualização:** Março 2026
