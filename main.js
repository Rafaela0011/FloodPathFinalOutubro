/* ============================================================
   MAIN.JS - Gestão de Sensores, Modais e Abas Interativas (FloodPath)
   ============================================================ */
console.log('Sistema de monitorização e rotas inicializado.');

const getApiUrl = () => (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : 'http://localhost:8080/api/rios';

window.statusSensor01 = 'NORMAL';
window.statusSensor02 = 'NORMAL';
window.statusAtualMaquete = 'NORMAL';

let nivelSensor01 = null;
let nivelSensor02 = null;

let nivelSensor01Anterior = null;
let nivelSensor02Anterior = null;

let abaAtivaAtual = 'geral';
let estadoSensor01Anterior = 'NORMAL';
let estadoSensor02Anterior = 'NORMAL';
let falhasSeguidasConexao = 0;

function normalizarStatus(status) {
    if (!status) return 'NORMAL';
    const limpo = String(status).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (limpo.includes('CRITIC')) return 'CRÍTICO';
    if (limpo.includes('ATENC')) return 'ATENÇÃO';
    return 'NORMAL';
}

async function buscarDadosDoRio() {
    const apiUrl = getApiUrl();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // Timeout de 4s para evitar requisições presas

        const req1 = fetch(`${apiUrl}?sensorId=SENSOR_01&limite=1`, { signal: controller.signal })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);

        const req2 = fetch(`${apiUrl}?sensorId=SENSOR_02&limite=1`, { signal: controller.signal })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);

        const [res1, res2] = await Promise.all([req1, req2]);
        clearTimeout(timeoutId);

        // Se ambos falharem por problemas de rede
        if (res1 === null && res2 === null) {
            falhasSeguidasConexao++;
            if (falhasSeguidasConexao >= 2) {
                const elDesc = document.getElementById('status-cidade-descricao');
                if (elDesc) {
                    elDesc.innerText = '⚠️ Sem ligação ao servidor dos sensores. A reconectar...';
                }
            }
            return;
        }

        // Restabelece a ligação com sucesso
        falhasSeguidasConexao = 0;

        let sensor1 = Array.isArray(res1) ? res1[0] : (res1?.content ? res1.content[0] : res1);
        let sensor2 = Array.isArray(res2) ? res2[0] : (res2?.content ? res2.content[0] : res2);

        const novoStatusS1 = normalizarStatus(sensor1?.status);
        const novoStatusS2 = normalizarStatus(sensor2?.status);

        const novoNivelS1 = sensor1?.nivelAgua ?? sensor1?.nivel_agua ?? null;
        const novoNivelS2 = sensor2?.nivelAgua ?? sensor2?.nivel_agua ?? null;

        const statusMudou = (novoStatusS1 !== estadoSensor01Anterior) || (novoStatusS2 !== estadoSensor02Anterior);
        const nivelMudou = (novoNivelS1 !== nivelSensor01Anterior) || (novoNivelS2 !== nivelSensor02Anterior);

        window.statusSensor01 = novoStatusS1;
        window.statusSensor02 = novoStatusS2;
        nivelSensor01 = novoNivelS1;
        nivelSensor02 = novoNivelS2;

        estadoSensor01Anterior = novoStatusS1;
        estadoSensor02Anterior = novoStatusS2;
        nivelSensor01Anterior = novoNivelS1;
        nivelSensor02Anterior = novoNivelS2;

        let statusGeral = 'NORMAL';
        if (window.statusSensor01 === 'CRÍTICO' || window.statusSensor02 === 'CRÍTICO') {
            statusGeral = 'CRÍTICO';
        } else if (window.statusSensor01 === 'ATENÇÃO' || window.statusSensor02 === 'ATENÇÃO') {
            statusGeral = 'ATENÇÃO';
        }
        window.statusAtualMaquete = statusGeral;

        if (statusMudou || nivelMudou) {
            atualizarPainelVisualizacao();

            atualizarMarcadorMapa('overlay-bloqueio', 'label-bloqueio', window.statusSensor01);
            atualizarMarcadorMapa('overlay-subindo', 'label-subindo', window.statusSensor02);

            if (typeof verificarEAtualizarFotosPorStatus === 'function') {
                verificarEAtualizarFotosPorStatus();
            }

            if (statusMudou && window.destinoAtualCoordenadas && typeof window.recalcularRotaAtiva === 'function') {
                window.recalcularRotaAtiva();
            }
        }

    } catch (erro) {
        console.warn("Aviso ao ligar à API dos sensores:", erro);
    }
}

