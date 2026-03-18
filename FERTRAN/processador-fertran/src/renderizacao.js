/**
 * @module renderizacao.js
 * @description Funções de renderização de dados em HTML e export para Excel
 */

/**
 * Constrói array de semanas para um período específico
 * Agrupa datas por semana (segunda até domingo)
 * 
 * @param {string} periodStart - DD/MM/YYYY início do período
 * @param {string} periodEnd   - DD/MM/YYYY fim do período
 * @returns {Array} Array de {mon: Date, days: [Date...]}
 * @example
 * buildWeeks("01/03/2026", "31/03/2026")
 * // Retorna: [
 * //   { mon: Date(09/03), days: [09/03, 10/03, ..., 15/03] },
 * //   { mon: Date(16/03), days: [16/03, 17/03, ..., 22/03] }
 * // ]
 */
function buildWeeks(periodStart, periodEnd) {
  const endDt = parseBRDate(periodEnd);
  if (!endDt) return [];
  
  const year = endDt.getFullYear();
  const month = endDt.getMonth();
  
  // Cria array com todos os dias do mês
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const all = [];
  for (let d = new Date(firstDay.getTime()); d <= lastDay; d = addDays(d, 1)) {
    all.push(new Date(d.getTime()));
  }
  
  if (!all.length) return [];
  
  // Agrupa dias por semana (segunda-feira é o primeiro dia)
  const weeks = new Map();
  for (const d of all) {
    const mon = mondayOf(d);
    const k = mon.toISOString().slice(0, 10);
    if (!weeks.has(k)) {
      weeks.set(k, { mon, days: [] });
    }
  }
  
  // Popula dias de cada semana (apenas do mês atual)
  for (const w of weeks.values()) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(w.mon, i);
      if (day.getMonth() === month && day.getFullYear() === year) {
        days.push(day);
      }
    }
    w.days = days;
  }
  
  return Array.from(weeks.values()).sort((a, b) => a.mon - b.mon);
}

/**
 * Formata horário para export/display
 * Extensível para futuros formatos (Excel, CSV, etc)
 * @param {string} hhmm - Horário HH:MM
 * @returns {string} Horário formatado
 */
function fmtExcelTime(hhmm) {
  return (hhmm || "");
}

/**
 * Converte uma semana para formato TSV (Tab-Separated Values)
 * Formato compatível com cola direto no Excel
 * 
 * @param {Array} weekDays - Array de Date (dias da semana)
 * @param {Function} inRangeFn - Função que valida se data está no intervalo
 * @param {Map} dayToTimes - Map de DD/MM/YYYY → [horário, horário, ...]
 * @param {string} weekLabel - Opcional: label da semana
 * @returns {string} String em formato TSV
 * @example
 * toTSVForWeek([segunda, terça, ...], d => true, mapa, "Semana 09-15/03")
 * // Retorna:
 * // "Semana\t09-15/03\n08:00\t12:00\n13:00\t18:00\n08:15\t..."
 */
function toTSVForWeek(weekDays, inRangeFn, dayToTimes, weekLabel) {
  let maxCols = 0;
  const rows = [];
  
  // Processa cada dia da semana
  for (const d of weekDays) {
    if (!inRangeFn(d)) continue;
    
    const k = fmtBRDate(d);
    const times = (dayToTimes.get(k) || []).slice();
    
    // Completa com vazio se número ímpar de horários
    if (times.length % 2 === 1) times.push("");
    
    maxCols = Math.max(maxCols, times.length);
    rows.push({ times });
  }
  
  const lines = [];
  
  // Adiciona cabeçalho se fornecido
  if (weekLabel) {
    lines.push(["Semana", weekLabel].join("\t"));
  }
  
  // Converte cada dia em linha TSV
  for (const r of rows) {
    const line = [];
    for (let i = 0; i < maxCols; i++) {
      line.push(fmtExcelTime(r.times[i] || ""));
    }
    lines.push(line.join("\t"));
  }
  
  return lines.join("\n");
}

/**
 * Renderiza modelo de dados no DOM
 * Cria estrutura com:
 * - Nomes de funcionários
 * - Referências (mês/ano)
 * - Semanas agrupadas
 * - Tabelas com horários
 * - Botões para copiar semanas
 * 
 * @param {Array} model - Array de {name, refs: [{refKey, periodStart, periodEnd, days}]}
 */
