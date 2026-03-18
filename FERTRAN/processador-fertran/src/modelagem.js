/**
 * @module modelagem.js
 * @description Funções de construção de modelo de dados dos processadores
 * Implementa dois motores: COM ESPERA e SEM ESPERA
 */

/**
 * MOTOR 1: Processa COM tratamento de períodos de espera
 * 
 * Lógica:
 * 1. Identifica "Jornada de Trabalho" como entrada/saída
 * 2. Identifica "Espera" como períodos de espera
 * 3. Se houver "INICIO DE ESPERA" dentro de jornada: 
 *    substitui horário de saída
 * 4. Remove duplicatas e agrupa por mês
 * 
 * @param {string} rawText - Texto bruto do espelho de ponto
 * @returns {Array} Array de {name, refs: [{refKey, periodStart, periodEnd, days}]}
 */
function buildDataModelComEspera(rawText) {
  const text = normalizeSpaces(rawText).replace(/\n\s+\n/g, "\n\n");
  const sections = splitByPeriods(text);
  const persons = new Map();
  
  for (const sec of sections) {
    const name = extractEmployeeName(sec.slice);
    const periodStart = sec.periodStart;
    const periodEnd = sec.periodEnd;
    
    if (!persons.has(name)) persons.set(name, new Map());
    const byRef = persons.get(name);
    
    /**
     * Obtém ou cria referência para uma data específica
     * Agrupa por MM/YYYY
     */
    function getRefForDate(dateStr) {
      const dt = parseBRDate(dateStr);
      if (!dt) return null;
      
      const rk = `${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
      
      if (!byRef.has(rk)) {
        const ms = new Date(dt.getFullYear(), dt.getMonth(), 1);
        const me = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
        byRef.set(rk, {
          refKey: rk,
          periodStart: fmtBRDate(ms),
          periodEnd: fmtBRDate(me),
          days: new Map()
        });
      }
      return byRef.get(rk);
    }
    
    // Extrai jornadas com contexto de período
    const journeys = extractJourneys(sec.slice, periodStart, periodEnd);
    
    for (const j of journeys) {
      // Detecta tipo de registro
      const isJornada = /Jornada\s+de\s+Trabalho/i.test(j.func);
      const isEsperaWithinJornada = isJornada && /INICIO\s+DE\s+ESPERA/i.test(j.msg);
      const isEspera = /Espera/i.test(j.func) || isEsperaWithinJornada;
      
      // Processa apenas jornadas ou esperas
      if (!isJornada && !isEspera) continue;
      
      // Extrai apenas HH:MM (ignora segundos)
      const inHHMM = onlyHHMM(j.startTime);
      let outHHMM = onlyHHMM(j.endTime);
      
      // Se é jornada em dias diferentes e próximos: ajusta horário noturno
      if (isJornada && j.startDate !== j.endDate && isNextDay(j.startDate, j.endDate)) {
        const a = toMinutes(inHHMM);
        const b = toMinutes(outHHMM);
        if (a != null && b != null && b < a) {
          // Horário de saída de madrugada: adiciona 24h
          outHHMM = add24(outHHMM);
        }
      }
      
      // Validação: máximo 14 horas por jornada
      const MAX_PAIR_MIN = 14 * 60;
      {
        const a = toMinutes(inHHMM);
        const b = toMinutes(outHHMM);
        if (a != null && b != null) {
          let dur = b - a;
          const crossesDay = (String(j.startDate || "") !== String(j.endDate || ""));
          if (dur < 0) dur += 24 * 60;
          if (crossesDay && dur > MAX_PAIR_MIN) continue; // Descarta inválidos
        }
      }
      
      // Obtém referência para o mês
      const refObj = getRefForDate(j.startDate);
      if (!refObj) continue;
      
      const key = j.startDate;
      if (!refObj.days.has(key)) refObj.days.set(key, []);
      const arr = refObj.days.get(key);
      
      // Adiciona horários à jornada (não é espera dentro de jornada)
      if (isJornada && !isEsperaWithinJornada) {
        if (inHHMM) arr.push(inHHMM);
        if (outHHMM) arr.push(outHHMM);
      }
      
      // Se é espera: substitui último horário de saída se necessário
      if (isEspera && arr.length >= 2) {
        const lastIndex = arr.length - 1;
        const lastOut = arr[lastIndex];
        if (lastOut === inHHMM) {
          arr[lastIndex] = outHHMM;
        }
      }
    }
    
    // Pós-processamento: remove duplicatas dentro de cada dia
    for (const refObj of byRef.values()) {
      // Primeira pass: remove pares duplicados
      for (const [d, arr] of refObj.days.entries()) {
        if (!arr || arr.length < 2) continue;
        for (let i = 0; i < arr.length - 1; ) {
          if (arr[i] && arr[i] === arr[i + 1]) {
            arr.splice(i, 2);
          } else {
            i++;
          }
        }
        refObj.days.set(d, arr);
      }
      
      // Segunda pass: remove dias com entrada = saída (sem movimento)
      for (const [d, arr] of refObj.days.entries()) {
        if (arr && arr.length === 2 && arr[0] === arr[1]) {
          refObj.days.set(d, []);
        }
      }
    }
  }
  
  // Formata resultado final
  const result = [];
  for (const [name, refsMap] of persons.entries()) {
    const refs = [];
    for (const [refKey, obj] of refsMap.entries()) {
      refs.push(obj);
    }
    
    // Ordena por MM/YYYY
    refs.sort((a, b) => {
      const pa = /^(\d{2})\/(\d{4})$/.exec(a.refKey || "");
      const pb = /^(\d{2})\/(\d{4})$/.exec(b.refKey || "");
      const ya = pa ? parseInt(pa[2], 10) : 9999;
      const yb = pb ? parseInt(pb[2], 10) : 9999;
      const ma = pa ? parseInt(pa[1], 10) : 99;
      const mb = pb ? parseInt(pb[1], 10) : 99;
      if (ya !== yb) return ya - yb;
      return ma - mb;
    });
    
    result.push({ name, refs });
  }
  
  // Ordena por nome
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

/**
 * MOTOR 2: Processa SEM incluir períodos de espera
 * 
 * Lógica:
 * 1. Identifica APENAS "Jornada de Trabalho"
 * 2. IGNORA completamente períodos de "Espera"
 * 3. Remove duplicatas simples
 * 4. Agrupa por mês
 * 
 * @param {string} rawText - Texto bruto do espelho de ponto
 * @returns {Array} Array de {name, refs: [{refKey, periodStart, periodEnd, days}]}
 */
function buildDataModelSemEspera(rawText) {
  const text = normalizeSpaces(rawText).replace(/\n\s+\n/g, "\n\n");
  const sections = splitByPeriods(text);
  const persons = new Map();
  
  for (const sec of sections) {
    const name = extractEmployeeName(sec.slice);
    const periodStart = sec.periodStart;
    const periodEnd = sec.periodEnd;
    
    if (!persons.has(name)) persons.set(name, new Map());
    const byRef = persons.get(name);
    
    function getRefForDate(dateStr) {
      const dt = parseBRDate(dateStr);
      if (!dt) return null;
      const rk = `${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
      if (!byRef.has(rk)) {
        const ms = new Date(dt.getFullYear(), dt.getMonth(), 1);
        const me = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
        byRef.set(rk, {
          refKey: rk,
          periodStart: fmtBRDate(ms),
          periodEnd: fmtBRDate(me),
          days: new Map()
        });
      }
      return byRef.get(rk);
    }
    
    const journeys = extractJourneys(sec.slice, periodStart, periodEnd);
    
    for (const j of journeys) {
      // DIFERENÇA: Processa APENAS jornadas de trabalho
      const isJornada = /Jornada\s+de\s+Trabalho/i.test(j.func);
      if (!isJornada) continue; // Ignora esperas
      
      const inHHMM = onlyHHMM(j.startTime);
      let outHHMM = onlyHHMM(j.endTime);
      
      // Ajusta horários noturnos
      if (j.startDate !== j.endDate && isNextDay(j.startDate, j.endDate)) {
        const a = toMinutes(inHHMM);
        const b = toMinutes(outHHMM);
        if (a != null && b != null && b < a) {
          outHHMM = add24(outHHMM);
        }
      }
      
      // Validação de duração
      const MAX_PAIR_MIN = 14 * 60;
      {
        const a = toMinutes(inHHMM);
        const b = toMinutes(outHHMM);
        if (a != null && b != null) {
          let dur = b - a;
          const crossesDay = (String(j.startDate || "") !== String(j.endDate || ""));
          if (dur < 0) dur += 24 * 60;
          if (crossesDay && dur > MAX_PAIR_MIN) {
            continue;
          }
        }
      }
      
      const refObj = getRefForDate(j.startDate);
      if (!refObj) continue;
      
      const key = j.startDate;
      if (!refObj.days.has(key)) refObj.days.set(key, []);
      const arr = refObj.days.get(key);
      
      // Simples: adiciona entrada e saída
      if (inHHMM) arr.push(inHHMM);
      if (outHHMM) arr.push(outHHMM);
    }
    
    // Pós-processamento com supressão de duplicatas mais agressiva
    for (const refObj of byRef.values()) {
      for (const [d, arr] of refObj.days.entries()) {
        refObj.days.set(d, suppressDuplicateTimesInDay(arr));
      }
      
      // Remove dias com entrada = saída
      for (const [d, arr] of refObj.days.entries()) {
        if (arr && arr.length === 2 && arr[0] === arr[1]) {
          refObj.days.set(d, []);
        }
      }
    }
  }
  
  // Formatação final (idêntica ao COM ESPERA)
  const result = [];
  for (const [name, refsMap] of persons.entries()) {
    const refs = [];
    for (const [refKey, obj] of refsMap.entries()) {
      refs.push(obj);
    }
    refs.sort((a, b) => {
      const pa = /^(\d{2})\/(\d{4})$/.exec(a.refKey || "");
      const pb = /^(\d{2})\/(\d{4})$/.exec(b.refKey || "");
      const ya = pa ? parseInt(pa[2], 10) : 9999;
      const yb = pb ? parseInt(pb[2], 10) : 9999;
      const ma = pa ? parseInt(pa[1], 10) : 99;
      const mb = pb ? parseInt(pb[1], 10) : 99;
      if (ya !== yb) return ya - yb;
      return ma - mb;
    });
    result.push({ name, refs });
  }
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

// ─────────────────────────────────────────────────────────────
// Imports necessários
// ─────────────────────────────────────────────────────────────
/*
// De utilidades-data.js:
// import { parseBRDate, fmtBRDate, addDays, isNextDay, toMinutes, add24 } from './utilidades-data.js';

// De analise-texto.js:
// import { 
//   normalizeSpaces, onlyHHMM, splitByPeriods, 
//   extractEmployeeName, extractJourneys, suppressDuplicateTimesInDay
// } from './analise-texto.js';
*/

// ─────────────────────────────────────────────────────────────
// Exports (se usar como módulo)
// ─────────────────────────────────────────────────────────────
/*
export {
  buildDataModelComEspera,
  buildDataModelSemEspera
};
*/
