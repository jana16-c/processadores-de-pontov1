import { parseInput } from './parser/parseInput.js';
import { adjustShifts } from './domain/adjustShifts.js';
import { renderPerson } from './ui/renderPerson.js';
import { showError } from './ui/showError.js';

/**
 * Recebe o clique, chama o parser, chama a regra e renderiza
 */

function processData() {
  const btn = document.getElementById('btn-process');
  const originalText = btn.textContent;

  btn.textContent = 'Processando...';
  btn.disabled = true;

  const rawData = document.getElementById('raw-data').value;
  const output = document.getElementById('results-area');
  const errBox = document.getElementById('error-box');

  output.innerHTML = '';
  errBox.style.display = 'none';

  if (!rawData.trim()) {
    showError('Por favor, cole o texto do PDF.');
    btn.textContent = originalText;
    btn.disabled = false;
    return;
  }

  try {
    const dataMap = parseInput(rawData);
    let found = false;

    Object.keys(dataMap).sort().forEach(name => {
      let timeline = dataMap[name] || [];
      if (!timeline.length) return;

      found = true;
      timeline.sort((a, b) => a.data - b.data);
      timeline = adjustShifts(timeline);
      renderPerson(name, timeline, output);
    });

    if (!found) showError('Nenhum funcionário ou batida foi encontrado no texto.');
  } catch (e) {
    console.error(e);
    showError('Erro ao processar.');
  }

  btn.textContent = 'Processado!';
  btn.classList.add('copied');

  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove('copied');
    btn.disabled = false;
  }, 2000);
}

window.processData = processData;