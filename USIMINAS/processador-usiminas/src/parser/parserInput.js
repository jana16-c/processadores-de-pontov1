/**
 * @typedef {{
 *   data: Date, 
 *   times: string[], 
 *   isOffDay: boolean, 
 *   rawLine: string,
 *   plannedStart: string|null,
 *   plannedEnd: string|null
 * }} DayEntry
 * Representa um dia já interpretado pelo parser.
 * - data: Data JavaScript do dia
 * - times: Array de horários ["HH:MM", ...] (reais, sem planejado)
 * - isOffDay: true se FOLGA/DSR/FERIADO
 * - rawLine: Linha bruta do PDF (para debugging)
 * - plannedStart: Horário planejado de entrada (ex: "22:40")
 * - plannedEnd: Horário planejado de saída (ex: "06:50")
 */

/**
 * @typedef {Record<string, DayEntry[]>} ParsedMap
 * Mapa onde:
 * - chave: nome do funcionário (uppercase)
 * - valor: array ordenado de DayEntry
 */

/**
 * Interpreta o texto bruto do espelho de ponto da Usiminas.
 *
 * DESCRIÇÃO FUNCIONAL:
 * Esta função realiza a primeira e mais crítica transformação: de texto puro
 * (copiado do PDF) para dados estruturados. Percorre o texto linha por linha para:
 * - Identificar o nome do funcionário
 * - Identificar o período real do espelho (data início - data fim)
 * - Identificar todos os dias lançados
 * - Extrair os horários presentes em cada linha
 * - Filtrar corretamente batidas reais vs planejadas
 *
 * CONTEXTO DE USO:
 * É a PRIMEIRA grande etapa do processamento.
 * Sua saída alimenta diretamente a camada de regras de negócio (domain).
 * Sem um parseamento correto aqui, todo o resto falha.
 *
 * REGRAS APLICADAS:
 * 1. NOME DO FUNCIONÁRIO:
 *    - Extraído a partir de "Nome:", "Funcionário:" ou "Colaborador:"
 *    - Suporta formato "12345 - NOME" (remove ID)
 *    - Converte para UPPERCASE para padronizar
 *
 * 2. PERÍODO (data início até data fim):
 *    - Lê do cabeçalho em formato "Período de DD.MM.AAAA até DD.MM.AAAA"
 *    - Detecta automático se é dentro do mesmo mês ou cruza meses
 *    - Determina lógica de atualização de mês conforme dias reiniciam
 *
 * 3. BATIDAS REAIS vs PLANEJADAS:
 *    - Em linhas NORMAIS (com código de jornada tipo FIX046A):
 *      → Ignora os DOIS PRIMEIROS horários (planejado)
 *      → Preserva os demais (reais)
 *    - Em linhas ESPECIAIS (DSR, FOLGA, FERIADO):
 *      → Preserva TODOS os horários encontrados
 *
 * 4. CRUZAMENTO DE MESES:
 *    - Se período começa e termina no mesmo mês:
 *      → Todos os dias pertencem àquele mês
 *    - Se período cruza meses:
 *      → Dias maiores pertence ao mês inicial
 *      → Quando dias reiniciam (1 após 28/29/30/31) → próximo mês
 *      → Lógica de "rolling month"
 *
 * 5. VALIDAÇÃO DE DATA:
 *    - Rejeita datas após o fim do período (data > periodEnd)
 *
 * LIMITAÇÕES / OBSERVAÇÕES:
 * - Depende do layout textual ATUAL do espelho PDF
 * - Quebra se o PDF é rescanear e mudar formatação (espaçamento, regex)
 * - Pequenas mudanças de caso ("Funcionário" vs "FUNCIONÁRIO") podem não ser capturadas
 * - Não valida profundamente horários inválidos (tipo "99:99")
 * - Regex é sensível a acentos e caracteres especiais
 *
 * @param {string} text Texto bruto copiado do PDF (pode conter múltiplos espelhos).
 * @returns {ParsedMap} Mapa de funcionários para suas timelines.
 *
 * @example
 * const map = parseInput(textoDoEspelhoCompleto);
 * const timeline = map["MURILO AUGUSTO FERRAZ DUTRA"];
 * // timeline = [
 * //   { data: Date(2016, 10, 11), times: ["20:51", "03:54"] },
 * //   { data: Date(2016, 10, 12), times: ["15:30"], isOffDay: true }
 * // ]
 */
export function parseInput(text) {
    const map = {};

    const normalizedText = text
        .replace(/\r/g, '')
        .replace(/\u00A0/g, ' ');

    /*
      Divide o texto em blocos a partir de cada "Período de ... até ..."
      Assim cada espelho é processado isoladamente.
    */
    const periodRegex = /Per[ií]odo\s*de\s*\d{2}\.\d{2}\.\d{4}\s*at[eé]\s*\d{2}\.\d{2}\.\d{4}/gi;
    const matches = [...normalizedText.matchAll(periodRegex)];

    // Se não encontrou períodos, não há como montar datas
    if (!matches.length) return map;

    const sections = [];
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = (i + 1 < matches.length) ? matches[i + 1].index : normalizedText.length;
        sections.push(normalizedText.slice(start, end));
    }

    for (const section of sections) {
        parseSection(section, map);
    }

    return map;
}

