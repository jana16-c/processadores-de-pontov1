/**Lógica de conversão de dados para o Excel
 * 
 * Responsabilidade: Transformar dados estruturados em formato pronto para cópia no Excel
 * Um TSV (Tab-Separated Values) com formatação perfeita de colunas
 */
import { fmtBRDate } from '../utilitários/data.js';

/**
 * [FORMATADOR] Prepara dados de horários de uma semana para formato Tab-Separated Values (TSV).
 * 
 * O TSV é otimizado para cópia direta no Excel:
 * - Separador de coluna: tab (\t)
 * - Separador de linha: newline (\n)
 * - Colunas padronizadas (preenchidas com vazio se uma linha tem menos horários)
 * 
 * @param {Array<Date>} weekDays - Vetor de Dates (dias úteis da semana no mês)
 * @param {Map<string, Array<string>>} daysMap - Mapa {"DD/MM/YYYY": ["HH:MM", "HH:MM", ...]}
 * @returns {string} String formatada com tabs e newlines para cópia no Excel
 * 
 * Exemplo:
 *   weekDays = [01/01, 02/01, 03/01]
 *   daysMap = {"01/01": ["08:00", "12:00"], "02/01": ["08:00", "12:00", "13:00", "17:00"]}
 *   toTSVForWeek(weekDays, daysMap)
 *   // Returns: "08:00\t12:00\n08:00\t12:00\t13:00\t17:00\n"
 */
export function toTSVForWeek(weekDays, daysMap) {
    let maxCols = 0;
    const rows = [];
    weekDays.forEach(d => {
        const key = fmtBRDate(d);
        const times = (daysMap.get(key) || []).slice();
        if (times.length % 2 !== 0) times.push("");
        maxCols = Math.max(maxCols, times.length);
        rows.push(times);
    });
    return rows.map(times => {
        const cols = times.slice();
        while (cols.length < maxCols) cols.push("");
        return cols.join("\t");
    }).join("\n");
}