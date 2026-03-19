/**Lógica de negócio para agrupamento de calendário
 * 
 * Responsabilidade: Partir um mês em semanas (seg-dom) para visualização
 * Usado principalmente por renderPerson para criar cards de semanas
 */
import { addDays, mondayOf } from '../utilitários/data.js';

/**
 * Agrupa os dias de um determinado mês e ano em blocos semanais (Segunda a Domingo).
 * @param {number} year - O ano a ser processado (ex: 2024).
 * @param {number} monthIndex - O índice do mês (0 a 11, onde 0 é Janeiro).
 * @returns {Array} Lista de objetos representando cada semana, contendo a data da segunda-feira e os dias úteis.
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
            if (day.getFullYear() === year && day.getMonth() === monthIndex) days.push(day);
        }
        w.days = days;
    }

    return Array.from(weeks.values()).sort((a, b) => a.mon - b.mon);
}