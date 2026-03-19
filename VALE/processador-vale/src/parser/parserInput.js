/**Motor de leitura textual e matemática de turnos - Processa PDFs de ponto VALE
 * 
 * Responsabilidades principais:
 * - Extrair e validar nomes de funcionários
 * - Identificar dias e linhas de horários
 * - Reconhecer códigos de agendamento (schedule)
 * - Detectar marcações irregulares, folgas e feriados
 * - Parecer horários (entrada/saída) com validação de duração
 * - Ajustar turnos noturnos (saída < entrada)
 * - Preencher horários faltantes com dados contratuais
 */
import { parseToMins, formatMins } from '../utilitários/time.js';

/**
 * [FUNÇÃO AUXILIAR INTERNA] Extrai estritamente horários de uma linha de texto.
 * 
 * Identifica padrões HH:MM consecutivos e os valida.
 * Possui lógica especial para linha inicial (remove prefixo de dia/data).
 * Trata casos particulares de marcação irregular e saída faltante.
 * 
 * @param {string} line - A linha de texto a ser analisada.
 * @param {Object} dayObj - Objeto Day que armazena rawTimes e flags:
 *   - rawTimes: Array<horários encontrados>
 *   - stopCapturing: Boolean (para parar leitura se quebra de formato)
 * @param {boolean} isFirstLine - Se verdadeiro, remove cabeçalho "seg 01/01/24 CODE"
 * @param {boolean} isIrregularLine - Se verdadeiro, aplica validação especial de duração
 * @param {boolean} hasMissingExit - Se verdadeiro, hora de saída pode estar faltando
 * @param {Object} schedules - Mapa {código: [horários]} para preencher lacunas
 */
function extractTimesStrict(line, dayObj, isFirstLine, isIrregularLine, hasMissingExit, schedules) {
    if (dayObj.stopCapturing) return;

    let restStr = line;
    if (isFirstLine) {
        restStr = line.replace(/^(?:seg|ter|qua|qui|sex|s[aá]b|dom)\s+\d{2}\/\d{2}\/\d{2}\s*(?:\d{5})?\s*(?:\w{2,4})?\s*/i, '');
    }

    const tokens = restStr.split(/\s+/);
    let capturedThisLine = [];
    let brokeEarly = false;

    for (let t of tokens) {
        if (/^\d{1,2}:\d{2}$/.test(t)) {
            capturedThisLine.push(t.padStart(5, '0'));
        } else {
            brokeEarly = true;
            dayObj.stopCapturing = true;
            break;
        }
    }

    if (isIrregularLine && capturedThisLine.length % 2 !== 0 && capturedThisLine.length > 0) {
        let first = capturedThisLine[0];
        let last = capturedThisLine[capturedThisLine.length - 1];
        let inMins = parseToMins(first);
        let outMins = parseToMins(last);
        if (outMins < inMins) outMins += 1440;
        let dur = outMins - inMins;
        if (dur > 0 && dur <= 840) {
            capturedThisLine = [first, last];
        } else {
            let plannedExit = null;
            if (dayObj.scheduleCode && schedules && schedules[dayObj.scheduleCode]) {
                let sch = schedules[dayObj.scheduleCode];
                plannedExit = sch[sch.length - 1];
            }
            if (plannedExit) {
                capturedThisLine = [first, plannedExit];
            } else if (!brokeEarly) {
                capturedThisLine.pop();
            }
        }
    }
    else if (capturedThisLine.length % 2 !== 0) {
        if (!brokeEarly && !hasMissingExit) capturedThisLine.pop();
    }

    if (!isFirstLine && capturedThisLine.length > 0) {
        let allExist = capturedThisLine.every(t => dayObj.rawTimes.includes(t));
        if (allExist) capturedThisLine = [];
    }

    dayObj.rawTimes.push(...capturedThisLine);
}

/**
 * [FUNÇÃO PRINCIPAL] Parser que converte texto bruto em dados estruturados.
 * 
 * Algoritmo em 3 passes:
 * PASS 1: Lê o texto, identifica funcionários, dias e horários brutos
 *         Detecta flags: irregular, folga, saída faltante, código de turno
 * PASS 2: Processa horários restantes (não na linha inicial do dia)
 * PASS 3: Finaliza dias: valida pares, ajusta noturnos, une turnos contínuos
 * 
 * Trata casos reais de PDFs:
 * - Turnos noturnos (saída < entrada em minutos)
 * - Marcação irregular com duração inválida → usa schedule como fallback
 * - Saída faltante (flag especial) → completa com schedule
 * - Múltiplas linhas de horários por dia
 * - Fusão de pares adjacentes (ex: 12:00 e 12:00 → um par)
 * 
 * @param {string} text - O texto bruto extraído do PDF (com \r ou \n\r terminadores)
 * @returns {Object} Mapa {nomeFuncionário: [objetos de dia processados]}
 *   Cada dia contém: data, times (array de "HH:MM"), flags (useSchedule, isOffDay, etc)
 */
