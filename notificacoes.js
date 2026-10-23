/* ============================================================
   NOTIFICACOES.JS - Gestão de Alertas com Ativação Padrão Total
   ============================================================ */

window.CONFIG_NOTIFICACOES = {
    ativa: localStorage.getItem('floodpath_notif_ativa') === 'true',
    cristo: localStorage.getItem('floodpath_notif_cristo') !== 'false',
    sesc: localStorage.getItem('floodpath_notif_sesc') !== 'false'
};

let eventSource = null;

/**
 * Solicita permissão de notificação nativa ao navegador
 */
async function solicitarPermissaoNotificacao() {
    if (!('Notification' in window)) {
        alert('Este navegador não suporta notificações de sistema.');
        return false;
    }
    if (Notification.permission === 'granted') {
        return true;
    }
    if (Notification.permission !== 'denied') {
        const permissao = await Notification.requestPermission();
        return permissao === 'granted';
    }
    alert('As notificações estão bloqueadas nas configurações do seu navegador.');
    return false;
}

/**
 * Atualiza e persiste todas as preferências do usuário.
 * Ao ligar a chave mestre, marca automaticamente Cristo e SESC como ativos.
 */
async function salvarPreferenciasNotificacao(event) {
    const chkMain = document.getElementById('chk-ativar-notif');
    const chkCristo = document.getElementById('chk-notif-cristo');
    const chkSesc = document.getElementById('chk-notif-sesc');
    const painel = document.getElementById('painel-regioes-notif');

    if (!chkMain) return;

    const targetId = event && event.target ? event.target.id : null;
    let estaAtivo = chkMain.checked;

    // Se o usuário clicou no botão mestre para LIGAR:
    if (targetId === 'chk-ativar-notif' && estaAtivo) {
        if ('Notification' in window && Notification.permission !== 'granted') {
            const permitida = await solicitarPermissaoNotificacao();
            if (!permitida) {
                estaAtivo = false;
                chkMain.checked = false;
            }
        }

        // Garante que ambos os pontos entram marcados/ativos por padrão
        if (estaAtivo) {
            if (chkCristo) chkCristo.checked = true;
            if (chkSesc) chkSesc.checked = true;
        }
    } else if (estaAtivo && 'Notification' in window && Notification.permission !== 'granted') {
        const permitida = await solicitarPermissaoNotificacao();
        if (!permitida) {
            estaAtivo = false;
            chkMain.checked = false;
        }
    }

    const cristoAtivo = chkCristo ? chkCristo.checked : true;
    const sescAtivo = chkSesc ? chkSesc.checked : true;

    // Atualiza o estado global na memória
    window.CONFIG_NOTIFICACOES.ativa = estaAtivo;
    window.CONFIG_NOTIFICACOES.cristo = cristoAtivo;
    window.CONFIG_NOTIFICACOES.sesc = sescAtivo;

    // Persiste no localStorage
    localStorage.setItem('floodpath_notif_ativa', estaAtivo ? 'true' : 'false');
    localStorage.setItem('floodpath_notif_cristo', cristoAtivo ? 'true' : 'false');
    localStorage.setItem('floodpath_notif_sesc', sescAtivo ? 'true' : 'false');

    // Exibe ou oculta o painel regional
    if (painel) {
        painel.style.display = estaAtivo ? 'flex' : 'none';
    }
}

/**
 * Sincroniza os Toggles com o localStorage e estado visual ao carregar a página
 */
function sincronizarTelaNotificacoes() {
    const chkMain = document.getElementById('chk-ativar-notif');
    const chkCristo = document.getElementById('chk-notif-cristo');
    const chkSesc = document.getElementById('chk-notif-sesc');
    const painel = document.getElementById('painel-regioes-notif');

    if (chkMain) chkMain.checked = window.CONFIG_NOTIFICACOES.ativa;
    if (chkCristo) chkCristo.checked = window.CONFIG_NOTIFICACOES.cristo;
    if (chkSesc) chkSesc.checked = window.CONFIG_NOTIFICACOES.sesc;

    if (painel) {
        painel.style.display = window.CONFIG_NOTIFICACOES.ativa ? 'flex' : 'none';
    }
}

/**
 * Conexão Server-Sent Events (SSE) com o backend Spring Boot
 */
