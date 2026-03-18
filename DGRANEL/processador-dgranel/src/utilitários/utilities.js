/**
 * @file utilities.js
 * @description Módulo com funções auxiliares para manipulação de datas, horários e strings
 * @version 1.0.0
 */

// ==========================================
// UTILITIES DE DATA
// ==========================================

/**
 * Interpreta uma data no formato brasileiro DD/MM/YYYY
 * Converte para objeto Date nativo do JavaScript
 * 
 * @param {string} dmy - Data em formato DD/MM/YYYY
 * @returns {Date|null} Objeto Date ou null se formato inválido
 * 
 * @example
 * parseBRDate("25/12/2025")  // Returns: Date object para 25 de dezembro de 2025
 * parseBRDate("invalid")      // Returns: null
 */
function parseBRDate(dmy) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy);
  if (!m) return null;
  
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10) - 1;  // Date usa mês 0-11
  const yy = parseInt(m[3], 10);
  
  return new Date(yy, mm, dd);
}

/**
 * Formata um objeto Date para o padrão brasileiro DD/MM/YYYY
 * 
 * @param {Date} dt - Objeto de data
 * @returns {string} Data formatada como DD/MM/YYYY
 * 
 * @example
 * fmtBRDate(new Date(2025, 11, 25))  // Returns: "25/12/2025"
 */
function fmtBRDate(dt) {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  
  return `${dd}/${mm}/${yy}`;
}

/**
 * Adiciona dias a uma data (pode ser positivo ou negativo)
 * Creates nova instância, não modifica a original
 * 
 * @param {Date} dt - Data base
 * @param {number} n - Número de dias a adicionar (negativo para subtrair)
 * @returns {Date} Nova data com dias adicionados
 * 
 * @example
 * const d = new Date(2025, 11, 25);
 * const next = addDays(d, 3);  // 3 dias depois
 * const prev = addDays(d, -5); // 5 dias antes
 */
function addDays(dt, n) {
  const d = new Date(dt.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Retorna a data de segunda-feira do início da semana
 * Usa ISO: segunda = 1, domingo = 0
 * 
 * @param {Date} dt - Data qualquer da semana
 * @returns {Date} Date de segunda-feira (getDay() === 1)
 * 
 * @example
 * const wed = new Date(2025, 11, 25); // 25/12/2025 (quarta)
 * const mon = mondayOf(wed);          // 22/12/2025 (segunda)
 */
function mondayOf(dt) {
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const day = d.getDay();
  
  // Domigo (0) → -6, Segunda (1) → 0, Terça (2) → -1, ... Sábado (6) → -5
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  
  return d;
}

/**
 * Verifica se a data d2 é exatamente o dia seguinte de d1
 * 
 * @param {string} d1 - Data em formato DD/MM/YYYY
 * @param {string} d2 - Data em formato DD/MM/YYYY
 * @returns {boolean} true se d2 é o dia imediatamente após d1
 * 
 * @example
 * isNextDay("25/12/2025", "26/12/2025")  // Returns: true
 * isNextDay("25/12/2025", "27/12/2025")  // Returns: false
 */
function isNextDay(d1, d2) {
  const a = parseBRDate(d1);
  const b = parseBRDate(d2);
  
  if (!a || !b) return false;
  
  const diff = Math.round((b - a) / 86400000);  // 1 dia = 86.400.000 ms
  return diff === 1;
}

// ==========================================
// UTILITIES DE HORÁRIO
// ==========================================

/**
 * Converte horário HH:MM para total de minutos desde meia-noite
 * 
 * @param {string} hhmm - Horário em formato HH:MM
 * @returns {number|null} Minutos desde meia-noite ou null se inválido
 * 
 * @example
 * toMinutes("08:30")  // Returns: 510 (8*60 + 30)
 * toMinutes("23:45")  // Returns: 1425
 * toMinutes("invalid") // Returns: null
 */
function toMinutes(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  
  return hh * 60 + mm;
}

/**
 * Adiciona 24 horas a um horário
 * Usado quando saída cruza meia-noite
 * Exemplo: "02:00" (madrugada) → "26:00" (noite anterior)
 * 
 * @param {string} hhmm - Horário em formato HH:MM
 * @returns {string} Horário com +24h ou original se inválido
 * 
 * @example
 * add24("02:00")   // Returns: "26:00"
 * add24("17:30")   // Returns: "41:30"
 * add24("invalid") // Returns: "invalid"
 */
function add24(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  
  const hh = parseInt(m[1], 10) + 24;
  return `${String(hh).padStart(2, "0")}:${m[2]}`;
}

// ==========================================
// UTILITIES DE STRING
// ==========================================

/**
 * Sanitiza string para uso seguro em HTML
 * Escapa caracteres especiais que teriam significado em HTML
 * 
 * @param {string} s - String a escapar
 * @returns {string} String com HTML entities escapadas
 * 
 * @example
 * escapeHtml("<script>alert('xss')</script>")
 * // Returns: "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
 */
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Remove duplicatas de horários no mesmo dia
 * Remove pares (entrada + saída) completamente iguais
 * Exemplo: ["08:00", "08:00"] → []
 * 
 * @param {Array<string>} arr - Array de horários HH:MM
 * @returns {Array<string>} Array com duplicatas removidas
 * 
 * @example
 * suppressDuplicateTimesInDay(["08:00", "08:00", "12:00", "17:00"])
 * // Returns: ["12:00", "17:00"]
 */
function suppressDuplicateTimesInDay(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return arr || [];
  
  const out = arr.slice();
  
  // Remove pares duplicados consecutivos
  for (let i = 0; i < out.length - 1;) {
    if (out[i] && out[i] === out[i + 1]) {
      out.splice(i, 2);
      if (i > 0) i--;
    } else {
      i++;
    }
  }
  
  // Remove duplicatas sequenciais restantes
  for (let i = 1; i < out.length;) {
    if (out[i] === out[i - 1]) {
      out.splice(i, 1);
    } else {
      i++;
    }
  }
  
  return out;
}

/**
 * Aguarda (delay) de forma assíncrona
 * Útil para await em código assíncrono
 * 
 * @param {number} ms - Milissegundos a aguardar
 * @returns {Promise<void>} Promise que resolve após o delay
 * 
 * @example
 * await sleep(1000);  // Aguarda 1 segundo
 * console.log("Pronto!");
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// module.exports = {
//   // Datas
//   parseBRDate, fmtBRDate, addDays, mondayOf, isNextDay,
//   // Horários
//   toMinutes, add24,
//   // Strings
//   escapeHtml, suppressDuplicateTimesInDay, sleep
// };
