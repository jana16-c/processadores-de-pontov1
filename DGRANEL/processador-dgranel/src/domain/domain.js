/**
 * @file domain.js
 * @description Módulo com a lógica de negócio principal - processamento de dados de ponto
 * Implementa dois modelos de processamento: Com Espera e Sem Espera
 * @version 1.0.0
 */

// ==========================================
// MOTOR 1: PROCESSAMENTO COM ESPERA
// ==========================================

/**
 * Constrói modelo de dados INCLUINDO períodos de espera como parte da jornada
 * 
 * Fluxo:
 * 1. Normaliza texto e divide por períodos
 * 2. Para cada período, extrai funcionário e jornadas
 * 3. Identifica jornadas de trabalho e períodos de espera
 * 4. Se "INICIO DE ESPERA" está dentro de jornada, substitui saída
 * 5. Valida períodos máximos de 14 horas
 * 6. Remove duplicatas e períodos inválidos
 * 7. Organiza em estrutura hierárquica: pessoa → referência → dias
 * 
 * @param {string} rawText - Texto bruto do espelho de ponto do PDF
 * @returns {Array<Object>} Array com pessoas e suas referências
 *   [{
 *     name: "JOÃO SILVA",
 *     refs: [{
 *       refKey: "03/2026",
 *       periodStart: "01/03/2026",
 *       periodEnd: "31/03/2026",
 *       days: Map { "01/03/2026" => ["08:00", "17:00"], ... }
 *     }]
 *   }]
 * 
 * @comment Lógica especial:
 * - isJornada: /Jornada\s+de\s+Trabalho/i
 * - isEspera: /Espera/i ou (isJornada && /INICIO\s+DE\s+ESPERA/i)
 * - Se dentro de jornada + espera, substitui o saída anterior
 * - Valida máximo de 14 horas (86400000 ms)
 * - Filtra períodos que cruzam dias com duração > 14h
 */
