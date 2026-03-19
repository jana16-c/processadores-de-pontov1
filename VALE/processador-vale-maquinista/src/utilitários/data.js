/**
 * Formata um objeto Date do JavaScript para o padrão brasileiro de data.
 * @param {Date} dt - O objeto data a ser formatado.
 * @returns {string} Retorna a data no formato DD/MM/YYYY.
 */
export function fmtBRDate(dt) {
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
}

/**
 * Adiciona ou subtrai dias de uma data específica sem alterar o objeto original.
 * @param {Date} dt - A data base.
 * @param {number} n - Quantidade de dias para adicionar (positivo) ou subtrair (negativo).
 * @returns {Date} Um novo objeto Date com os dias ajustados.
 */
export function addDays(dt, n) {
    const d = new Date(dt.getTime());
    d.setDate(d.getDate() + n);
    return d;
}

/**
 * Encontra a segunda-feira correspondente à semana da data fornecida.
 * @param {Date} dt - A data de referência.
 * @returns {Date} Um novo objeto Date representando a segunda-feira daquela semana.
 */
export function mondayOf(dt) {
    const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d;
} 

