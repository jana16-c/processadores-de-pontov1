import { addDays, mondayOf } from '../utilitários/date.js';

/**
 * Monta as semanas visíveis de um mês calendário.
 *
 * DESCRIÇÃO FUNCIONAL:
 * Gera blocos semanais no padrão segunda→domingo, mas limita-se aos dias
 * do mês informado. Primeira e última semana do mês podem ficar incompletas.
 *
 * CONTEXTO DE USO:
 * Utilizada durante a renderização (renderPerson) para separar cada mês
 * em semanas copiáveis para o usuário.
 *
 * REGRAS APLICADAS:
 * 1. Semana sempre começa na segunda-feira (mondayOf)
 * 2. Semana sempre termina no domingo (quando pertence ao mês)
 * 3. Dias fora do mês não entram no array final de cada semana
 * 4. Primeira semana: pode começar após a segunda (se 1º do mês é depois)
 * 5. Última semana: pode terminar antes do domingo (se último dia é antes)
 *
 * ALGORITMO:
 * 1. Percorre cada dia do mês de 1 até o último
 * 2. Para cada dia, descobre a segunda-feira da semana (mondayOf)
 * 3. Usa a segunda-feira como chave para agrupar em semanas (Map)
 * 4. Depois lê as semanas e monta os dias, filtrando por mês/ano
 *
 * ESTRUTURA RETORNADA:
 * [
 *   { mon: Date, days: [Date, Date, ...] },  // semana 1
 *   { mon: Date, days: [Date, Date, ...] },  // semana 2
 *   ...
 * ]
 *
 * @param {number} year Ano completo (ex: 2016).
 * @param {number} monthIndex Índice do mês no padrão JS (0=jan, 1=fev, ..., 11=dez).
 * @returns {Array<{mon: Date, days: Date[]}>} Lista de semanas ordenadas por data.
 *
 * @example
 * buildWeeksForMonth(2016, 9)  // outubro de 2016
 * // Resultado (aproximado):
 * // [
 * //   { mon: Date(seg 3 out), days: [Date(3), Date(4), ..., Date(9)] },
 * //   { mon: Date(seg 10 out), days: [Date(10), ..., Date(16)] },
 * //   { mon: Date(seg 17 out), days: [Date(17), ..., Date(23)] },
 * //   { mon: Date(seg 24 out), days: [Date(24), ..., Date(30)] },
 * //   { mon: Date(seg 31 out), days: [Date(31)] }  // incompleta
 * // ]
 */
export function buildWeeksForMonth(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const weeks = new Map();

  for (let d = new Date(firstDay); d <= lastDay; d = addDays(d, 1)) {
    const mon = mondayOf(d);
    const key = mon.toISOString().slice(0, 10);
    if (!weeks.has(key)) weeks.set(key, { mon, days: [] });
  }

  for (const w of weeks.values()) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(w.mon, i);
      if (day.getFullYear() === year && day.getMonth() === monthIndex) {
        days.push(day);
      }
    }
    w.days = days;
  }

  return Array.from(weeks.values()).sort((a, b) => a.mon - b.mon);
}