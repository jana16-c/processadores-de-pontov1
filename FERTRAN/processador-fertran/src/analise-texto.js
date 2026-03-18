/**
 * @module analise-texto.js
 * @description Funções para análise e extração de informações do espelho de ponto
 */

/**
 * Remove espaços extras, quebras de linha e tabulações
 * Normaliza o texto para processamento consistente
 * @param {string} s - String para normalizar
 * @returns {string} String normalizada
 * @example
 * normalizeSpaces("Texto  com   espaços\r\n\r\n")
 * // → "Texto com espaços"
 */
function normalizeSpaces(s) {
  return (s || "")
    .replace(/\r\n/g, "\n")      // Windows line endings
    .replace(/\r/g, "\n")         // Old Mac line endings
    .replace(/[\t\f\v]+/g, " ")   // Tabs e espaços especiais
    .replace(/ +/g, " ");         // Múltiplos espaços
}

/**
 * Extrai apenas HH:MM de uma string HH:MM:SS
 * Ignora a parte de segundos
 * @param {string} hhmmss - String com horário completo
 * @returns {string} HH:MM ou string vazia se inválido
 * @example
 * onlyHHMM("08:30:45") // → "08:30"
 * onlyHHMM("18:45:00") // → "18:45"
 * onlyHHMM("invalid")  // → ""
 */
function onlyHHMM(hhmmss) {
  const m = /^([0-9]{2}):([0-9]{2})/.exec(hhmmss || "");
  return m ? `${m[1]}:${m[2]}` : "";
}

/**
 * Divide o texto por períodos de referência (Mês/Ano)
 * Procura padrões como "Período: 01/01/2026 à 31/01/2026"
 * @param {string} text - Texto completo do espelho
 * @returns {Array} Array de {periodStart, periodEnd, slice}
 * @example
 * splitByPeriods(texto)
 * // [
 * //   { periodStart: "01/01/2026", periodEnd: "31/01/2026", slice: "..." },
 * //   { periodStart: "01/02/2026", periodEnd: "28/02/2026", slice: "..." }
 * // ]
 */
function splitByPeriods(text) {
  // Padrão: "Período: DD/MM/YYYY à DD/MM/YYYY" (com opcionais: hora e hífen)
  const re = /Per[ií]odo:\s*(\d{2}\/\d{2}\/\d{4})(?:\s+\d{2}:\d{2}:\d{2})?\s*(?:à|-)\s*(\d{2}\/\d{2}\/\d{4})(?:\s+\d{2}:\d{2}:\d{2})?/gi;
  
  const matches = [];
  let m;
  
  // Encontra todos os períodos
  while ((m = re.exec(text)) !== null) {
    matches.push({
      idx: m.index,
      start: m[1],
      end: m[2]
    });
  }
  
  // Cria seções entre períodos encontrados
  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const a = matches[i];
    const b = matches[i + 1];
    const slice = text.slice(a.idx, b ? b.idx : text.length);
    sections.push({
      periodStart: a.start,
      periodEnd: a.end,
      slice
    });
  }
  
  // Se não encontrar períodos, usa primeira/última datas
  if (!sections.length) {
    const dtRe = /\d{2}\/\d{2}\/\d{4}/g;
    const dates = [];
    let d;
    while ((d = dtRe.exec(text)) !== null) {
      dates.push(d[0]);
    }
    const start = dates[0] || "01/01/2000";
    const end = dates[dates.length - 1] || start;
    sections.push({
      periodStart: start,
      periodEnd: end,
      slice: text
    });
  }
  
  return sections;
}

/**
 * Extrai o nome do funcionário do texto da seção
 * Procura padrão: "Funcionário: NOME CPF:"
 * @param {string} slice - Texto da seção/período
 * @returns {string} Nome do funcionário ou "FUNCIONÁRIO" como padrão
 * @example
 * extractEmployeeName(secaoTexto)
 * // → "João Silva"
 */
function extractEmployeeName(slice) {
  // Padrão: "Funcionário:" ou "Funcionário/Motorista:"
  const re = /Funcion[aá]rio(?:\s*\/\s*Motorista)?\s*:\s*([\s\S]+?)(?:\s*CPF\s*:|$)/mi;
  const m = re.exec(slice);
  
  if (m) {
    let raw = m[1].replace(/\r/g, "").trim();
    // Remove números (CPF) após o nome
    raw = raw.replace(/\n\s*\n[\s\S]*/, "").replace(/\s*\d{11}\s*.*/,  "");
    // Normaliza quebras de linha
    return raw.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  }
  
  return "FUNCIONÁRIO";
}

/**
 * Remove linhas de rodapé/cabeçalho do documento (paginação)
 * Remove padrões como "Pagina 1 de 10" e assinaturas digitais
 * @param {string} s - Texto para limpar
 * @returns {string} Texto limpo
 */
function cleanSliceForParsing(s) {
  return s
    .replace(/Pagina\s+\d+\s+de\s+\d+/gi, "")
    .replace(/Documento\s+assinado\s+eletronicamente[^\n]*/gi, "")
    .replace(/Fls\.?:\s*\d+/gi, "");
}

