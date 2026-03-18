/**
 * @module ui.js
 * @description Funções de controle da interface de usuário e eventos
 */

/**
 * Atualiza a mensagem de status na tela
 * Exibe feedback ao usuário sobre operações em andamento
 * 
 * @param {string} msg - Mensagem a exibir (vazio para limpar)
 * @example
 * setStatus("Processando...")
 * setStatus() // Limpa
 */
function setStatus(msg) {
  const elStatus = document.getElementById("status");
  elStatus.textContent = msg || "";
}

/**
 * Exibe/oculta o spinner de carregamento
 * Também desabilita/habilita o botão de processar
 * 
 * @param {boolean} on - true para mostrar loading, false para ocultar
 * @example
 * setLoading(true)  // Mostra spinner
 * setLoading(false) // Oculta spinner
 */
function setLoading(on) {
  const elLoader = document.getElementById("loader");
  const btnProcess = document.getElementById("btnProcess");
  
  elLoader.style.display = on ? "inline-block" : "none";
  btnProcess.disabled = on;
}

/**
 * Exibe notificação "Pronto!" por 2.5 segundos
 * Feedback visual de conclusão de operação
 * 
 * @example
 * flashReady() // Exibe pill "Pronto!"
 */
function flashReady() {
  const elPillReady = document.getElementById("pillReady");
  elPillReady.style.display = "inline-block";
  setTimeout(() => {
    elPillReady.style.display = "none";
  }, 2500);
}

/**
 * Simula barra de progresso durante processamento
 * Atualiza status visualmente enquanto o processamento ocorre
 * 
 * @param {number} msTotal - Duração total em milissegundos (padrão: 900ms)
 * @returns {Promise} Promise que resolve ao fim do tempo
 * @example
 * await simulateProgress(800)
 * // Exibe "Carregando... 0%" → "100%"
 */
function simulateProgress(msTotal = 900) {
  let pct = 0;
  const start = performance.now();
  
  return new Promise(resolve => {
    function tick() {
      const t = performance.now() - start;
      pct = Math.min(99, Math.floor((t / msTotal) * 100));
      setStatus(`Carregando... ${pct}%`);
      
      if (t >= msTotal) return resolve();
      requestAnimationFrame(tick);
    }
    
    tick();
  });
}

/**
 * Alterna o modo entre "Com Espera" e "Sem Espera"
 * Atualiza título e página
 * 
 * @example
 * updateMode() // Executado ao mudar radio button
 */
function updateMode() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const titleEl = document.getElementById("main-title");
  
  if (mode === "com_espera") {
    titleEl.textContent = "Processador de ponto - Fertran (Com Espera)";
    document.title = "Processador de ponto — Fertran (Com Espera)";
  } else {
    titleEl.textContent = "Processador de ponto - Fertran (Sem Espera)";
    document.title = "Processador de ponto — Fertran (Sem Espera)";
  }
}

/**
 * Dorme por um número específico de milissegundos
 * Util para delays em processamento assíncrono
 * 
 * @param {number} ms - Milissegundos a esperar
 * @returns {Promise} Promise que resolve após o delay
 * @example
 * await sleep(1000) // Aguarda 1 segundo
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Processa o texto e renderiza resultado
 * Fluxo completo:
 * 1. Normalize texto
 * 2. Simula carregamento
 * 3. Escolhe motor (com/sem espera)
 * 4. Renderiza resultado
 * 
 * Executado ao clicar em "Processar texto"
 */
async function handleProcessClick() {
  const elRaw = document.getElementById("raw");
  const elOut = document.getElementById("out");
  const raw = (elRaw.value || "").trim();
  
  if (!raw) {
    setStatus();
    return;
  }
  
  setLoading(true);
  elOut.innerHTML = "";
  setStatus("Carregando... 0%");
  
  // Simula progresso por 800ms
  await simulateProgress(800);
  
  let model = [];
  const mode = document.querySelector('input[name="mode"]:checked').value;
  
  try {
    // Escolhe motor baseado no modo
    if (mode === "com_espera") {
      model = buildDataModelComEspera(raw);
    } else {
      model = buildDataModelSemEspera(raw);
    }
  } catch (err) {
    console.error(err);
    setStatus("Não consegui interpretar o texto. Verifique o formato do PDF.");
    setLoading(false);
    return;
  }
  
  setStatus("Carregando... 100%");
  render(model);
  setLoading(false);
  flashReady();
  setStatus();
}

/**
 * Limpa toda a entrada e saída
 * Executado ao clicar em "Limpar tudo"
 */
function handleClearClick() {
  const elRaw = document.getElementById("raw");
  const elOut = document.getElementById("out");
  
  elRaw.value = "";
  elOut.innerHTML = "";
  setStatus("");
}

/**
 * Inicializa listeners de eventos
 * Conecta botões e radio buttons às funções
 * 
 * Chamado uma vez ao carregar a página
 */
function initializeEventListeners() {
  const btnProcess = document.getElementById("btnProcess");
  const btnClear = document.getElementById("btnClear");
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  
  // Botão processar
  btnProcess.addEventListener("click", handleProcessClick);
  
  // Botão limpar
  btnClear.addEventListener("click", handleClearClick);
  
  // Radio buttons de modo
  for (const radio of modeRadios) {
    radio.addEventListener("change", updateMode);
  }
}

// Executar ao carregar a página
// window.addEventListener("DOMContentLoaded", initializeEventListeners);

// ─────────────────────────────────────────────────────────────
// Imports necessários
// ─────────────────────────────────────────────────────────────
/*
// De modelagem.js:
// import { buildDataModelComEspera, buildDataModelSemEspera } from './modelagem.js';

// De renderizacao.js:
// import { render } from './renderizacao.js';
*/

// ─────────────────────────────────────────────────────────────
// Event Handlers (estrutura recomendada)
// ─────────────────────────────────────────────────────────────
/*
Fluxo de Eventos:

1. btnProcess.click →
   - setLoading(true)
   - setStatus("Carregando... 0%")
   - simulateProgress(800ms)
   - buildDataModel() [ComEspera ou SemEspera]
   - render(model)
   - setLoading(false)
   - flashReady()
   - setStatus()

2. btnClear.click →
   - Limpa textarea
   - Limpa output
   - Limpa status

3. modeRadios.change →
   - updateMode()
   - Atualiza título/documento
*/

// ─────────────────────────────────────────────────────────────
// Exports (se usar como módulo)
// ─────────────────────────────────────────────────────────────
/*
export {
  setStatus,
  setLoading,
  flashReady,
  simulateProgress,
  updateMode,
  sleep,
  handleProcessClick,
  handleClearClick,
  initializeEventListeners
};
*/