/*
  Processa um único espelho de ponto.
*/
export function parseSection(sectionText, globalMap) {
    const lines = sectionText.split('\n');

    let currentName = null;

    let periodStartDay = null;
    let periodStartMonth = null;
    let periodStartYear = null;

    let periodEndDay = null;
    let periodEndMonth = null;
    let periodEndYear = null;

    let rollingMonth = null;
    let rollingYear = null;
    let lastParsedDay = null;

    const rgName = /(Colaborador|Funcionário|Funcionario|Nome)\s*:\s*(.+)/i;
    const rgPeriod = /Per[ií]odo\s*de\s*(\d{2})\.(\d{2})\.(\d{4})\s*at[eé]\s*(\d{2})\.(\d{2})\.(\d{4})/i;
    const rgDay = /^\s*(\d{2})\s+(Seg|Ter|Qua|Qui|Sex|Sáb|Sab|Dom)\b/i;

    let insideGrid = false;

    for (const rawLine of lines) {
        const l = rawLine.trim();
        if (!l) continue;

        // ===== PERÍODO =====
        const mPeriod = l.match(rgPeriod);
        if (mPeriod) {
            periodStartDay = parseInt(mPeriod[1], 10);
            periodStartMonth = parseInt(mPeriod[2], 10);
            periodStartYear = parseInt(mPeriod[3], 10);

            periodEndDay = parseInt(mPeriod[4], 10);
            periodEndMonth = parseInt(mPeriod[5], 10);
            periodEndYear = parseInt(mPeriod[6], 10);

            rollingMonth = periodStartMonth;
            rollingYear = periodStartYear;
            lastParsedDay = null;

            continue;
        }

        // ===== NOME =====
        const mName = l.match(rgName);
        if (mName) {
            let raw = mName[2].trim();

            // aceita 00064828 - GILVAN BARBOSA DA SILVA
            // aceita 40000623-MURILOAUGUSTOFERRAZDUTRA
            raw = raw.replace(/^\d+\s*-\s*/, '').trim();

            currentName = raw.toUpperCase();

            if (!globalMap[currentName]) {
                globalMap[currentName] = [];
            }

            continue;
        }

        /*
          Detecta o início da grade principal.
          Só depois disso vamos aceitar linhas de dia.
        */
        if (/^Data\s+Dia\s+Regra/i.test(l)) {
            insideGrid = true;
            continue;
        }

        /*
          Ao chegar em blocos de histórico/rodapé, paramos de ler a grade.
        */
        if (/^Registros referentes/i.test(l)) {
            insideGrid = false;
            continue;
        }
        if (/^N[uú]mero do processo/i.test(l)) {
            insideGrid = false;
            continue;
        }
        if (/^N[uú]mero do documento/i.test(l)) {
            insideGrid = false;
            continue;
        }
        if (/^https?:\/\//i.test(l)) {
            insideGrid = false;
            continue;
        }
        if (/^Assinado eletronicamente/i.test(l)) {
            insideGrid = false;
            continue;
        }
        if (/^ID\./i.test(l)) {
            insideGrid = false;
            continue;
        }
        if (/^Fls\.\s*:/i.test(l)) {
            insideGrid = false;
            continue;
        }

        if (!insideGrid) continue;

        // ===== LINHAS DE DIA =====
        const mDay = l.match(rgDay);
        if (
            mDay &&
            currentName &&
            periodStartMonth !== null &&
            periodStartYear !== null &&
            periodEndMonth !== null &&
            periodEndYear !== null
        ) {
            const day = parseInt(mDay[1], 10);
            let realMonth;
            let realYear;

            // mesmo mês
            if (
                periodStartMonth === periodEndMonth &&
                periodStartYear === periodEndYear
            ) {
                realMonth = periodStartMonth;
                realYear = periodStartYear;
            } else {
                // espelho corrido: quando o dia "reinicia", avança o mês
                if (lastParsedDay !== null && day < lastParsedDay) {
                    rollingMonth += 1;
                    if (rollingMonth > 12) {
                        rollingMonth = 1;
                        rollingYear += 1;
                    }
                }

                realMonth = rollingMonth;
                realYear = rollingYear;
            }

            lastParsedDay = day;

            const allTimes = l.match(/\d{2}:\d{2}/g) || [];
            let realTimes = [];
            let plannedStart = null;
            let plannedEnd = null;

            // Verifica estruturalmente se a linha possui o bloco de horário planejado (ex: FIX046A 22:45 07:05)
            const temHorarioPlanejado = /^\s*\d{2}\s+(Seg|Ter|Qua|Qui|Sex|Sáb|Sab|Dom)\s+\S+\s+\d{2}:\d{2}\s+\d{2}:\d{2}/i.test(l);

            if (temHorarioPlanejado) {
                // Se tem horário planejado, ignora os dois primeiros (mas os armazena)
                plannedStart = allTimes[0] || null;
                plannedEnd = allTimes[1] || null;
                realTimes = allTimes.slice(2);
            } else {
                // Dias de DSR ou FOLGA pura não possuem a dupla de horários após a regra
                realTimes = allTimes;
            }

            const entryDate = new Date(realYear, realMonth - 1, day);
            const endDate = new Date(periodEndYear, periodEndMonth - 1, periodEndDay);

            if (entryDate <= endDate) {
                const isOffDay = /FOLGA|DSR|FERIADO/i.test(l);

                globalMap[currentName].push({
                   data: entryDate,
                   times: realTimes,
                   rawLine: l,
                   isOffDay: isOffDay,
                   plannedStart: plannedStart,
                   plannedEnd: plannedEnd
