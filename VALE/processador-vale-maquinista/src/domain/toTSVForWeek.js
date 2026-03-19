/**Lógica de conversão de dados para o Excel
 * 
 * Responsabilidade: Transformar dados estruturados em formato pronto para cópia no Excel
 * Um TSV (Tab-Separated Values) com formatação perfeita de colunas
 */
import { fmtBRDate } from '../utilitários/data.js';

/**
 * Prepara os dados de horários de uma semana para o formato Tab-Separated Values (TSV).
 * Usado para garantir que a cópia cole perfeitamente no Excel mantendo as colunas.
 * @param {Array} weekDays - Lista de objetos Date representando os dias da semana.
 * @param {Map} daysMap - Mapa contendo a relação entre datas formatadas e o array de horários batidos.
 * @returns {string} String contendo os dados formatados com tabulações (\t) e quebras de linha (\n).
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