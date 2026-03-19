/**Regras de ordenação de linha do tempo de um funcionário */

/**
 * [VALIDAÇÃO] Ordena cronologicamente os dias na linha do tempo de um funcionário.
 * 
 * Responsabilidade: Aplicar ordenação temporal imutável
 * - Recebe array de dias (pode estar desordenado)
 * - Ordena por data crescente (mais antiga → mais recente)
 * - Retorna o mesmo array modificado in-place
 * 
 * @param {Array<Object>} timeline - Vector de dias com estrutura: {data: Date, times: Array}
 * @returns {Array<Object>} O mesmo array, mas ordenado cronologicamente
 * 
 * Exemplo:
 *   timeline = [{data: 05/01}, {data: 01/01}, {data: 03/01}]
 *   adjustShifts(timeline)
 *   // Returns: [{data: 01/01}, {data: 03/01}, {data: 05/01}]
 */
export function adjustShifts(timeline) {
    timeline.sort((a, b) => a.data - b.data);
    return timeline;
}