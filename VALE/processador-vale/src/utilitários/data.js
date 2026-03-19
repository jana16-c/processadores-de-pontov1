/**Utilitários de manipulação de datas em formato brasileiro
 * 
 * Fornece funções para:
 * - Formatar datas do JS para DD/MM/YYYY
 * - Adicionar/subtrair dias preservando objeto original
 * - Encontrar segunda-feira de uma semana qualquer
 */

/**
 * Formata um objeto Date do JavaScript para o padrão brasileiro de data.
 * @param {Date} dt - O objeto data a ser formatado.
 * @returns {string} Retorna a data no formato DD/MM/YYYY.
 * 
 * Exemplo: new Date(2024, 0, 5) → "05/01/2024"
 */
export function fmtBRDate(dt) {
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
}

/**
 * Adiciona ou subtrai dias de uma data específica SEM alterar o objeto original (imutável).
 * @param {Date} dt - A data base (não é modificada).
 * @param {number} n - Quantidade de dias para adicionar (positivo) ou subtrair (negativo).
 * @returns {Date} UM NOVO objeto Date com os dias ajustados.
 * 
 * Exemplo:
 *   const d1 = new Date(2024, 0, 5);
 *   const d2 = addDays(d1, 3);
 *   // d1 = 05/01/2024 (inalãltil)
 *   // d2 = 08/01/2024 (novo objeto)
 */
export function addDays(dt, n) {
    const d = new Date(dt.getTime());
    d.setDate(d.getDate() + n);
    return d;
}

/**
 * Encontra a segunda-feira correspondente à semana da data fornecida.
 * 
 * Cálculo:
 * - Se domingo (0) → retorna segunda da semana anterior (-6 dias)
 * - Dia qualquer (1-6) → retorna segunda desta semana (1 - dia dias)
 * 
 * @param {Date} dt - A data de referência (qualquer dia da semana).
 * @returns {Date} Um novo objeto Date representando a segunda-feira daquela semana.
 * 
 * Exemplo:
 *   mondayOf(17/01/2024) // quarta-feira → 15/01/2024 (segunda)
 *   mondayOf(21/01/2024) // domingo → 15/01/2024 (segunda anterior)
 */
export function mondayOf(dt) {
    const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d;
} 