function alternarAbaSensor(aba, elementoBotao) {
    abaAtivaAtual = aba;

    const botoes = document.querySelectorAll('.sensor-tabs .tab-btn');
    botoes.forEach(btn => {
        btn.style.background = '#e2e8f0';
        btn.style.color = '#475569';
    });

    if (elementoBotao) {
        elementoBotao.style.background = '#3b82f6';
        elementoBotao.style.color = 'white';
    }

    atualizarPainelVisualizacao();
}

function atualizarPainelVisualizacao() {
    const elTitulo = document.getElementById('titulo-card-sensor');
    const elIcone = document.getElementById('icone-card-sensor');
    const elTag = document.getElementById('tag-sensor');
    const elStatusTitulo = document.getElementById('status-cidade-titulo');
    const elDesc = document.getElementById('status-cidade-descricao');
    const elVias = document.getElementById('vias-count');
    const elAlagamentos = document.getElementById('alagamentos-count');

    if (!elStatusTitulo) return;

    if (abaAtivaAtual === 'geral') {
        if (elTitulo) elTitulo.innerText = 'Situação da Cidade';
        if (elIcone) elIcone.className = 'fas fa-city';
        if (elTag) elTag.innerText = 'STATUS GERAL';

        elStatusTitulo.innerText = `Estado ${window.statusAtualMaquete.charAt(0) + window.statusAtualMaquete.slice(1).toLowerCase()}`;
        
        let desc = 'Sensores a operar dentro da normalidade.';
        if (window.statusAtualMaquete !== 'NORMAL') {
            desc = `[Cristo]: ${window.statusSensor01} | [SESC]: ${window.statusSensor02}`;
        }
        if (elDesc) elDesc.innerText = desc;

        let vias = 0;
        let alagamentos = 0;
        if (window.statusSensor01 === 'ATENÇÃO') { vias += 1; alagamentos += 1; }
        if (window.statusSensor01 === 'CRÍTICO') { vias += 3; alagamentos += 2; }
        if (window.statusSensor02 === 'ATENÇÃO') { vias += 1; alagamentos += 1; }
        if (window.statusSensor02 === 'CRÍTICO') { vias += 2; alagamentos += 1; }

        if (elVias) elVias.innerText = vias < 10 ? `0${vias}` : `${vias}`;
        if (elAlagamentos) elAlagamentos.innerText = alagamentos < 10 ? `0${alagamentos}` : `${alagamentos}`;

    } else if (abaAtivaAtual === '1') {
        if (elTitulo) elTitulo.innerText = 'Sensor Cristo (Sensor 1)';
        if (elIcone) elIcone.className = 'fas fa-water';
        if (elTag) elTag.innerText = 'STATUS SENSOR 01';

        elStatusTitulo.innerText = `Estado ${window.statusSensor01.charAt(0) + window.statusSensor01.slice(1).toLowerCase()}`;
        if (elDesc) elDesc.innerText = nivelSensor01 !== null ? `Nível: ${nivelSensor01}m` : 'Nível dentro da normalidade';

        if (elVias) elVias.innerText = window.statusSensor01 === 'CRÍTICO' ? '03' : (window.statusSensor01 === 'ATENÇÃO' ? '01' : '00');
        if (elAlagamentos) elAlagamentos.innerText = window.statusSensor01 === 'CRÍTICO' ? '02' : (window.statusSensor01 === 'ATENÇÃO' ? '01' : '00');

    } else if (abaAtivaAtual === '2') {
        if (elTitulo) elTitulo.innerText = 'Sensor SESC (Sensor 2)';
        if (elIcone) elIcone.className = 'fas fa-water';
        if (elTag) elTag.innerText = 'STATUS SENSOR 02';

        elStatusTitulo.innerText = `Estado ${window.statusSensor02.charAt(0) + window.statusSensor02.slice(1).toLowerCase()}`;
        if (elDesc) elDesc.innerText = nivelSensor02 !== null ? `Nível: ${nivelSensor02}m` : 'Nível dentro da normalidade';

        if (elVias) elVias.innerText = window.statusSensor02 === 'CRÍTICO' ? '02' : (window.statusSensor02 === 'ATENÇÃO' ? '01' : '00');
        if (elAlagamentos) elAlagamentos.innerText = window.statusSensor02 === 'CRÍTICO' ? '01' : (window.statusSensor02 === 'ATENÇÃO' ? '01' : '00');
    }
}