function render(model) {
  const elOut = document.getElementById("out");
  elOut.innerHTML = "";
  
  if (!model.length) {
    elOut.innerHTML = `<div class="section"><div class="muted">Nenhuma batida encontrada. Verifique se o texto contém registros no formato "Função Jornada de Trabalho Tipo ...".</div></div>`;
    return;
  }
  
  const frag = document.createDocumentFragment();
  
  for (const person of model) {
    const wrap = document.createElement("div");
    wrap.className = "person";
    wrap.innerHTML = `<h2>${escapeHtml(person.name)}</h2>`;
    
    for (const ref of person.refs) {
      const refBox = document.createElement("div");
      refBox.className = "ref";
      
      // Constrói semanas do período
      const weeks = buildWeeks(ref.periodStart, ref.periodEnd);
      const endDt = parseBRDate(ref.periodEnd);
      const monthStart = endDt ? new Date(endDt.getFullYear(), endDt.getMonth(), 1) : null;
      const monthEnd = endDt ? new Date(endDt.getFullYear(), endDt.getMonth() + 1, 0) : null;
      const inRangeFn = (d) => (monthStart && monthEnd && d >= monthStart && d <= monthEnd);
      
      // Cabeçalho da referência
      const refHead = document.createElement("div");
      refHead.className = "refhead";
      refHead.innerHTML = `
        <div>
          <div style="font-weight:800;">Referência: ${escapeHtml(ref.refKey)}</div>
          <div class="meta">Período do relatório: ${escapeHtml(ref.periodStart)} → ${escapeHtml(ref.periodEnd)}</div>
        </div>
        <div class="meta">Semanas: ${weeks.filter(w => w.days.length > 0).length}</div>
      `;
      refBox.appendChild(refHead);
      
      // Container para semanas
      const weeksWrap = document.createElement("div");
      weeksWrap.className = "weeks";
      
      // Renderiza cada semana
      for (const w of weeks) {
        const visDays = w.days;
        if (!visDays.length) continue;
        
        const wk = document.createElement("div");
        wk.className = "week";
        
        // Título da semana
        const vStart = visDays[0];
        const vEnd = visDays[visDays.length - 1];
        const title = `Semana ${fmtBRDate(vStart)} a ${fmtBRDate(vEnd)}`;
        
        // Prepara conteúdo TSV para copiar
        const tsvCopy = toTSVForWeek(visDays, () => true, ref.days, null);
        
        // Cabeçalho com botão
        const head = document.createElement("div");
        head.className = "weekhead";
        head.innerHTML = `
          <div class="weektitle">${escapeHtml(title)}</div>
          <button class="btn secondary" type="button">Copiar semana</button>
        `;
        
        const btn = head.querySelector("button");
        btn.addEventListener("click", async () => {
          await copyToClipboard(tsvCopy);
          const elStatus = document.getElementById("status");
          elStatus.textContent = "Copiado para a área de transferência (TSV com TAB). Cole direto no Excel.";
          
          // Feedback visual
          const old = btn.textContent;
          btn.textContent = "Copiado";
          btn.disabled = true;
          window.setTimeout(() => {
            btn.textContent = old;
            btn.disabled = false;
          }, 2500);
        });
        
        // Cria tabela com horários
        const table = document.createElement("table");
        table.className = "tbl";
        
        // Calcula máximo de colunas
        let maxCols = 0;
        for (const d of visDays) {
          const times = (ref.days.get(fmtBRDate(d)) || []);
          maxCols = Math.max(maxCols, times.length + (times.length % 2));
        }
        
        const tbody = document.createElement("tbody");
        
        // Adiciona linha para cada dia
        for (const d of visDays) {
          const dk = fmtBRDate(d);
          const times = (ref.days.get(dk) || []).slice();
          if (times.length % 2 === 1) times.push("");
          
          const tr = document.createElement("tr");
          for (let i = 0; i < maxCols; i++) {
            const td = document.createElement("td");
            td.className = "mono";
            td.textContent = fmtExcelTime(times[i] || "");
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        
        // Monta semana
        wk.appendChild(head);
        wk.appendChild(table);
        weeksWrap.appendChild(wk);
      }
      
      refBox.appendChild(weeksWrap);
      wrap.appendChild(refBox);
    }
    
    frag.appendChild(wrap);
  }
  
  elOut.appendChild(frag);
}

/**
 * Escapa caracteres especiais HTML para segurança
 * Previne injeção XSS em renderização de dados
 * 
 * @param {string} s - String para escapar
 * @returns {string} String com caracteres escapados
 * @example
 * escapeHtml("<script>alert('xss')</script>")
 * // → "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
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
 * Copia texto para a área de transferência
 * Tenta API moderna, fallback para execCommand
 * 
 * @param {string} text - Texto a copiar
 * @returns {Promise} Promise que resolve quando copiado
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // Fallback para navegadores antigos
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// ─────────────────────────────────────────────────────────────
// Imports necessários
// ─────────────────────────────────────────────────────────────
/*
// De utilidades-data.js:
// import { parseBRDate, fmtBRDate, addDays, mondayOf } from './utilidades-data.js';
*/

// ─────────────────────────────────────────────────────────────
// Exports (se usar como módulo)
// ─────────────────────────────────────────────────────────────
/*
export {
  buildWeeks,
  fmtExcelTime,
  toTSVForWeek,
  render,
  escapeHtml,
  copyToClipboard
};
*/
