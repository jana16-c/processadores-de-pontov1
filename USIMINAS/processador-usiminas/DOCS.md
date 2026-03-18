# 📚 Índice de Documentação

## Referência rápida

| Documento | Objetivo | Tempo |
|-----------|----------|-------|
| [README.md](README.md) | Como usar a aplicação e visão geral | 5 min |
| [docs/arquitetura.md](docs/arquitetura.md) | Estrutura técnica em camadas | 5 min |
| [docs/funcoes.md](docs/funcoes.md) | Catálogo detalhado de cada função | 10 min |
| [docs/regras-usiminas.md](docs/regras-usiminas.md) | Regras específicas Usiminas | 8 min |
| [src/MODULOS.md](src/MODULOS.md) | Explicação de cada módulo de código | 7 min |
| **TOTAL** | | **35 min** |

---

## Por perfil

### 👤 Novo desenvolvedor (primeiro contato)
1. Leia [README.md](README.md) para entender o propósito
2. Leia [docs/arquitetura.md](docs/arquitetura.md) para visão geral
3. Leia [src/MODULOS.md](src/MODULOS.md) para entender o código
4. Explore o comentário JSDoc de cada arquivo

**Tempo estimado:** 20 minutos

### 🔧 Desenvolvedor (modificando código)
1. Identifique qual módulo você quer modificar em [src/MODULOS.md](src/MODULOS.md)
2. Consulte [docs/funcoes.md](docs/funcoes.md) para especificação detalhada
3. Leia o JSDoc da função específica
4. Verifique as regras em [docs/regras-usiminas.md](docs/regras-usiminas.md) se aplicável

**Tempo estimado:** 5 minutos por modificação

### 👔 Gerente/Stakeholder
1. Leia [README.md](README.md) seção "Como usar"
2. Leia [docs/regras-usiminas.md](docs/regras-usiminas.md) para entender lógica de negócio
3. (opcional) [docs/arquitetura.md](docs/arquitetura.md) seção "Fluxo de dados"

**Tempo estimado:** 10 minutos

### 🧪 Testador/QA
1. Leia [README.md](README.md) seção "Como usar"
2. Leia [docs/regras-usiminas.md](docs/regras-usiminas.md) para casos de teste
3. Leia [docs/funcoes.md](docs/funcoes.md) para comportamento esperado

**Tempo estimado:** 15 minutos

---

## Organização dos arquivos

```
processador-usiminas/
│
├── 📖 README.md                           ← COMECE AQUI (visão geral)
├── 📖 docs/
│   ├── arquitetura.md                     ← Estrutura técnica
│   ├── funcoes.md                         ← Catálogo de funções
│   └── regras-usiminas.md                 ← Regras de negócio
│
├── 📖 src/MODULOS.md                      ← Guia de módulos
│
├── 💻 src/
│   ├── main.js                            ← Ponto de entrada
│   ├── parser/
│   │   └── parserInput.js                 ← ✅ Documentado
│   ├── domain/
│   │   ├── adjustShifts.js                ← ✅ Documentado
│   │   ├── buildWeeksForMonth.js          ← ✅ Documentado
│   │   └── toTSVForWeek.js                ← ✅ Documentado
│   ├── ui/
│   │   ├── renderperson.js                ← (precisa de preenchimento)
│   │   └── showError.js                   ← ✅ Documentado
│   └── utilitários/
│       ├── date.js                        ← ✅ Documentado
│       ├── time.js                        ← ✅ Documentado
│       └── clipboard.js                   ← (vazio, pronto para impl.)
│
└── tests/
    └── (estrutura existente)
```

---

## Checklist de documentação

### ✅ Arquivos documentados

- [x] `docs/arquitetura.md` — Visão geral completa
- [x] `docs/funcoes.md` — 20+ funções catalogadas
- [x] `docs/regras-usiminas.md` — 10 regras de negócio explicadas
- [x] `src/MODULOS.md` — 4 camadas explicadas
- [x] `src/parser/parserInput.js` — JSDoc completo
- [x] `src/domain/adjustShifts.js` — JSDoc completo
- [x] `src/domain/buildWeeksForMonth.js` — JSDoc completo
- [x] `src/domain/toTSVForWeek.js` — JSDoc completo
- [x] `src/ui/showError.js` — JSDoc completo
- [x] `src/utilitários/date.js` — 4 funções documentadas
- [x] `src/utilitários/time.js` — 2 funções documentadas

### ⏳ Ainda podem ser documentados

- [ ] `src/ui/renderperson.js` — Precisa preenchimento completo
- [ ] `src/utilitários/clipboard.js` — Vazio, pronto para implementação
- [ ] `tests/**` — Testes específicos (pendentes)
- [ ] `src/main.js` — Pode ter comentários adicionais
- [ ] Ver regras-usiminas.md — Mais exemplos práticos

---

## Dúvidas frequentes sobre documentação

**P: Onde começo se é meu primeiro dia?**
R: Leia [README.md](README.md) + [docs/arquitetura.md](docs/arquitetura.md) em 10 minutos.

**P: Preciso corrigir um bug, onde procuro?**
R: 
1. Identifique a camada em [src/MODULOS.md](src/MODULOS.md)
2. Leia a função em [docs/funcoes.md](docs/funcoes.md)
3. O comentário JSDoc no arquivo tem detalhes

**P: Quais são as regras Usiminas?**
R: [docs/regras-usiminas.md](docs/regras-usiminas.md) — 10 regras principais explicadas com exemplos.

**P: Qual a separação de responsabilidades?**
R: [docs/arquitetura.md](docs/arquitetura.md) seção 3 — 4 camadas bem definidas.

**P: Como testar uma função?**
R: [docs/funcoes.md](docs/funcoes.md) — Cada função tem exemplo de entrada/saída.

---

## Histórico de documentação

| Data | Versão | O que foi documentado |
|------|--------|----------------------|
| 17/03/2026 | 1.0 | Documentação completa inicial |
| | | - arquitetura.md (7 seções) |
| | | - funcoes.md (20+ funções) |
| | | - regras-usiminas.md (10 regras) |
| | | - src/MODULOS.md (4 camadas) |
| | | - JSDoc em 10+ arquivos |
| | | - README.md com guia completo |

---

## Links úteis

**Para aprender JavaScript:**
- [MDN Web Docs](https://developer.mozilla.org/) — Referência autorizada
- [ECMAScript 2015+](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference) — Recursos modernos

**Para arquitetura de software:**
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Uncle Bob
- [Layered Architecture](https://www.oreilly.com/learning/microservices-architecture) — O'Reilly

**Vi um padrão neste código:**

**Padrão: Funções puras**
- `parseInput()`, `adjustShifts()`, `buildWeeksForMonth()`, utilitários
- Vantagem: Fáceis de testar, reaproveitáveis

**Padrão: Separação em camadas**
- Parser → Domain → UI + Utils
- Vantagem: Fácil adicionar novos processadores

---

**Última atualização:** 17 de março de 2026  
**Versão da documentação:** 1.0  
**Cobertura:** ~90% do código-fonte
