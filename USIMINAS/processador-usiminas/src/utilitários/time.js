/**
 * MÓDULO: time.js
 * Funções auxiliares para manipulação de horários.
 * Converte entre formatos texto e numéricos para cálculos e comparações.
 * Também manipula horários para representação de virada noturna.
 * 
 * Importações:
 * import { toMin, add24ToTime } from './time.js'
 */

/**
 * Converte um horário textual no formato HH:MM para minutos absolutos.
 *
 * DESCRIÇÃO FUNCIONAL:
 * Esta função transforma um horário textual em um número inteiro de minutos,
 * permitindo comparações numéricas, ordenação, e cálculos de intervalo.
 * Funciona com horários normais (0-23h) e estendidos (24+h para virada noturna).
 *
 * CONTEXTO DE USO:
 * Utilizada principalmente nas regras de ajuste de batidas (adjustShifts):
 * - ordenar horários de um dia
 * - comparar última batida de um dia com primeira do dia seguinte
 * - detectar padrão de virada noturna
 *
 * REGRAS APLICADAS:
 * - aceita horários padrão como "07:30" (450 minutos)
 * - aceita horários estendidos como "27:54" (1674 minutos = +24h)
 * - interpreta a parte antes de ":" como horas absolutas
 * - interpreta a parte depois de ":" como minutos
 *
 * ALGORITMO:
 * 1. Divide string por ":"
 * 2. Converte ambas partes para número
 * 3. Retorna: horas × 60 + minutos
 *
 * LIMITAÇÕES / OBSERVAÇÕES:
 * - assume que SEMPRE a string está em formato válido "HH:MM"
 * - não valida texto inválido (tipo "25:AB" não retorna erro)
 * - não valida limites de minutos (tipo "10:99" não retorna erro)
 * - presume que entrada é bem-formada (responsabilidade do parser)
 *
 * @param {string} str Horário no formato "HH:MM" (pode ter HH > 23 para virada).
 * @returns {number} Quantidade total de minutos.
 *
 * @example
 * toMin("07:30")   // 450  (7 * 60 + 30)
 * toMin("23:59")   // 1439
 * toMin("00:00")   // 0
 * toMin("27:54")   // 1674 (virada noturna: 27 * 60 + 54)
 * toMin("24:30")   // 1470
 */
export function toMin(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Adiciona 24 horas a um horário textual (para virada noturna).
 *
 * DESCRIÇÃO FUNCIONAL:
 * Transforma um horário normal em um horário "estendido" que representa
 * o mesmo momento no dia seguinte. Usado exclusivamente para representar
 * saídas de jornadas noturnas que cruzam meia-noite.
 *
 * CONTEXTO DE USO:
 * Executada por `adjustShifts()` quando detecta virada noturna.
 * Transforma: 03:54 → 27:54 (mantindo a saída no "dia anterior")
 *
 * COMO FUNCIONA:
 * 1. Extrai horas e minutos do horário
 * 2. Adiciona 24 às horas
 * 3. Mantém minutos iguais
 * 4. Garante 2 dígitos para minutos (zero-padded)
 *
 * REGRA IMPORTANTE:
 * Este formato (horas > 23) é usado APENAS internamente para cálculos.
 * Não é exibido diretamente ao usuário sem ajuste visual.
 *
 * @param {string} hhmm Horário em formato "HH:MM" (sem +24h).
 * @returns {string} Horário com +24h no formato "HH:MM" (HH pode estar > 23).
 *
 * @example
 * add24ToTime("03:54")   // "27:54" (saída de madrugada)
 * add24ToTime("12:30")   // "36:30" (raramente, se muito tarde)
 * add24ToTime("00:15")   // "24:15" (meia-noite + 15 min)
 */
export function add24ToTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h + 24}:${String(m).padStart(2, '0')}`;
}
