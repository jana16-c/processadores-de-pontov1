/**Utilitário de área de transferência (Clipboard)
 * 
 * Fornece função para copiar texto para a área de transferência do SO
 * Com suporte a navegadores modernos E legados
 */

/**
 * Copia um texto para a área de transferência do sistema operacional do usuário.
 * 
 * Estratégia de compatibilidade:
 * 1. Tenta usar a API moderna navigator.clipboard.writeText() (Promise-based)
 * 2. Se falhar (navegador legado), usa fallback: document.execCommand("copy")
 *    - Cria textarea temporário (posicionado fora da tela)
 *    - Seleciona texto
 *    - Executa comando nativo de cópia
 *    - Remove elemento do DOM
 * 
 * @param {string} text - O texto a ser copiado para a área de transferência.
 * 
 * Exemplo:
 *   await copyToClipboard("08:00\t12:00\n13:00\t17:00");
 *   // Texto está na área de transferência, pronto para colar no Excel
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