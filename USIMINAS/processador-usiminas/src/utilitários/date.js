/**
 * MÓDULO: date.js
 * Funções auxiliares para manipulação de datas.
 * Padroniza operações comuns de calendário usadas em todo o sistema.
 * 
 * Importações:
 * import { fmtBRDate, addDays, mondayOf, isNextCalendarDay } from './date.js'
 */

/**
 * Formata uma data JavaScript no padrão brasileiro dd/mm/aaaa.
 *
 * DESCRIÇÃO FUNCIONAL:
 * Transforma um objeto Date em uma string padronizada usada como:
 * - chave de mapas por dia (fmtBRDate(date) = "11/11/2016")
 * - título visual no HTML
 * - identificação de semanas
 *
 * CONTEXTO DE USO:
 * Essa função é usada em TODA a aplicação para padronizar a representação
 * textual dos dias. Garante consistência entre parser, domain e UI.
 *
 * REGRAS APLICADAS:
 * - sempre usa 2 dígitos para dia (com zero à esquerda)
 * - sempre usa 2 dígitos para mês (com zero à esquerda)
 * - sempre usa ano com 4 dígitos completos
 * - ordem: dia/mês/ano (padrão brasileiro)
 *
 * @param {Date} dt Data a ser formatada.
 * @returns {string} Data formatada no padrão "dd/mm/aaaa".
 *
 * @example
 * fmtBRDate(new Date(2016, 11, 11))  // "11/12/2016"
 * fmtBRDate(new Date(2016, 0, 5))    // "05/01/2016"
 */
export function fmtBRDate(dt) {
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/**
 * Retorna uma nova data com N dias somados à data original (imutável).
 *
 * DESCRIÇÃO FUNCIONAL:
 * Cria uma NOVA instância de Date sem mutar a data original.
 * Útil para cálculos de intervalo e construção de cronogramas.
 *
 * CONTEXTO DE USO:
 * Usada principalmente na construção das semanas do mês (buildWeeksForMonth).
 * Também aparece em outros cálculos de intervalo.
 *
 * REGRAS APLICADAS:
 * - não altera o objeto de entrada (imutável)
 * - usa o comportamento nativo de Date para transições de mês/ano
 * - suporta somas negativas (voltar dias)
 *
 * ALGORITMO:
 * 1. Cria cópia via getTime()
 * 2. Adiciona N dias via setDate(getDate() + n)
 * 3. Retorna nova instância
 *
 * @param {Date} dt Data base.
 * @param {number} n Quantidade de dias a somar (pode ser negativa).
 * @returns {Date} Nova data resultante (sem alterar dt).
 *
 * @example
 * addDays(new Date(2016, 11, 31), 1)     // 01/01/2017
 * addDays(new Date(2016, 11, 31), -1)    // 30/12/2016
 * addDays(new Date(2016, 0, 15), -20)    // ultima semana de dez/2015
 */
export function addDays(dt, n) {
  const d = new Date(dt.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Retorna a segunda-feira correspondente à semana da data informada.
 *
 * DESCRIÇÃO FUNCIONAL:
 * Dado QUALQUER dia da semana, esta função encontra o início lógico da semana,
 * considerando segunda-feira como primeiro dia (padrão ISO 8601 parente).
 *
 * CONTEXTO DE USO:
 * É a BASE da montagem dos blocos semanais exibidos na interface.
 * Usada por buildWeeksForMonth() e renderPerson().
 *
 * REGRAS APLICADAS:
 * - segunda-feira (getDay() = 1) retorna ela mesma
 * - domingo (getDay() = 0) retorna a segunda anterior (vai -6 dias)
 * - sexta, sábado retornam a segunda anterior
 * - o retorno é uma NOVA instância de Date
 *
 * ALGORITMO:
 * 1. getDay() retorna 0=domingo, 1=segunda, ..., 6=sábado
 * 2. Converte para diferença: (0 → -6, 1 → 0, 2 → -1, ..., 6 → -5)
 * 3. Volta por essa diferença usando setDate()
 *
 * @param {Date} dt Data de referência (qualquer dia da semana).
 * @returns {Date} Data da segunda-feira da mesma semana.
 *
 * @example
 * // Supondo segunda 11 de novembro de 2016:
 * mondayOf(new Date(2016, 10, 11))  // 11/11/2016 (terça) → 07/11/2016 (segunda)
 * mondayOf(new Date(2016, 10, 12))  // 12/11/2016 (domingo) → 07/11/2016 (segunda anterior)
 * mondayOf(new Date(2016, 10, 14))  // 14/11/2016 (segunda) → 14/11/2016 (ela mesma)
 */
export function mondayOf(dt) {
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Verifica se duas datas são calendário dias consecutivos.
 *
 * DESCRIÇÃO FUNCIONAL:
 * Determina se a data `b` é exatamente o dia seguinte da data `a`.
 * Ignora horas/minutos/segundos (compara apenas dia/mês/ano).
 *
 * CONTEXTO DE USO:
 * Usada por `adjustShifts()` para identificar dias consecutivos que podem
 * ter jornadas quebradas (virada noturna).
 *
 * IMPLEMENTAÇÃO IMPORTANTE:
 * Usa UTC (`Date.UTC`) para evitar bugs em datas de transição do Horário
 * de Verão, onde um dia pode ter 23 ou 25 horas.
 *
 * ALGORITMO:
 * 1. Converte ambas datas para timestamp UTC (00:00)
 * 2. Calcula diferença em milissegundos
 * 3. Verifica se diferença é exatamente 24h = 86.400.000 ms
 *
 * @param {Date} a Data anterior.
 * @param {Date} b Data subsequente.
 * @returns {boolean} true se b é o dia imediatamente após a.
 *
 * @example
 * isNextCalendarDay(Date(11/11), Date(12/11))  // true
 * isNextCalendarDay(Date(11/11), Date(13/11))  // false (2 dias)
 * isNextCalendarDay(Date(31/12), Date(01/01 próx))  // true
 * isNextCalendarDay(Date(11/11 08:00), Date(12/11 20:00))  // true (ignora horas)
 */
export function isNextCalendarDay(a, b) {
  // Utiliza UTC para evitar falhas em dias de transição do Horário de Verão
  const d1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const d2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return (d2 - d1) === 24 * 60 * 60 * 1000;
}