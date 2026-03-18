/**
 * MÓDULO: showError.js
 * Exibe mensagens de erro para o usuário na interface.
 * 
 * Importações:
 * import { showError } from './showError.js'
 */

/**
 * Exibe erro no box visual da página.
 *
 * DESCRIÇÃO FUNCIONAL:
 * Localiza a caixa de erro pré-existente no HTML (#error-box) e exibe
 * a mensagem fornecida ao usuário, tornando-a visível.
 *
 * CONTEXTO DE USO:
 * Chamada quando o processamento falha ou o usuário fornece entrada inválida.
 * Exemplos:
 * - "Por favor, cole o texto do PDF."
 * - "Nenhum funcionário ou batida foi encontrado no texto."
 * - "Erro ao processar."
 *
 * COMPORTAMENTO:
 * 1. Localiza elemento DOM com id "error-box"
 * 2. Define o texto interno (innerText) com a mensagem
 * 3. Torna visível via display = 'block'
 *
 * ESTRUTURA HTML ESPERADA:
 * <div id="error-box" style="display: none;">
 *   <!-- mensaje aparecerá aqui -->
 * </div>
 *
 * @param {string} msg Mensagem de erro a exibir para o usuário.
 * @returns {void}
 *
 * @example
 * showError("Nenhum dados encontrados");
 * // Resultado: A caixa #error-box aparece com a mensagem
 */
export function showError(msg) {
  const box = document.getElementById('error-box');
  box.innerText = msg;
  box.style.display = 'block';
}