function atualizarMarcadorMapa(idOverlay, idLabel, statusSensor) {
    const elOverlay = document.getElementById(idOverlay);
    const labelOverlay = document.getElementById(idLabel);

    if (!elOverlay) return;

    elOverlay.classList.remove('status-critico', 'status-atencao');

    if (statusSensor === 'CRÍTICO') {
        elOverlay.style.display = 'flex';
        elOverlay.classList.add('status-critico');
        if (labelOverlay) labelOverlay.innerText = 'ÁREA INUNDADA';
    } else if (statusSensor === 'ATENÇÃO') {
        elOverlay.style.display = 'flex';
        elOverlay.classList.add('status-atencao');
        if (labelOverlay) labelOverlay.innerText = 'NÍVEL SUBINDO';
    } else {
        elOverlay.style.display = 'none';
        if (labelOverlay) labelOverlay.innerText = '';
    }
}

function exibirAlertaBloqueioDestino(mensagem, tipo = 'critico', tituloCustom = null) {
    const containerAlerta = document.getElementById('mensagem-sistema') || document.body;

    const alertaAntigo = document.querySelector('.toast-alerta-bloqueio');
    if (alertaAntigo) alertaAntigo.remove();

    const isAtencao = (tipo === 'atencao' || tipo === 'ATENÇÃO');
    const classeTipo = isAtencao ? 'atencao' : 'critico';
    const icone = isAtencao ? 'fa-exclamation-triangle' : 'fa-ban';
    const titulo = tituloCustom || (isAtencao ? 'ATENÇÃO! NÍVEL SUBINDO' : 'ROTA BLOQUEADA!');

    const divAlerta = document.createElement('div');
    divAlerta.className = `toast-alerta-bloqueio ${classeTipo}`;
    divAlerta.innerHTML = `
        <div class="toast-content" style="display:flex; align-items:center; gap:12px;">
            <i class="fas ${icone}" style="font-size:1.5rem;"></i>
            <div>
                <strong>${titulo}</strong>
                <p style="margin:2px 0 0 0; font-size:0.85rem;">${mensagem || 'O destino selecionado está em uma zona de risco.'}</p>
            </div>
        </div>
    `;

    containerAlerta.appendChild(divAlerta);

    setTimeout(() => {
        if (divAlerta.parentElement) divAlerta.remove();
    }, 4500);
}

function abrirModalSuporte() {
    const modal = document.getElementById('modal-suporte');
    if (modal) modal.classList.add('ativo');
}

function fecharModalSuporte() {
    const modal = document.getElementById('modal-suporte');
    if (modal) modal.classList.remove('ativo');
}

function fecharModalSuporteFora(event) {
    if (event.target.id === 'modal-suporte') fecharModalSuporte();
}

document.addEventListener('DOMContentLoaded', () => {
    buscarDadosDoRio();
    setInterval(buscarDadosDoRio, 2000);
});

window.alternarAbaSensor = alternarAbaSensor;
window.exibirAlertaBloqueioDestino = exibirAlertaBloqueioDestino;
window.abrirModalSuporte = abrirModalSuporte;
window.fecharModalSuporte = fecharModalSuporte;
window.fecharModalSuporteFora = fecharModalSuporteFora;