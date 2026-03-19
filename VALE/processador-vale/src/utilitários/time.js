/**Utilitários de conversão entre formatos de horário
 * 
 * Fornece funções para:
 * - Converter "HH:MM" → minutos (facilita cálculos)
 * - Converter minutos → "HH:MM" (exibição)
 */

/**
 * Converte uma string de horário (HH:MM) para o total de minutos.
 * Ùtil para cálculos de duração e detecção de turnos noturnos.
 * @param {string} tStr - String de horário no formato "HH:MM".
 * @returns {number} O tempo total convertido em minutos (0-1439 para um dia normal).
 * 
 * Exemplo:
 *   parseToMins("08:30") → 510 minutos (8*60 + 30)
 *   parseToMins("23:59") → 1439 minutos
 */
export function parseToMins(tStr) {
    let parts = tStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Converte minutos totais de volta para o formato de string HH:MM.
 * Não possui limitador de 24h para permitir exibição de turnos aditivos (ex: 30:56).
 * 
 * @param {number} mins - Total de minutos (pode ser > 1440 para turnos noturnos/aditivos).
 * @returns {string} String formatada em "HH:MM" (com padding de 0 à esquerda).
 * 
 * Exemplos:
 *   formatMins(510) → "08:30"
 *   formatMins(1500) → "25:00" (turno aditivo/noturno)
 *   formatMins(1440) → "24:00" (24 horas)
 */
export function formatMins(mins) {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}