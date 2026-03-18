/**
 * @module utilidades-data.js
 * @description Funções utilitárias para manipulação de datas em formato DD/MM/YYYY
 */

/**
 * Converte data no formato DD/MM/YYYY para objeto Date
 * @param {string} dmy - Data em formato DD/MM/YYYY
 * @returns {Date|null} Objeto Date ou null se inválido
 * @example
 * parseBRDate("15/03/2026") // → Date(2026, 2, 15)
 */
function parseBRDate(dmy) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10) - 1; // Mês é 0-indexed em JS
  const yy = parseInt(m[3], 10);
  return new Date(yy, mm, dd);
}

/**
 * Formata data para o formato DD/MM/YYYY
 * @param {Date} dt - Objeto Date
 * @returns {string} Data formatada DD/MM/YYYY
 * @example
 * fmtBRDate(new Date(2026, 2, 15)) // → "15/03/2026"
 */
function fmtBRDate(dt) {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/**
 * Adiciona uma quantidade de dias a uma data
 * @param {Date} dt - Data base
 * @param {number} n - Número de dias (pode ser negativo)
 * @returns {Date} Nova data com os dias adicionados
 * @example
 * addDays(new Date(2026, 2, 15), 1) // → 16/03/2026
 * addDays(new Date(2026, 2, 15), -5) // → 10/03/2026
 */
function addDays(dt, n) {
  const d = new Date(dt.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Retorna a segunda-feira da semana contendo a data
 * Considera Sunday = 0, Monday = 1, ..., Saturday = 6
 * @param {Date} dt - Data qualquer
 * @returns {Date} Segunda-feira daquela semana
 * @example
 * // Se 15/03/2026 é domingo, retorna 09/03/2026 (segunda anterior)
 * mondayOf(new Date(2026, 2, 15)) // → Monday
 */
function mondayOf(dt) {
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const day = d.getDay();
  // Se domingo (0): volta 6 dias; senão: volta até segunda (1 - day)
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Verifica se d2 é exatamente o próximo dia após d1
 * @param {string} d1 - Data em DD/MM/YYYY
 * @param {string} d2 - Data em DD/MM/YYYY
 * @returns {boolean} true se d2 = d1 + 1 dia
 * @example
 * isNextDay("14/03/2026", "15/03/2026") // → true
 * isNextDay("15/03/2026", "17/03/2026") // → false
 */
function isNextDay(d1, d2) {
  const a = parseBRDate(d1);
  const b = parseBRDate(d2);
  if (!a || !b) return false;
  // Calcula diferença em dias (1 dia = 86400000 ms)
  const diff = Math.round((b - a) / 86400000);
  return diff === 1;
}

/**
 * Converte horário HH:MM para minutos totais
 * @param {string} hhmm - Horário em formato HH:MM
 * @returns {number|null} Total de minutos ou null se inválido
 * @example
 * toMinutes("08:30") // → 510 (8*60 + 30)
 * toMinutes("18:45") // → 1125 (18*60 + 45)
 */
function toMinutes(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/**
 * Adiciona 24 horas a um horário (para jornadas que cruzam meia-noite)
 * @param {string} hhmm - Horário em formato HH:MM
 * @returns {string} Horário com +24h (ex: 32:00 para 08:00)
 * @example
 * add24("08:00") // → "32:00"
 * add24("18:30") // → "42:30"
 */
function add24(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const hh = parseInt(m[1], 10) + 24;
  return `${String(hh).padStart(2, "0")}:${m[2]}`;
}

// ─────────────────────────────────────────────────────────────
// Exports (se usar como módulo)
// ─────────────────────────────────────────────────────────────
/*
export {
  parseBRDate,
  fmtBRDate,
  addDays,
  mondayOf,
  isNextDay,
  toMinutes,
  add24
};
*/
