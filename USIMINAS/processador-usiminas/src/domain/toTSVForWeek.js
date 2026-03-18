import { fmtBRDate } from '../utilitários/date.js';

/**
 * Gera uma representação TSV de uma semana para colagem no Excel.
 *
 * DESCRIÇÃO FUNCIONAL:
 * Recebe os dias visíveis da semana e o mapa de batidas do mês, e produz
 * uma string formatada em TSV (Tab-Separated Values), pronta para copiar
 * e colar no Excel.
 *
 * CONTEXTO DE USO:
 * Executada quando o usuário clica no botão "Copiar semana".
 * A string resultante é copiada para a área de transferência.
 *
 * REGRAS APLICADAS:
 * 1. Cada linha representa UM dia da semana
 * 2. Cada coluna representa UMA batida
 * 3. Campos são separados por TAB (\t) — Excel padrão
 * 4. Se um dia tem número ímpar de batidas, completa com coluna vazia
 * 5. Todas as linhas padronizadas para o mesmo número de colunas
 *
 * ALGORITMO:
 * 1. Para cada dia da semana:
 *    a. Procura as batidas no daysMap usando chave formatada (dd/mm/aaaa)
 *    b. Se ímpar, adiciona '' no final para fechar a jornada
 *    c. Rastreia o número máximo de colunas vistas
 * 2. Normaliza todas as linhas para maxCols
 * 3. Junta linhas com \n e colunas com \t
 *
 * EXEMPLO DE SAÍDA:
 * "07:00\t12:00\t13:00\t17:00
 * 08:15\t12:30\t13:15\t17:30
 * 06:45\t12:15\t13:45\t18:00"
 *
 * @param {Date[]} weekDays Dias visíveis da semana (em ordem).
 * @param {Map<string, string[]>} daysMap Mapa de batidas indexado por dd/mm/aaaa.
 * @returns {string} Texto TSV pronto para copiar para o Excel.
 *
 * @example
 * const weekDays = [
 *   new Date(2016, 10, 11),
 *   new Date(2016, 10, 12)
 * ];
 * const daysMap = new Map([
 *   ["11/11/2016", ["20:51", "03:54"]],
 *   ["12/11/2016", ["08:00", "12:00", "13:00", "17:00"]]
 * ]);
 *
 * const tsv = toTSVForWeek(weekDays, daysMap);
 * // "20:51\t03:54
 * // 08:00\t12:00\t13:00\t17:00"
 */
export function toTSVForWeek(weekDays, daysMap) {
  let maxCols = 0;
  const rows = [];

  weekDays.forEach(d => {
    const key = fmtBRDate(d);
    const times = (daysMap.get(key) || []).slice();
    if (times.length % 2 !== 0) times.push('');
    maxCols = Math.max(maxCols, times.length);
    rows.push(times);
  });

  return rows.map(times => {
    const cols = times.slice();
    while (cols.length < maxCols) cols.push('');
    return cols.join('\t');
  }).join('\n');
}