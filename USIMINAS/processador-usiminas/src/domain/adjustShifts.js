import { toMin, add24ToTime } from '../utilitários/time.js';
import { isNextCalendarDay } from '../utilitários/date.js';

/**
 * Detecta se um turno é noturno (começa à noite e termina de madrugada).
 * 
 * Um turno é noturno quando a hora de início > hora de término.
 * Exemplo: 22:40 - 06:50 (início 22h > fim 6h)
 * 
 * @param {string|null} plannedStart Hora planejada de início (ex: "22:40")
 * @param {string|null} plannedEnd Hora planejada de término (ex: "06:50")
 * @returns {boolean} true se turno é noturno
 */
function isNightShift(plannedStart, plannedEnd) {
  if (!plannedStart || !plannedEnd) return false;
  const startMin = toMin(plannedStart);
  const endMin = toMin(plannedEnd);
  // Turno noturno: quando a hora de início é > hora de fim (cruza meia-noite)
  return startMin > endMin;
}

/**
 * Para turnos noturnos, move as batidas de madrugada do próximo dia para o dia anterior com +24h.
 * 
 * LÓGICA:
 * Se o dia N tem turno noturno (22:40-06:50), as madrugadas do dia N+1 (< 12h)
 * são na verdade o FECHAMENTO do turno que começou em N.
 * 
 * Exemplo:
 * - Dia 09: turno noturno, batida 22:36
 * - Dia 10: turno noturno, batidas 02:58, 03:59, 06:52, 22:35
 * 
 * Resultado esperado:
 * - Dia 09: 22:36, 26:58, 27:59, 30:52 (incluindo madrugadas de 10 com +24h)
 * - Dia 10: 22:35 (apenas noturnas, sem suas madrugadas)
 * 
 * @param {Array} timeline Array de dias com batidas
 * @returns {Array} Timeline modificada
 */
function procesNightShiftTimes(timeline) {
  // Itera a partir do segundo dia
  for (let i = 1; i < timeline.length; i++) {
    const yesterday = timeline[i - 1];
    const today = timeline[i];

    // Verifica se o dia anterior teve turno noturno
    const yesterdayIsNight = isNightShift(yesterday.plannedStart, yesterday.plannedEnd);
    if (!yesterdayIsNight || yesterday.isOffDay) continue;

    // Verifica se os dias são consecutivos
    if (!isNextCalendarDay(yesterday.data, today.data)) continue;

    // Separa as batidas de hoje em madrugada (< 12h) e resto
    const morningTimes = [];   // Madrugadas que fecham turno de ontem
    const otherTimes = [];     // Resto (noturnas de hoje)

    for (const time of (today.times || [])) {
      const timeMin = toMin(time);
      const hourOfDay = Math.floor(timeMin / 60);

      // Se horário é de madrugada (< 12h), pertence a ontem
      if (hourOfDay < 12) {
        morningTimes.push(time);
      } else {
        otherTimes.push(time);
      }
    }

    // Move as madrugadas para o dia anterior com +24h
    if (morningTimes.length > 0) {
      // Adiciona madrugadas ao dia anterior
      const movedTimes = morningTimes.map(t => add24ToTime(t));
      yesterday.times = [...(yesterday.times || []), ...movedTimes];
      yesterday.times.sort((a, b) => toMin(a) - toMin(b));
      
      // Remove as madrugadas do dia hoje
      today.times = otherTimes;
    }
  }

  return timeline;
}

