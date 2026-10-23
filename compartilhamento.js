/**
 * FloodPath - Compartilhamento Preventivo via WhatsApp
 */
function compartilharAlertaWhatsApp() {
    // Pega o link atual da página do FloodPath
    const urlSite = window.location.href;

    // Mensagem com foco na prevenção para familiares e amigos
    const mensagem = 
`ALERTA DE ALAGAMENTO - FLOODPATH

Atenção! Consultei o mapa do FloodPath e identifiquei vias interrompidas e pontos de alagamento na região. 

Verifique as rotas seguras e evite as áreas de risco acessando o link:
${urlSite}`;

    // Codifica a mensagem para preservar emojis, acentos e quebras de linha
    const mensagemFormatada = encodeURIComponent(mensagem);

    // Link da API oficial do WhatsApp para compartilhamento direto
    const linkWhatsApp = `https://api.whatsapp.com/send/?text=${mensagemFormatada}`;

    // Abre em uma nova guia
    window.open(linkWhatsApp, "_blank");
}