function conectarStreamServidor() {
    try {
        const apiUrl = (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : 'http://localhost:8080/api/rios';
        if (eventSource) eventSource.close();
        eventSource = new EventSource(`${apiUrl}/stream`);

        eventSource.addEventListener('nova-leitura', function (e) {
            try {
                const leitura = JSON.parse(e.data);
                processarAlertaTempoReal(leitura);
            } catch (err) {
                console.error('Erro ao processar leitura SSE:', err);
            }
        });
    } catch (e) {
        console.warn('Servidor SSE offline ou indisponível.');
    }
}

/**
 * Filtro e processamento com Trava Tripla de Segurança
 */
function processarAlertaTempoReal(leitura) {
    const chkMain = document.getElementById('chk-ativar-notif');

    // TRAVA 1: Se o botão mestre na tela estiver DESLIGADO, aborta
    if (chkMain && !chkMain.checked) return;

    // TRAVA 2: Se a variável na memória ou no localStorage estiverem DESLIGADOS, aborta
    if (!window.CONFIG_NOTIFICACOES.ativa || localStorage.getItem('floodpath_notif_ativa') !== 'true') {
        return;
    }

    // Identificação e normalização dos dados do sensor
    const rawSensorId = (leitura.sensorId || leitura.sensor_id || leitura.id || '').toString().toUpperCase();
    const rawNome = (leitura.nome || '').toString().toUpperCase();

    const eCristo = rawSensorId.includes('CRISTO') || 
                    rawSensorId === 'SENSOR_01' || 
                    rawSensorId === '1' || 
                    rawNome.includes('CRISTO');

    const eSesc = rawSensorId.includes('SESC') || 
                  rawSensorId === 'SENSOR_02' || 
                  rawSensorId === '2' || 
                  rawNome.includes('SESC');

    // Validação regional do CRISTO
    const chkCristo = document.getElementById('chk-notif-cristo');
    if (eCristo) {
        if (chkCristo && !chkCristo.checked) return;
        if (!window.CONFIG_NOTIFICACOES.cristo || localStorage.getItem('floodpath_notif_cristo') === 'false') return;
    }

    // Validação regional do SESC
    const chkSesc = document.getElementById('chk-notif-sesc');
    if (eSesc) {
        if (chkSesc && !chkSesc.checked) return;
        if (!window.CONFIG_NOTIFICACOES.sesc || localStorage.getItem('floodpath_notif_sesc') === 'false') return;
    }

    if (!eCristo && !eSesc) return;

    const nomeLocal = eCristo ? 'Rotatória do Cristo' : 'SESC São Carlos';
    const status = (leitura.status || '').toUpperCase();

    // Disparo da notificação push nativa
    if (status === 'ATENÇÃO' || status === 'CRÍTICO' || status === 'ATENCAO' || status === 'CRITICO') {
        const emoji = status.includes('CRITIC') ? '🚨' : '⚠️';
        const nivelTexto = leitura.nivelAgua !== undefined ? ` (Nível: ${leitura.nivelAgua}m)` : '';

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${emoji} ALERTA EM TEMPO REAL: ${nomeLocal}`, {
                body: `Atenção! O ponto ${nomeLocal} atingiu estado de ${status}${nivelTexto}. Evite a área!`,
                icon: 'logo.png',
                badge: 'logo.png'
            });
        }
    }
}

// Vincula os escutadores de evento quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    sincronizarTelaNotificacoes();
    conectarStreamServidor();

    const chkMain = document.getElementById('chk-ativar-notif');
    const chkCristo = document.getElementById('chk-notif-cristo');
    const chkSesc = document.getElementById('chk-notif-sesc');

    if (chkMain) chkMain.addEventListener('change', salvarPreferenciasNotificacao);
    if (chkCristo) chkCristo.addEventListener('change', salvarPreferenciasNotificacao);
    if (chkSesc) chkSesc.addEventListener('change', salvarPreferenciasNotificacao);
});

// Funções globais
window.salvarPreferenciasNotificacao = salvarPreferenciasNotificacao;
window.sincronizarTelaNotificacoes = sincronizarTelaNotificacoes;
window.processarAlertaTempoReal = processarAlertaTempoReal;