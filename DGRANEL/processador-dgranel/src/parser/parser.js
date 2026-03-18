/**
 * @file parser.js
 * @description Módulo responsável por extrair e parsear dados brutos do texto do PDF
 * @version 1.0.0
 */

/**
 * Normaliza espaços em branco e quebras de linha
 * Converte todos os tipos de quebras (\r\n, \r, \n) para \n
 * Remove tabs, form feeds e espaços múltiplos
 * 
 * @param {string} s - Texto a normalizar
 * @returns {string} Texto com espaços padronizados
 * 
 * @example
 * normalizeSpaces("texto  123\t456\n\n789")
 * // Returns: "texto 123 456 789"
 */
function normalizeSpaces(s) {
  return (s || "")
    .replace(/\r\n/g, "\n")           // Windows → Unix
    .replace(/\r/g, "\n")             // Mac → Unix
    .replace(/[\t\f\v]+/g, " ")       // Remove tabs/form feeds
    .replace(/ +/g, " ");             // Multiple spaces → single
}

/**
 * Divide o texto em seções por períodos de data
 * Procura pelo padrão: "Período: DD/MM/YYYY HH:MM:SS à DD/MM/YYYY HH:MM:SS"
 * Retorna as seções entre períodos consecutivos
 * 
 * @param {string} text - Texto completo do espelho de ponto
 * @returns {Array<Object>} Array com { periodStart, periodEnd, slice }
 * 
 * @example
 * splitByPeriods("Período: 01/03/2026 00:00:00 à 07/03/2026 23:59:59\n...")
 * // Returns: [{ periodStart: "01/03/2026", periodEnd: "07/03/2026", slice: "..." }]
 */
function splitByPeriods(text) {
  const re = /Período:\s*(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}\s+à\s+(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/g;
  const matches = [];
  let m;
  
  // Encontra todos os períodos
  while ((m = re.exec(text)) !== null) {
    matches.push({ idx: m.index, start: m[1], end: m[2] });
  }
  
  // Cria seções entre períodos consecutivos
  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const a = matches[i];
    const b = matches[i + 1];
    const slice = text.slice(a.idx, b ? b.idx : text.length);
    sections.push({ periodStart: a.start, periodEnd: a.end, slice });
  }
  
  return sections;
}

/**
 * Extrai o nome do funcionário de uma seção de texto
 * Procura pelo padrão: "Funcionário / Motorista: [NOME] [número]"
 * 
 * @param {string} slice - Seção de texto contendo dados do funcionário
 * @returns {string} Nome do funcionário ou "FUNCIONÁRIO NÃO IDENTIFICADO"
 * 
 * @example
 * extractEmployeeName("Funcionário / Motorista: JOÃO MARIA SILVA 2023 Função...")
 * // Returns: "JOÃO MARIA SILVA"
 */
function extractEmployeeName(slice) {
  const re = /Funcion[aá]rio\s*\/\s*Motorista:\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+?)\s+\d/;
  const m = re.exec(slice);
  
  if (m) {
    return m[1]
      .trim()
      .replace(/\s+/g, " ");  // Remove espaços múltiplos
  }
  
  return "FUNCIONÁRIO NÃO IDENTIFICADO";
}

/**
 * Extrai todas as jornadas e períodos de espera de uma seção
 * Procura pelo padrão: "Função: [texto] Macro Mensagem: [texto]"
 * Busca datas/horas nos ~1200 caracteres anteriores
 * 
 * @param {string} slice - Seção contendo jornadas
 * @param {string} periodStart - Data inicial "DD/MM/YYYY"
 * @param {string} periodEnd - Data final "DD/MM/YYYY"
 * @returns {Array<Object>} Array com { startDate, startTime, endDate, endTime, func, msg }
 * 
 * @example
 * extractJourneys(slice, "01/03/2026", "31/03/2026")
 * // Returns: [{
 * //   startDate: "01/03/2026", startTime: "08:00:15",
 * //   endDate: "01/03/2026", endTime: "12:00:45",
 * //   func: "Jornada de Trabalho",
 * //   msg: "SAÍDA DO LOCAL DE TRABALHO"
 * // }]
 */
function extractJourneys(slice, periodStart, periodEnd) {
  const out = [];
  const funcRe = /Função:\s*([^\n\r]+?)\s+Macro\s+Mensagem:\s*([^\n\r]+)/g;

  // Calcula intervalo válido ±2 dias do período oficial
  const pStart = parseBRDate(periodStart);
  const pEnd = parseBRDate(periodEnd);
  const rangeStart = pStart ? addDays(pStart, -2) : null;
  const rangeEnd = pEnd ? addDays(pEnd, 2) : null;

  let m;
  while ((m = funcRe.exec(slice)) !== null) {
    const func = (m[1] || "").trim();
    const msg = (m[2] || "").trim();

    // Busca datas/horas nos últimos 1200 chars
    const idx = m.index;
    const back = slice.slice(Math.max(0, idx - 1200), idx);

    // Extrai todos os pares de data/hora encontrados
    const dtRe = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/g;
    const pairs = [];
    let d;
    while ((d = dtRe.exec(back)) !== null) {
      pairs.push({ date: d[1], time: d[2] });
    }
    
    if (pairs.length < 2) continue;

    // Filtra pares dentro do intervalo válido
    let usePairs = pairs;
    if (rangeStart && rangeEnd) {
      const filtered = pairs.filter(p => {
        const dt = parseBRDate(p.date);
        return dt && dt >= rangeStart && dt <= rangeEnd;
      });
      if (filtered.length >= 2) usePairs = filtered;
    }

    // Pega os últimos dois pares (entrada e saída)
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
 * Extrai apenas HH:MM de um horário HH:MM:SS
 * Remove os segundos mantendo horas e minutos
 * 
 * @param {string} hhmmss - Horário em formato HH:MM:SS
 * @returns {string} Horário em formato HH:MM ou ""
 * 
 * @example
 * onlyHHMM("14:30:45")    // Returns: "14:30"
 * onlyHHMM("08:00:00")    // Returns: "08:00"
 * onlyHHMM("invalid")     // Returns: ""
 */
function onlyHHMM(hhmmss) {
  const m = /^([0-9]{2}):([0-9]{2})/.exec(hhmmss || "");
  return m ? `${m[1]}:${m[2]}` : "";
}

// Exportar como module.exports (se usar Node.js) ou deixar como global (para navegador)
// module.exports = { normalizeSpaces, splitByPeriods, extractEmployeeName, extractJourneys, onlyHHMM };