export function parseInput(text) {
    const map = {};
    const normalizedText = text.replace(/\r/g, '').replace(/\u00A0/g, ' ');
    const lines = normalizedText.split('\n');

    let currentName = "COLABORADOR NÃO IDENTIFICADO";
    let schedules = {};
    let currentDayObj = null;

    const rgSchedule = /(\d{5})\s*\[(\d{2}:\d{2})\s+as\s+(\d{2}:\d{2})(?:\s+-\s+Int:\s+(\d{2}:\d{2})\s+as\s+(\d{2}:\d{2}))?\]/g;
    const rgName = /Empregado\s*:\s*(.*?)\s+Categoria/i;
    const rgDayLine = /^(seg|ter|qua|qui|sex|s[aá]b|dom)\s+(\d{2})\/(\d{2})\/(\d{2})/i;

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const l = rawLine.trim();
        if (!l) continue;

        let mSch;
        while ((mSch = rgSchedule.exec(l)) !== null) {
            const code = mSch[1];
            const e1 = mSch[2], s2 = mSch[3], s1 = mSch[4], e2 = mSch[5];
            if (s1 && e2) {
                schedules[code] = [e1, s1, e2, s2];
            } else {
                schedules[code] = [e1, s2];
            }
        }

        const mName = l.match(rgName);
        if (mName) {
            let raw = mName[1].trim().replace(/^\d+\s*-\s*/, '');
            currentName = raw.toUpperCase();
            if (!map[currentName]) map[currentName] = [];
            currentDayObj = null;
            continue;
        }

        const hasTag = /MARCA[ÇC][ÃA]O N[ÃA]O REGISTRADA/i.test(l);
        const isOff = /FOLGA|DSR|FERIADO|LIC DOENCA|FERIAS/i.test(l);
        const hasIrregular = /MARCA[ÇC][ÃA]O IRREGULAR/i.test(l);

        let hasMissingExit = /s\/Marca[çc][ãa]o de Sa[íi]da/i.test(l);
        if (/^(seg|ter|qua|qui|sex|s[aá]b|dom)\s+\d{2}\/\d{2}\/\d{2}/i.test(l)) {
            for (let j = i + 1; j < lines.length; j++) {
                let nextL = lines[j].trim();
                if (/^(seg|ter|qua|qui|sex|s[aá]b|dom)\s+\d{2}\/\d{2}\/\d{2}/i.test(nextL)) break;
                if (/s\/Marca[çc][ãa]o de Sa[íi]da/i.test(nextL)) { hasMissingExit = true; break; }
            }
        }

        const mDay = l.match(rgDayLine);
        if (mDay) {
            const day = parseInt(mDay[2], 10);
            const month = parseInt(mDay[3], 10);
            const year = 2000 + parseInt(mDay[4], 10);
            const dateObj = new Date(year, month - 1, day);
            const mCode = l.match(/.{2,4}\s+\d{2}\/\d{2}\/\d{2}\s+(\d{5})/);
            const schCode = mCode ? mCode[1] : null;

            if (!map[currentName]) map[currentName] = [];
            let lastDay = map[currentName].length > 0 ? map[currentName][map[currentName].length - 1] : null;

            if (lastDay && lastDay.data.getTime() === dateObj.getTime()) {
                currentDayObj = lastDay;
                if (schCode && !currentDayObj.scheduleCode) currentDayObj.scheduleCode = schCode;
                if (hasTag) currentDayObj.useSchedule = true;
                if (isOff) currentDayObj.isOffDay = true;
                if (hasIrregular) currentDayObj.hasIrregularMark = true;
                if (hasMissingExit) currentDayObj.hasMissingExit = true;
            } else {
                currentDayObj = {
                    data: dateObj,
                    scheduleCode: schCode,
                    rawTimes: [],
                    useSchedule: hasTag,
                    isOffDay: isOff,
                    hasIrregularMark: hasIrregular,
                    hasMissingExit: hasMissingExit,
                    stopCapturing: false
                };
                map[currentName].push(currentDayObj);
            }

            extractTimesStrict(l, currentDayObj, true, hasIrregular, hasMissingExit, schedules);
        }
        else if (currentDayObj && /^\d{1,2}:\d{2}/.test(l)) {
            if (hasTag) currentDayObj.useSchedule = true;
            if (isOff) currentDayObj.isOffDay = true;
            if (hasIrregular) currentDayObj.hasIrregularMark = true;
            if (hasMissingExit) currentDayObj.hasMissingExit = true;

            if (/Permanencia Fora/i.test(l) && !/INTERVALO[\s_]?ALIMENT/i.test(l)) {
                currentDayObj.stopCapturing = false;
            }

            extractTimesStrict(l, currentDayObj, false, hasIrregular, hasMissingExit, schedules);
        }
        else if (currentDayObj) {
            if (hasTag) currentDayObj.useSchedule = true;
            if (isOff) currentDayObj.isOffDay = true;
            if (hasIrregular) currentDayObj.hasIrregularMark = true;
            if (hasMissingExit) currentDayObj.hasMissingExit = true;
        }
    }

    for (let name in map) {
        for (let day of map[name]) {
            if (day.useSchedule && day.scheduleCode && schedules[day.scheduleCode]) {
                day.times = [...schedules[day.scheduleCode]];
            } else {
                if (day.hasMissingExit && day.rawTimes.length % 2 !== 0) {
                    let plannedExit = null;
                    if (day.scheduleCode && schedules[day.scheduleCode]) {
                        let sch = schedules[day.scheduleCode];
                        if (day.rawTimes.length < sch.length) {
                            if (sch.length === 4) {
                                if (day.rawTimes.length === 1) plannedExit = sch[1];
                                else if (day.rawTimes.length === 3) plannedExit = sch[3];
                            } else if (sch.length === 2) {
                                if (day.rawTimes.length === 1) plannedExit = sch[1];
                            } else {
                                plannedExit = sch[sch.length - 1];
                            }
                        }
                    }
                    if (plannedExit) day.rawTimes.push(plannedExit);
                }

                let pairs = [];
                for (let i = 0; i < day.rawTimes.length; i += 2) {
                    let inMins = parseToMins(day.rawTimes[i]);
                    let outMins = (i + 1 < day.rawTimes.length) ? parseToMins(day.rawTimes[i + 1]) : null;
                    if (outMins !== null && outMins < inMins) outMins += 1440;
                    pairs.push({ in: inMins, out: outMins });
                }

                if (pairs.length > 1) {
                    let anchor = pairs[0];
                    for (let i = 1; i < pairs.length; i++) {
                        let p = pairs[i];
                        let outVal = p.out !== null ? p.out : p.in;
                        let gapBefore = anchor.in - outVal;
                        let gapAfterSameDay = p.in - anchor.out;
                        let gapAfterNextDay = (p.in + 1440) - anchor.out;
                        if (gapBefore < 0) gapBefore = Infinity;
                        if (gapAfterSameDay < 0) gapAfterSameDay = Infinity;
                        if (gapAfterNextDay < 0) gapAfterNextDay = Infinity;
                        let minGap = Math.min(gapBefore, gapAfterSameDay, gapAfterNextDay);
                        if (minGap === gapAfterNextDay) {
                            p.in += 1440;
                            if (p.out !== null) p.out += 1440;
                        }
                    }
                }

                pairs.sort((a, b) => a.in - b.in);

                if (pairs.length === 2) {
                    let p0 = pairs[0], p1 = pairs[1];
                    let p1OutMod = p1.out % 1440;
                    let isP0ContinuationOfP1 = p0.in < 720 && p1.in >= 720
                        && Math.abs(p1OutMod - p0.in) <= 60;
                    let areAdjacent = (p0.out === p1.in);
                    if (isP0ContinuationOfP1 && !areAdjacent) {
                        p0.in += 1440;
                        p0.out += 1440;
                        pairs = [p1, p0];
                    }
                }

                let mergedPairs = [];
                for (let p of pairs) {
                    if (mergedPairs.length > 0) {
                        let last = mergedPairs[mergedPairs.length - 1];
                        if (last.out === p.in) {
                            last.out = p.out; 
                            continue;
                        }
                    }
                    mergedPairs.push(p);
                }

                let finalPairs = [];
                for (let p of mergedPairs) {
                    let dur = p.out !== null ? (p.out - p.in) : 0;
                    if (dur <= 1440) finalPairs.push(p); 
                }

                day.times = [];
                for (let p of finalPairs) {
                    day.times.push(formatMins(p.in));
                    if (p.out !== null) day.times.push(formatMins(p.out));
                }
            }
            delete day.rawTimes;
        }
    }

    return map;
}