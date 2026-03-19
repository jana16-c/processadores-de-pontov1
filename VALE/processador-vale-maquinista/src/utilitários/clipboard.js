/**
 * Copia um texto para a área de transferência do sistema operacional do usuário.
 * Tenta usar a API moderna navigator.clipboard e possui fallback para document.execCommand.
 * @param {string} text - O texto a ser copiado.
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (e) {
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