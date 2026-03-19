/**Motor de leitura textual e matemática de turnos
 */
import { parseToMins, formatMins } from '../utilitários/time.js';

/**
 * Função auxiliar do parser para extrair estritamente horários de uma linha de texto.
 * Identifica e valida padrões HH:MM, tratando regras de marcação irregular.
 * @param {string} line - A linha de texto a ser analisada.
 * @param {Object} dayObj - O objeto que armazena os dados do dia corrente.
 * @param {boolean} isFirstLine - Indica se é a primeira linha de leitura daquele dia.
 * @param {boolean} isIrregularLine - Indica se o dia possui a flag de marcação irregular.
 * @param {boolean} hasMissingExit - Indica se o dia possui falha de marcação de saída.
 * @param {Object} schedules - Mapa de horários contratuais (para preencher lacunas).
 */

/**
 * Função principal de análise (parser). Lê o texto bruto e estrutura os dados.
 * Extrai os horários, trata fusões de turno e ordena cronologicamente considerando a madrugada.
 * @param {string} text - O texto bruto extraído do PDF.
 * @returns {Object} Um mapa (dicionário) agrupando os horários processados por funcionário.
 */
export function parseInput(text) {
    
    const map = {};
    const normalizedText = text.replace(/\r/g, '').replace(/\u00A0/g, ' ');
    const lines = normalizedText.split('\n');

    // Rubricas válidas solicitadas
    const rubricasValidas = [
        "011", "026", "110", "111", "114", "115", "120", 
        "130", "131", "132", "133", "134", "135", "140", "211"
    ];

    let currentName = "COLABORADOR NÃO IDENTIFICADO";
    let currentDateObj = null;

    // Expressões regulares
    const rgName = /Empregado:\s*[\d-]+\s*-\s*(.*?)(?:\s+Destacamento:|$)/i;
    const rgDate = /^(?:seg|ter|qua|qui|sex|s[aá]b|dom)\s+(\d{2})\/(\d{2})\/(\d{4})/i;
    const rgTimes = /(\d{2}:\d{2})\s+(\d{2}:\d{2})\s+(\d{3})\s+/;

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (!l) continue;

        // 1. Identifica o Nome do Empregado
        const mName = l.match(rgName);
        if (mName) {
            currentName = mName[1].trim().toUpperCase();
            if (!map[currentName]) map[currentName] = [];
            currentDateObj = null; 
            continue;
        }

        // 2. Tenta capturar uma nova Data na linha
        const mDate = l.match(rgDate);
        if (mDate) {
            const day = parseInt(mDate[1], 10);
            const month = parseInt(mDate[2], 10);
            const year = parseInt(mDate[3], 10);
            
            // Atualiza a data atual em memória
            currentDateObj = new Date(year, month - 1, day);
            
            // Se a data mudou, garante que o dia exista no array
            let dayExists = map[currentName].find(d => d.data.getTime() === currentDateObj.getTime());
            if (!dayExists) {
                map[currentName].push({
                    data: currentDateObj,
                    times: []
                });
            }
        }

        // 3. Captura os horários se houver uma rubrica válida e uma data ativa
        if (currentDateObj) {
            const mTimes = l.match(rgTimes);
            if (mTimes) {
                const inicio = mTimes[1];
                const termino = mTimes[2];
                const codigoAtividade = mTimes[3];

                if (rubricasValidas.includes(codigoAtividade)) {
                    // Encontra o objeto correspondente à data atual lida
                    let currentDayRecord = map[currentName].find(d => d.data.getTime() === currentDateObj.getTime());
                    
                    if (currentDayRecord) {
                        currentDayRecord.times.push(inicio);
                        currentDayRecord.times.push(termino);
                    }
                }
            }
        }
    }

    // 4. Mesclar horários adjacentes (colados)
    for (let name in map) {
        for (let day of map[name]) {
            // Só faz sentido mesclar se houver 4 ou mais batidas (2 ou mais pares)
            if (day.times.length >= 4) {
                let mergedTimes = [];
                for (let i = 0; i < day.times.length; i += 2) {
                    let currentIn = day.times[i];
                    let currentOut = day.times[i + 1];

                    // Verifica se há algo já mesclado e se o último término é igual ao novo início
                    if (mergedTimes.length > 0) {
                        let lastOut = mergedTimes[mergedTimes.length - 1];
                        if (lastOut === currentIn) {
                            // Atualiza o último término com o término do par atual
                            mergedTimes[mergedTimes.length - 1] = currentOut;
                            continue;
                        }
                    }
                    
                    // Se não colou com o anterior, adiciona o par normalmente
                    mergedTimes.push(currentIn, currentOut);
                }
                // Substitui a lista de horários original pela lista mesclada
                day.times = mergedTimes;
            }
        }
    }
    // 4.5.Transferência de turno entre dias ("Roubar" batida)
        for (let name in map) {
            // Garante que os dias estejam em ordem cronológica
            map[name].sort((a, b) => a.data - b.data);

            for (let i = 0; i < map[name].length - 1; i++) {
                let currentDay = map[name][i];
                let nextDay = map[name][i + 1];

                let diffTime = Math.abs(nextDay.data - currentDay.data);
                let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 

                if (diffDays === 1 && currentDay.times.length > 0 && nextDay.times.length > 0) {
                    
                    // Verifica se o turno do dia atual realmente atravessou a meia-noite
                    let crossedMidnight = false;
                    let prevMins = -1;
                    for (let t of currentDay.times) {
                        let parts = t.split(':');
                        let mins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                        // Se o horário atual for menor que o anterior (ex: 01:00 < 23:00), varou a noite
                        if (mins < prevMins) crossedMidnight = true;
                        prevMins = mins;
                    }

                    // SÓ rouba a batida de amanhã se tiver varado a noite
                    if (crossedMidnight) {
                        while (currentDay.times.length > 0 && nextDay.times.length >= 2) {
                            let lastOut = currentDay.times[currentDay.times.length - 1];
                            let nextIn = nextDay.times[0];

                            if (lastOut === nextIn) {
                                currentDay.times[currentDay.times.length - 1] = nextDay.times[1];
                                nextDay.times.splice(0, 2);
                            } else {
                                break;
                            }
                        }
                    }
                }
            }
        }
    // 5. Converter horários noturnos para 24+ (ex: 04:30 -> 28:30)
        for (let name in map) {
            for (let day of map[name]) {
                let processedTimes = [];
                let lastMins = -1;

                for (let i = 0; i < day.times.length; i++) {
                    let timeStr = day.times[i];
                    let parts = timeStr.split(':');
                    let h = parseInt(parts[0], 10);
                    let m = parseInt(parts[1], 10);
                    let currentMins = h * 60 + m;

                    // Se o horário atual for menor que o último registrado, significa que virou a noite.
                    // Soma 24h (1440 min) até que ele seja maior que o anterior.
                    while (currentMins < lastMins) {
                        currentMins += 1440;
                    }
                    lastMins = currentMins;

                    // Formata de volta para HH:mm permitindo horas acima de 24
                    let outH = Math.floor(currentMins / 60);
                    let outM = currentMins % 60;
                    let formatted = String(outH).padStart(2, '0') + ':' + String(outM).padStart(2, '0');
                    
                    processedTimes.push(formatted);
                }
                day.times = processedTimes;
            }
        }

    return map;
}