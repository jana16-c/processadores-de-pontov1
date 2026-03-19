/**Fábrica de elementos HTML visuais
 * 
 * Responsabilidade: Transformar dados estruturados em visualização HTML pronta para usuário
 * Cria hierarquia: Pessoa → Meses → Semanas → Tabelas com botões de cópia
 */
import { fmtBRDate } from '../utilitários/data.js';
import { buildWeeksForMonth } from '../domain/buildWeeksForMonth.js';
import { toTSVForWeek } from '../domain/toTSVForWeek.js';
import { copyToClipboard } from '../utilitários/clipboard.js';

/**
 * [RENDERIZADOR PRINCIPAL] Constrói e injeta no DOM a visualização final.
 * 
 * Estrutura HTML gerada:
 * - div.result-block (container do funcionário)
 *   - div.person-name
 *   - div.month-card (for each month in timeline)
 *     - div.card-header (nome do mês, dias 01-31)
 *     - div.weeks
 *       - div.week (for each week in month)
 *         - div.weekhead
 *           - div.weektitle ("Semana DD/MM a DD/MM")
 *           - button.btn-copy (com evento onclick para copiar TSV)
 *         - table.tbl (dados dos horários)
 * 
 * Interatividades:
 * - Botão "Copiar semana" dispara copyToClipboard()
 * - Feedback: botão mostra "Copiado!" por 2s
 * 
 * @param {string} name - Nome completo do funcionário (extraído pelo parser)
 * @param {Array<Object>} timeline - Vetor ordenado de dias: {data: Date, times: ["HH:MM", ...]}
 * @param {HTMLElement} container - Div onde o resultado será injetado (appendChild)
 */
export function renderPerson(name, timeline, container) {
    const block = document.createElement('div');
    block.className = 'result-block';
    block.innerHTML = `<div class="person-name">${name}</div>`;

    const monthGroups = new Map();
    timeline.forEach(item => {
        const date = item.data;
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (!monthGroups.has(monthKey)) {
            monthGroups.set(monthKey, { year, month, daysMap: new Map() });
        }
        const g = monthGroups.get(monthKey);
        const dayKey = fmtBRDate(date);
        g.daysMap.set(dayKey, item.times || []);
    });

    Array.from(monthGroups.keys()).sort().forEach(monthKey => {
        const g = monthGroups.get(monthKey);
        const weeks = buildWeeksForMonth(g.year, g.month);
        const monthName = new Date(g.year, g.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const lastDayOfMonth = new Date(g.year, g.month + 1, 0).getDate();

        const card = document.createElement('div');
        card.className = 'month-card';

        const header = document.createElement('div');
        header.className = 'card-header';
        header.innerHTML = `
            <div>
                <div class="month-label">${monthName}</div>
                <div class="month-meta">Dias do mês: 01 até ${String(lastDayOfMonth).padStart(2, '0')}</div>
            </div>
        `;
        card.appendChild(header);

        const weeksWrap = document.createElement('div');
        weeksWrap.className = 'weeks';

        weeks.forEach(w => {
            if (!w.days.length) return;
            const start = w.days[0];
            const end = w.days[w.days.length - 1];
            const title = `Semana ${fmtBRDate(start)} a ${fmtBRDate(end)}`;

            const weekBox = document.createElement('div');
            weekBox.className = 'week';

            const weekHead = document.createElement('div');
            weekHead.className = 'weekhead';

            const weekTitle = document.createElement('div');
            weekTitle.className = 'weektitle';
            weekTitle.textContent = title;

            const btn = document.createElement('button');
            btn.className = 'btn-copy';
            btn.type = 'button';
            btn.textContent = 'Copiar semana';

            const tsv = toTSVForWeek(w.days, g.daysMap);
            btn.addEventListener('click', async () => {
                await copyToClipboard(tsv);
                const old = btn.textContent;
                btn.textContent = 'Copiado!';
                btn.classList.add('copied');
                setTimeout(() => { btn.textContent = old; btn.classList.remove('copied'); }, 2000);
            });

            weekHead.appendChild(weekTitle);
            weekHead.appendChild(btn);

            const table = document.createElement('table');
            table.className = 'tbl';
            const tbody = document.createElement('tbody');

            let maxCols = 0;
            w.days.forEach(d => {
                const times = (g.daysMap.get(fmtBRDate(d)) || []).slice();
                const len = times.length % 2 === 0 ? times.length : times.length + 1;
                maxCols = Math.max(maxCols, len);
            });

            w.days.forEach(d => {
                const key = fmtBRDate(d);
                const times = (g.daysMap.get(key) || []).slice();
                if (times.length % 2 !== 0) times.push("");
                while (times.length < maxCols) times.push("");

                const tr = document.createElement('tr');
                times.forEach(t => {
                    const td = document.createElement('td');
                    td.textContent = t || "";
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            weekBox.appendChild(weekHead);
            weekBox.appendChild(table);
            weeksWrap.appendChild(weekBox);
        });

        card.appendChild(weeksWrap);
        block.appendChild(card);
    });

    container.appendChild(block);
}