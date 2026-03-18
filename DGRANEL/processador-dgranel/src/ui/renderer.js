/**
 * @file renderer.js
 * @description Módulo responsável por renderizar dados em HTML e gerenciar interface
 * Converte modelo de dados em tabelas por semana e gerencia cópia para Excel
 * @version 1.0.0
 */

// ==========================================
// RENDERIZAÇÃO DE DADOS
// ==========================================

/**
 * Renderiza o modelo de dados em estrutura HTML no elemento #out
 * Cria seção para cada pessoa, referência e semana com tabela de horários
 * Adiciona botões para copiar semana em formato TSV
 * 
 * @param {Array<Object>} model - Modelo retornado por buildDataModel()
 * @returns {void} Modifica DOM diretamente (innerHTML do #out)
 * 
 * @comment Estrutura HTML gerada:
 * <div class="person">
 *   <h2>JOÃO SILVA</h2>
 *   <div class="ref">
 *     <div class="refhead">Referência: 03/2026</div>
 *     <div class="weeks">
 *       <div class="week">
 *         <div class="weekhead">Semana 01/03 a 07/03/2026</div>
 *         <table>... horários ...</table>
 *       </div>
 *     </div>
 *   </div>
 * </div>
 */
function render(model) {
  const elOut = document.getElementById("out");
  
  elOut.innerHTML = "";
  
  // Valida modelo vazio
  if (!model.length) {
    elOut.innerHTML = `<div class="section"><div class="muted">Nenhum período/jornada encontrado. Verifique se o texto contém "Período:" e linhas de "Função:".</div></div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  // Para cada pessoa
  for (const person of model) {
    const wrap = document.createElement("div");
    wrap.className = "person";
    wrap.innerHTML = `<h2>${escapeHtml(person.name)}</h2>`;

    // Para cada referência (mês)
    for (const ref of person.refs) {
      const refBox = document.createElement("div");
      refBox.className = "ref";

      // Agrupa dias em semanas
      const weeks = buildWeeks(ref.periodStart, ref.periodEnd);
      const start = parseBRDate(ref.periodStart);
      const end = parseBRDate(ref.periodEnd);
      const inRangeFn = (d) => (start && end && d >= start && d <= end);

      // Cabeçalho da referência
      const refHead = document.createElement("div");
      refHead.className = "refhead";
      refHead.innerHTML = `
        <div>
          <div style="font-weight:800;">Referência: ${escapeHtml(ref.refKey)}</div>
          <div class="meta">Período: ${escapeHtml(ref.periodStart)} → ${escapeHtml(ref.periodEnd)}</div>
        </div>
        <div class="meta">Semanas: ${weeks.filter(w => w.days.some(inRangeFn)).length}</div>
      `;
      refBox.appendChild(refHead);

      // Container de semanas
      const weeksWrap = document.createElement("div");
      weeksWrap.className = "weeks";

      // Para cada semana
      for (const w of weeks) {
        const visDays = w.days.filter(inRangeFn);
        if (!visDays.length) continue;

        const wk = document.createElement("div");
        wk.className = "week";

        // Calcula datas início/fim da semana
        const vStart = visDays[0];
        const vEnd = visDays[visDays.length - 1];
        const title = `Semana ${fmtBRDate(vStart)} a ${fmtBRDate(vEnd)}`;

        // Gera texto TSV para cópia
        const tsvCopy = toTSVForWeek(visDays, () => true, ref.days, null);

        // Cabeçalho semana com botão copiar
        const head = document.createElement("div");
        head.className = "weekhead";
        head.innerHTML = `
          <div class="weektitle">${escapeHtml(title)}</div>
          <button class="btn secondary" type="button">Copiar semana</button>
        `;
        
        // Event listener do botão copiar
        const btn = head.querySelector("button");
        btn.addEventListener("click", async () => {
          await copyToClipboard(tsvCopy);
          const elStatus = document.getElementById("status");
          elStatus.textContent = "Copiado para a área de transferência (TSV com TAB). Cole direto no Excel.";
          
          const old = btn.textContent;
          btn.textContent = "Copiado";
          btn.disabled = true;
          window.setTimeout(() => {
            btn.textContent = old;
            btn.disabled = false;
          }, 2500);
        });

        // Cria tabela de horários
        const table = document.createElement("table");
        table.className = "tbl";

        // Calcula máximo de colunas (número de horários no dia)
        let maxCols = 0;
        for (const d of visDays) {
          const times = (ref.days.get(fmtBRDate(d)) || []);
          maxCols = Math.max(maxCols, times.length + (times.length % 2));
        }

        const tbody = document.createElement("tbody");

        // Linha por dia
        for (const d of visDays) {
          const dk = fmtBRDate(d);
          const times = (ref.days.get(dk) || []).slice();
          
          // Completa par de horários
          if (times.length % 2 === 1) times.push("");

          const tr = document.createElement("tr");
          
          // Coluna por horário
          for (let i = 0; i < maxCols; i++) {
            const td = document.createElement("td");
            td.className = "mono";
            td.textContent = fmtExcelTime(times[i] || "");
            tr.appendChild(td);
          }
          
          tbody.appendChild(tr);
        }
        
        table.appendChild(tbody);

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
 * Organiza datas em semanas com segunda-feira como início
 * Útil para exibição em semanas semanais
 * 
 * @param {string} periodStart - Data inicial "DD/MM/YYYY"
 * @param {string} periodEnd - Data final "DD/MM/YYYY"
 * @returns {Array<Object>} Array de { mon: Date, days: Date[] } ordenado
 * 
 * @example
 * buildWeeks("01/03/2026", "07/03/2026")
 * // Returns: [{
 * //   mon: Date(2026, 2, 2),      // segunda 02/03
 * //   days: [Date, Date, ..., Date] // 7 dias
 * // }]
 */
function buildWeeks(periodStart, periodEnd) {
  const start = parseBRDate(periodStart);
  const end = parseBRDate(periodEnd);
  if (!start || !end) return [];

  // Cria array com todas as datas do período
  const all = [];
  for (let d = new Date(start.getTime()); d <= end; d = addDays(d, 1)) {
    all.push(new Date(d.getTime()));
  }
  
  if (!all.length) return [];

  // Agrupa por segunda-feira (chave = ISO string da segunda)
  const weeks = new Map();
  for (const d of all) {
    const mon = mondayOf(d);
    const k = mon.toISOString().slice(0, 10);
    if (!weeks.has(k)) weeks.set(k, { mon, days: [] });
  }

  // Expande cada semana para 7 dias
  for (const w of weeks.values()) {
    const days = [];
    for (let i = 0; i < 7; i++) days.push(addDays(w.mon, i));
    w.days = days;
  }

  // Ordena por segunda-feira
  return Array.from(weeks.values()).sort((a, b) => a.mon - b.mon);
}

/**
 * Formata horário para exibição (remove formatação especial)
 * Pode ser estendida para formatos específicos de Excel
 * 
 * @param {string} hhmm - Horário em formato HH:MM
 * @returns {string} Horário formatado para saída
 */
function fmtExcelTime(hhmm) {
  return (hhmm || "");
}

/**
 * Converte semana para formato TSV (Tab-Separated Values)
 * Ideal para copiar direto no Excel
 * 
 * @param {Array<Date>} weekDays - Array de dates da semana
 * @param {Function} inRangeFn - Callback para validar dia (retorna boolean)
 * @param {Map<string, Array>} dayToTimes - Map de "DD/MM/YYYY" → ["HH:MM", ...]
 * @param {string} weekLabel - Label da semana (opcional)
 * @returns {string} String TSV com quebras de linha
 * 
 * @example
 * const result = toTSVForWeek(
 *   [Date, Date, ...],
 *   (d) => true,
 *   new Map(["01/03/2026", ["08:00", "17:00"]]),
 *   "Semana 01/03 a 07/03"
 * );
 * // Returns:
 * // "Semana\tSemana 01/03 a 07/03\n01/03/2026\t08:00\t17:00\n..."
 */
function toTSVForWeek(weekDays, inRangeFn, dayToTimes, weekLabel) {
  let maxCols = 0;
  const rows = [];

  // Coleta dias e calcula máximo de colunas
  for (const d of weekDays) {
    if (!inRangeFn(d)) continue;
    const k = fmtBRDate(d);
    const times = (dayToTimes.get(k) || []).slice();
    
    // Completa par de valores
    if (times.length % 2 === 1) times.push("");
    maxCols = Math.max(maxCols, times.length);
    
    rows.push({ times });
  }

  const lines = [];
  
  // Adiciona label da semana
  if (weekLabel) lines.push(["Semana", weekLabel].join("\t"));

  // Converte cada linha para TSV
  for (const r of rows) {
    const line = [];
    for (let i = 0; i < maxCols; i++) {
      line.push(fmtExcelTime(r.times[i] || ""));
    }
    lines.push(line.join("\t"));
  }

  return lines.join("\n");
}

// ==========================================
// CLIPBOARD E UTILITÁRIOS
// ==========================================

/**
 * Copia texto para a área de transferência do navegador
 * Usa Clipboard API moderna com fallback para navegadores antigos
 * 
 * @param {string} text - Texto a copiar
 * @returns {Promise<void>} Promise que resolve quando cópia completa
 * 
 * @example
 * await copyToClipboard("Meu texto");
 * console.log("Copiado!");
 * 
 * @comment Fallback para navigator.clipboard.writeText não disponível:
 * - Cria textarea temporário
 * - Seleciona e copia com document.execCommand()
 * - Remove textarea do DOM
 */
async function copyToClipboard(text) {
  try {
    // API moderna
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

// module.exports = {
//   render,
//   buildWeeks,
//   toTSVForWeek,
//   copyToClipboard,
//   escapeHtml
// };
