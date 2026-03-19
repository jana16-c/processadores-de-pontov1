/**
 * Exibe uma mensagem de erro na interface do usuário.
 * O erro é mostrado em uma caixa de erro visível no topo da página.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
export function showError(message) {
    const errBox = document.getElementById('error-box');
    if (errBox) {
        errBox.textContent = message;
        errBox.style.display = 'block';
    }
}