/**
 * Ajusta batidas entre dias consecutivos para fechar jornadas abertas.
 *
 * DESCRIÇÃO FUNCIONAL:
 * Esta função percorre uma timeline já ordenada por data e tenta corrigir
 * situações em que uma jornada começou em um dia e foi encerrada no dia seguinte,
 * um padrão comum em trabalho noturno.
 *
 * CONTEXTO DE USO:
 * Executa após parseInput() e antes de renderPerson().
 * Sua função é consolidar corretamente as batidas no dia-base da jornada,
 * movendo das madrugadas para o dia anterior com +24h no horário.
 *
 * REGRAS APLICADAS:
 * 1. Se um dia tem ímpar de batidas → dia "aberto" (precisa de fechamento)
 * 2. Tenta puxar a primeira batida do dia seguinte como fechamento
 * 3. Quando puxada, adiciona +24h ao horário (virada noturna)
 * 4. Decisão: se batida de amanhã < última de hoje OU intervalo ≤ 14h → puxar
 * 5. Dias com par de batidas são considerados "fechados"
 *
 * LIMITAÇÕES / OBSERVAÇÕES:
 * - Depende de timeline JÁ ESTAR ORDENADA por data (ajusta mesmo assim)
 * - ALTERA o array recebido (mutação in-place)
 * - Heurística desenhada para layout Usiminas, outros layouts podem não funcionar
 * - Não valida se os horários fazem sentido biologicamente
 *
 * ALGORITMO:
 * 1. Ordena datas e horários de cada dia
 * 2. Itera pares de dias consecutivos
 * 3. Se hoje ímpar E amanhã ímpar → forte indicativo de jornada noturna quebrada
 * 4. Se hoje ímpar E amanhã par → verifica se primeira de amanhã fecha hoje
 * 5. Repete até que nenhuma mudança ocorra ou todos os dias fechem
 *
 * @param {Array<{data: Date, times: string[]}>} timeline
 * Array de objetos representando dias com suas batidas.
 *
 * @returns {Array<{data: Date, times: string[]}>}
 * A mesma timeline (modificada), agora com jornadas ajustadas.
 *
 * @example
 * const timeline = [
 *   { data: new Date(2016, 10, 11), times: ["20:51"] },      // ímpar (aberto)
 *   { data: new Date(2016, 10, 12), times: ["03:54", "..."] }
 * ];
 *
 * adjustShifts(timeline);
 * // Resultado:
 * // Dia 11/11: ["20:51", "27:54"]  (03:54 + 24h)
 * // Dia 12/11: ["..."] (03:54 removido e movido)
 */
export function adjustShifts(timeline) {
    // Garante ordem das datas
    timeline.sort((a, b) => a.data - b.data);

    // Ordena horários dentro de cada dia
    timeline.forEach(day => {
        day.times = (day.times || []).slice().sort((a, b) => toMin(a) - toMin(b));
    });

    // PRIMEIRA PASSADA: Processa turnos noturnos (move madrugadas já detectadas)
    procesNightShiftTimes(timeline);

    // SEGUNDA PASSADA: Ajusta turnos abertos (ímpar de batidas)
    for (let i = 0; i < timeline.length - 1; i++) {
        const today = timeline[i];
        const tomorrow = timeline[i + 1];

        if (!isNextCalendarDay(today.data, tomorrow.data)) continue;
        if (!today.times.length || !tomorrow.times.length) continue;

        let changed = true;

        while (changed) {
            changed = false;

            const todayOdd = today.times.length % 2 !== 0;
            const tomorrowOdd = tomorrow.times.length % 2 !== 0;

            if (!todayOdd || !tomorrow.times.length) break;

            const lastToday = today.times[today.times.length - 1];
            const firstTomorrow = tomorrow.times[0];

            const lastTodayMin = toMin(lastToday);
            const firstTomorrowMin = toMin(firstTomorrow);

            /*
              REGRA FORTE:
              Se hoje está ímpar e amanhã também está ímpar,
              é um ótimo indício de jornada noturna quebrada entre os dois dias.
              Então puxamos a primeira batida de amanhã para fechar hoje.
            */
            if (todayOdd && tomorrowOdd) {
                tomorrow.times.shift();
                today.times.push(add24ToTime(firstTomorrow));
                changed = true;
                continue;
            }

            /*
              REGRA SECUNDÁRIA:
              Hoje está ímpar, amanhã está par.
              Ainda pode ser que a 1ª batida de amanhã feche hoje,
              principalmente se:
              - a batida de amanhã for "menor" que a última de hoje (madrugada)
              - ou a distância total for razoável
            */
            if (todayOdd && !tomorrowOdd) {
                const hoursGap = ((firstTomorrowMin + 24 * 60) - lastTodayMin) / 60;

                const looksLikeNightClosure =
                    firstTomorrowMin < lastTodayMin || hoursGap <= 14;

                if (looksLikeNightClosure) {
                    tomorrow.times.shift();
                    today.times.push(add24ToTime(firstTomorrow));
                    changed = true;
                    continue;
                }
            }
        }
    }

    return timeline;
}