/**
 * Extrai jornadas de trabalho do texto
 * Encontra pares início/fim com "Jornada de Trabalho" e "Espera"
 * @param {string} slice - Texto da seção
 * @param {string} periodStart - DD/MM/YYYY início do período
 * @param {string} periodEnd   - DD/MM/YYYY fim do período
 * @returns {Array} Array de {startDate, startTime, endDate, endTime, func, msg}
 * @example
 * extractJourneys(texto, "01/03/2026", "31/03/2026")
 * // [{
 * //   startDate: "01/03/2026",
 * //   startTime: "08:30:45",
 * //   endDate: "01/03/2026",
 * //   endTime: "18:45:00",
 * //   func: "Jornada de Trabalho",
 * //   msg: "NORMAL"
 * // }]
 */
function extractJourneys(slice, periodStart, periodEnd) {
  const clean = cleanSliceForParsing(slice);
  
  // Coloca data e hora na mesma linha para facilitar extração
  const collapsed = clean.replace(
    /(\d{2}\/\d{2}\/\d{4})\s*\n\s*(\d{2}:\d{2}:\d{2})/g,
    "$1 $2"
  );
  
  const out = [];
  
  // Procura padrão: "Função: [tipo] Tipo/Macro Mensagem: [msg]"
  const funcRe = /Função:?\s*([^\n\r]+?)\s+(?:Macro\s+Mensagem:|Tipo)\s*:?\s*([^\n\r]+)/g;
  
  // Valida se está dentro do período permitido (±35 dias)
  const pStart = parseBRDate(periodStart);
  const pEnd = parseBRDate(periodEnd);
  const rangeStart = pStart ? addDays(pStart, -35) : null;
  const rangeEnd = pEnd ? addDays(pEnd, 35) : null;
  
  let m;
  while ((m = funcRe.exec(collapsed)) !== null) {
    const func = (m[1] || "").trim();
    const msg = (m[2] || "").trim();
    
    const idx = m.index;
    // Busca contexto anterior (1200 chars) para encontrar pares de data/hora
    const back = collapsed.slice(Math.max(0, idx - 1200), idx);
    
    // Encontra todos os pares data/hora no contexto
    const dtRe = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/g;
    const pairs = [];
    let d;
    while ((d = dtRe.exec(back)) !== null) {
      pairs.push({
        date: d[1],
        time: d[2],
        idx: d.index
      });
    }
    
    // Precisa de pelo menos 2 pares (entrada e saída)
    if (pairs.length < 2) continue;
    
    let usePairs = pairs;
    
    // Filtra por período se especificado
    if (rangeStart && rangeEnd) {
      const filtered = pairs.filter(p => {
        const dt = parseBRDate(p.date);
        return dt && dt >= rangeStart && dt <= rangeEnd;
      });
      if (filtered.length >= 2) usePairs = filtered;
    }
    
    // Usa pares próximos (últimos 600 chars)
    const nearPairs = usePairs.filter(p => (back.length - p.idx) < 600);
    if (nearPairs.length >= 2) usePairs = nearPairs;
    
    // Pega segundo-última (entrada) e última (saída)
    const start = usePairs[usePairs.length - 2];
    const end = usePairs[usePairs.length - 1];
    
    out.push({
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time,
      func,
      msg
    });
  }
  
  return out;
}

/**
 * Remove horários duplicados no mesmo dia em sequência
 * Remove pares entrada=saída (que indicam dia sem marcação)
 * @param {Array} arr - Array de horários HH:MM
 * @returns {Array} Array sem duplicatas
 * @example
 * suppressDuplicateTimesInDay(["08:00", "08:00", "12:00", "12:00"])
 * // → ["08:00", "12:00"]
 */
function suppressDuplicateTimesInDay(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return arr || [];
  
  const out = arr.slice();
  
  // Primeira pass: remove pares duplicados consecutivos
  for (let i = 0; i < out.length - 1; ) {
    if (out[i] && out[i] === out[i + 1]) {
      out.splice(i, 2);
      if (i > 0) i--;
    } else {
      i++;
    }
  }
  
  // Segunda pass: remove horários restantes que ocorrem em pares
  for (let i = 1; i < out.length; ) {
    if (out[i] === out[i - 1]) {
      out.splice(i, 1);
    } else {
      i++;
    }
  }
  
  return out;
}

// ─────────────────────────────────────────────────────────────
// Imports necessários (descomente se usar como módulo)
// ─────────────────────────────────────────────────────────────
/*
// De utilidades-data.js:
// import { parseBRDate, addDays } from './utilidades-data.js';
*/

// ─────────────────────────────────────────────────────────────
// Exports (se usar como módulo)
// ─────────────────────────────────────────────────────────────
/*
export {
  normalizeSpaces,
  onlyHHMM,
  splitByPeriods,
  extractEmployeeName,
  cleanSliceForParsing,
  extractJourneys,
  suppressDuplicateTimesInDay
};
*/