function buildDataModelComEspera(rawText) {
  const text = normalizeSpaces(rawText).replace(/\n\s+\n/g, "\n\n");
  const sections = splitByPeriods(text);
  const persons = new Map();  // pessoa → (refKey → Reference)

  for (const sec of sections) {
    const name = extractEmployeeName(sec.slice);
    const periodStart = sec.periodStart;
    const periodEnd = sec.periodEnd;
    const endDt = parseBRDate(periodEnd);
    const refKey = endDt
      ? `${String(endDt.getMonth() + 1).padStart(2, "0")}/${endDt.getFullYear()}`
      : `??/????`;

    // Cria estrutura para pessoa
    if (!persons.has(name)) persons.set(name, new Map());
    const byRef = persons.get(name);
    
    // Cria referência se não existe
    if (!byRef.has(refKey)) {
      byRef.set(refKey, {
        refKey,
        periodStart,
        periodEnd,
        days: new Map()  // data → array de horários
      });
    }
    const refObj = byRef.get(refKey);

    // Extrai jornadas da seção
    const journeys = extractJourneys(sec.slice, periodStart, periodEnd);
    
    for (const j of journeys) {
      const isJornada = /Jornada\s+de\s+Trabalho/i.test(j.func);
      const isEsperaWithinJornada = isJornada && /INICIO\s+DE\s+ESPERA/i.test(j.msg);
      const isEspera = /Espera/i.test(j.func) || isEsperaWithinJornada;

      // Ignora se não é jornada nem espera
      if (!isJornada && !isEspera) continue;

      // Converte horários
      const inHHMM = onlyHHMM(j.startTime);
      let outHHMM = onlyHHMM(j.endTime);

      // Ajusta saída para próximo dia se necessário
      if (j.startDate !== j.endDate && isNextDay(j.startDate, j.endDate)) {
        const a = toMinutes(inHHMM);
        const b = toMinutes(outHHMM);
        if (a != null && b != null && b < a) {
          outHHMM = add24(outHHMM);  // "02:00" → "26:00"
        }
      }

      // Valida duração máxima de 14 horas
      const MAX_PAIR_MIN = 14 * 60;  // 840 minutos
      {
        const a = toMinutes(inHHMM);
        const b = toMinutes(outHHMM);
        if (a != null && b != null) {
          let dur = b - a;
          const crossesDay = (String(j.startDate || "") !== String(j.endDate || ""));
          if (dur < 0) dur += 24 * 60;
          if (crossesDay && dur > MAX_PAIR_MIN) continue;  // Período muito longo = erro
        }
      }

      // Adiciona ao mapa de dias
      const key = j.startDate;
      if (!refObj.days.has(key)) refObj.days.set(key, []);
      const arr = refObj.days.get(key);

      // Lógica: jornada = adiciona ambos entrada/saída
      if (isJornada && !isEsperaWithinJornada) {
        if (inHHMM) arr.push(inHHMM);
        if (outHHMM) arr.push(outHHMM);
      }

      // Lógica: espera dentro de jornada = substitui saída anterior
      if (isEspera && arr.length >= 2) {
        const lastIndex = arr.length - 1;
        const lastOut = arr[lastIndex];
        if (lastOut === inHHMM) {
          arr[lastIndex] = outHHMM;  // Substitui saída por saída de espera
        }
      }
    }

    // Remove pares duplicados no mesmo dia
    for (const [d, arr] of refObj.days.entries()) {
      if (!arr || arr.length < 2) continue;
      for (let i = 0; i < arr.length - 1;) {
        if (arr[i] && arr[i] === arr[i + 1]) {
          arr.splice(i, 2);  // Remove par duplicado
        } else {
          i++;
        }
      }
      refObj.days.set(d, arr);
    }

    // Remove períodos onde entrada = saída
    for (const [d, arr] of refObj.days.entries()) {
      if (arr && arr.length === 2 && arr[0] === arr[1]) {
        refObj.days.set(d, []);  // Limpa dia com período inválido
      }
    }
  }

  // Filtra pessoas com dados válidos
  function hasAnyPunches(daysMap) {
    if (!daysMap || typeof daysMap.entries !== "function") return false;
    for (const [, arr] of daysMap.entries()) {
      if (Array.isArray(arr) && arr.some(t => String(t || "").trim() !== "")) {
        return true;
      }
    }
    return false;
  }

  // Organiza resultado final
  const result = [];
  for (const [name, refsMap] of persons.entries()) {
    const refs = [];
    for (const [refKey, obj] of refsMap.entries()) {
      if (hasAnyPunches(obj.days)) refs.push(obj);
    }

    // Ordena referências por ano/mês
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

    if (refs.length) result.push({ name, refs });
  }

  // Ordena alfabeticamente por nome
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

// ==========================================
// MOTOR 2: PROCESSAMENTO SEM ESPERA
// ==========================================

/**
 * Constrói modelo de dados IGNORANDO períodos de espera
 * Mantém apenas jornadas efetivas de trabalho
 * 
 * Similar ao buildDataModelComEspera, mas:
 * - Ignora completamente registros com isEspera === true
 * - Usa suppressDuplicateTimesInDay ao invés de lógica de substituição
 * - Não substitui saída por saída de espera
 * 
 * @param {string} rawText - Texto bruto do espelho de ponto do PDF
 * @returns {Array<Object>} Array com pessoas (mesma estrutura que ComEspera)
 * 
 * @comment Diferensa principal:
 * - Apenas "Jornada de Trabalho" é aceita
 * - Períodos de "Espera" são ignorados completamente
 */
function buildDataModelSemEspera(rawText) {
  const text = normalizeSpaces(rawText).replace(/\n\s+\n/g, "\n\n");
  const sections = splitByPeriods(text);
  const persons = new Map();

  for (const sec of sections) {
    const name = extractEmployeeName(sec.slice);
    const periodStart = sec.periodStart;
    const periodEnd = sec.periodEnd;
    const endDt = parseBRDate(periodEnd);
    const refKey = endDt
      ? `${String(endDt.getMonth() + 1).padStart(2, "0")}/${endDt.getFullYear()}`
      : `??/????`;

    if (!persons.has(name)) persons.set(name, new Map());
    const byRef = persons.get(name);
    
    if (!byRef.has(refKey)) {
      byRef.set(refKey, {
        refKey,
        periodStart,
        periodEnd,
        days: new Map()
      });
    }
    const refObj = byRef.get(refKey);

    const journeys = extractJourneys(sec.slice, periodStart, periodEnd);
    
    for (const j of journeys) {
      // DIFERENÇA: Apenas aceita jornadas, ignora espera
      const isJornada = /Jornada\s+de\s+Trabalho/i.test(j.func);
      if (!isJornada) continue;  // Ignora completamente períodos de espera

      const inHHMM = onlyHHMM(j.startTime);
      let outHHMM = onlyHHMM(j.endTime);

      if (j.startDate !== j.endDate && isNextDay(j.startDate, j.endDate)) {
        const a = toMinutes(inHHMM);
        const b = toMinutes(outHHMM);
        if (a != null && b != null && b < a) {
          outHHMM = add24(outHHMM);
        }
      }

      const MAX_PAIR_MIN = 14 * 60;
      {
        const a = toMinutes(inHHMM);
        const b = toMinutes(outHHMM);
        if (a != null && b != null) {
          let dur = b - a;
          const crossesDay = (String(j.startDate || "") !== String(j.endDate || ""));
          if (dur < 0) dur += 24 * 60;
          if (crossesDay && dur > MAX_PAIR_MIN) continue;
        }
      }

      const key = j.startDate;
      if (!refObj.days.has(key)) refObj.days.set(key, []);
      const arr = refObj.days.get(key);
      
      if (inHHMM) arr.push(inHHMM);
      if (outHHMM) arr.push(outHHMM);
    }

    // DIFERENÇA: Usa suppressDuplicateTimesInDay
    for (const [d, arr] of refObj.days.entries()) {
      refObj.days.set(d, suppressDuplicateTimesInDay(arr));
    }

    // Remove períodos onde entrada = saída
    for (const [d, arr] of refObj.days.entries()) {
      if (arr && arr.length === 2 && arr[0] === arr[1]) {
        refObj.days.set(d, []);
      }
    }
  }

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

// module.exports = {
//   buildDataModelComEspera,
//   buildDataModelSemEspera
// };
