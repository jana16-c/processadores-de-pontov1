/**Lógica de negócio para agrupamento de calendário
 * 
 * Responsabilidade: Partir um mês em semanas (seg-dom) para visualização
 * Usado principalmente por renderPerson para criar cards de semanas
 */
import { addDays, mondayOf } from '../utilitários/data.js';

/**
 * [ESTRUTURADOR] Agrupa dias de um mês em blocos semanais (Segunda-feira a Domingo).
 * 
 * Algoritmo:
 * 1. Cria Map com segunda-feira de cada semana como chave
 * 2. Para cada dia do mês, adiciona à semana correspondente
 * 3. Remove dias que não pertencem ao mês (primeira/última semana parcial)
 * 4. Ordena semanas cronologicamente
 * 
 * @param {number} year - O ano a ser processado (ex: 2024)
 * @param {number} monthIndex - Índice do mês (0=jan, 1=fev, ..., 11=dez)
 * @returns {Array<Object>} Vetor de semanas: {mon: Date, days: [Dates apenas do mês]}
 * 
 * Exemplo:
 *   buildWeeksForMonth(2024, 0) // janeiro 2024
 *   // Returns: [{mon: 01/01, days: [01, 02, 03, 04, 05]}, {mon: 08/01, days: [08...]}...]
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