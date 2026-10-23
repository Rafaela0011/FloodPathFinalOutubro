/* ============================================================
   FOTOS.JS - Gestão, Persistência e Validação de Fotos no Mapa
   ============================================================ */

// Array global para manter o registo de todas as fotos ativas no mapa
window.listaFotosReportadas = window.listaFotosReportadas || [];

function exibirAlertaNotificacao(titulo, mensagem, tipo = 'erro') {
    const containerAlerta = document.getElementById('mensagem-sistema') || document.body;

    const alertaAntigo = document.querySelector('.toast-alerta-custom');
    if (alertaAntigo) alertaAntigo.remove();

    const divAlerta = document.createElement('div');
    divAlerta.className = `toast-alerta-bloqueio toast-alerta-custom ${tipo}`;
    divAlerta.innerHTML = `
        <div class="toast-content" style="display:flex; align-items:center; gap:12px;">
            <i class="fas ${tipo === 'erro' ? 'fa-ban' : 'fa-check-circle'}" style="font-size:1.5rem;"></i>
            <div>
                <strong>${titulo}</strong>
                <p style="margin:2px 0 0 0; font-size:0.85rem; opacity:0.95;">${mensagem}</p>
            </div>
        </div>
    `;

    containerAlerta.appendChild(divAlerta);

    setTimeout(() => {
        if (divAlerta) divAlerta.remove();
    }, 4500);
}

function abrirModalReportarFoto() {
    const statusS1 = window.statusSensor01 || 'NORMAL';
    const statusS2 = window.statusSensor02 || 'NORMAL';

    const s1Alagado = (statusS1 === 'ATENÇÃO' || statusS1 === 'CRÍTICO');
    const s2Alagado = (statusS2 === 'ATENÇÃO' || statusS2 === 'CRÍTICO');

    if (!s1Alagado && !s2Alagado) {
        exibirAlertaNotificacao(
            "AÇÃO BLOQUEADA!",
            "Todos os pontos monitorizados estão em estado NORMAL. Só é possível publicar fotos para locais em ATENÇÃO ou CRÍTICO."
        );
        return;
    }

    const selectLocal = document.getElementById('select-local');
    if (selectLocal) {
        selectLocal.innerHTML = '<option value="" disabled selected>Escolha o ponto de alagamento...</option>';

        if (s1Alagado) {
            selectLocal.innerHTML += '<option value="CRISTO">Rotatória do Cristo</option>';
        }
        if (s2Alagado) {
            selectLocal.innerHTML += '<option value="SESC">SESC São Carlos</option>';
        }
    }

    const modal = document.getElementById('modal-reportar-foto');
    if (modal) modal.style.display = 'flex';
}

function fecharModalReportarFoto() {
    const modal = document.getElementById('modal-reportar-foto');
    const form = document.getElementById('form-reportar-foto');
    const previewBox = document.getElementById('box-preview-foto');

    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    if (previewBox) previewBox.style.display = 'none';
}

function previewFoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgPreview = document.getElementById('img-preview');
            const previewBox = document.getElementById('box-preview-foto');
            if (imgPreview) imgPreview.src = e.target.result;
            if (previewBox) previewBox.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function enviarRelatorioFoto(event) {
    event.preventDefault();

    const selectLocal = document.getElementById('select-local');
    const localSelecionado = selectLocal ? selectLocal.value : '';
    const fileInput = document.getElementById('input-foto');
    const descricaoInput = document.getElementById('input-descricao');
    const descricao = descricaoInput ? descricaoInput.value : '';

    if (!localSelecionado) {
        exibirAlertaNotificacao("CAMPO OBRIGÁRIO!", "Por favor, selecione um ponto afetado na lista.");
        return;
    }

    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        exibirAlertaNotificacao("FOTO NECESSÁRIA!", "Por favor, selecione ou tire uma foto antes de enviar.");
        return;
    }

    let coordsPonto = null;
    let nomeLocalFormatado = '';

    if (localSelecionado === 'CRISTO') {
        coordsPonto = typeof COORDS_CRISTO !== 'undefined' ? COORDS_CRISTO : [-47.9095, -22.0180];
        nomeLocalFormatado = 'Rotatória do Cristo';
    } else if (localSelecionado === 'SESC') {
        coordsPonto = typeof COORDS_SESC !== 'undefined' ? COORDS_SESC : [-47.9058, -22.0167];
        nomeLocalFormatado = 'SESC São Carlos';
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imagemBase64 = e.target.result;
        const horaAtual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Cria o objeto da foto para guardar em memória
        const novaFoto = {
            id: Date.now(),
            local: localSelecionado, // 'CRISTO' ou 'SESC'
            coords: coordsPonto,
            descricao: `[${nomeLocalFormatado}] ${descricao}`,
            imagemBase64: imagemBase64,
            hora: horaAtual,
            overlay: null
        };

        window.listaFotosReportadas.push(novaFoto);
        renderizarFotoNoMapa(novaFoto);

        fecharModalReportarFoto();
        exibirAlertaNotificacao("SUCESSO!", `Foto publicada no mapa para a área do ${nomeLocalFormatado}.`, "sucesso");
    };

    reader.readAsDataURL(fileInput.files[0]);
}

// Renderiza a foto no OpenLayers mantendo a referência do overlay
function renderizarFotoNoMapa(foto) {
    if (typeof map === 'undefined' || !map) return;
    if (foto.overlay) return; // Se já estiver desenhada, ignora

    const coordsProj = ol.proj.fromLonLat(foto.coords);

    const divElem = document.createElement('div');
    divElem.className = 'pin-foto-marker';
    divElem.style.cssText = `
        width: 38px !important;
        height: 38px !important;
        background-color: #8b5cf6 !important;
        color: #ffffff !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 1rem !important;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45) !important;
        border: 2px solid #ffffff !important;
        cursor: pointer !important;
    `;
    divElem.innerHTML = `<i class="fas fa-camera"></i>`;

    divElem.onclick = function(e) {
        e.stopPropagation();
        abrirModalVisualizarFoto(foto.imagemBase64, foto.descricao, foto.hora);
    };

    const overlay = new ol.Overlay({
        element: divElem,
        position: coordsProj,
        positioning: 'left-center',
        offset: [75, 0],
        stopEvent: true
    });

    foto.overlay = overlay;
    map.addOverlay(overlay);

    setTimeout(() => {
        if (divElem.parentElement) {
            divElem.parentElement.style.zIndex = '999999';
        }
    }, 50);

    map.getView().animate({ center: coordsProj, zoom: 17, duration: 800 });
}

// Verifica o estado atual dos sensores e remove automaticamente fotos de locais que voltaram a NORMAL
function verificarEAtualizarFotosPorStatus() {
    const statusS1 = window.statusSensor01 || 'NORMAL';
    const statusS2 = window.statusSensor02 || 'NORMAL';

    const s1Alagado = (statusS1 === 'ATENÇÃO' || statusS1 === 'CRÍTICO');
    const s2Alagado = (statusS2 === 'ATENÇÃO' || statusS2 === 'CRÍTICO');

    window.listaFotosReportadas = window.listaFotosReportadas.filter(foto => {
        const pontoAindaAlagado = (foto.local === 'CRISTO' && s1Alagado) || (foto.local === 'SESC' && s2Alagado);

        if (!pontoAindaAlagado) {
            // Se o local voltou a NORMAL, remove o marcador do mapa
            if (foto.overlay && typeof map !== 'undefined') {
                map.removeOverlay(foto.overlay);
            }
            return false; // Remove da lista de fotos ativas
        }
        return true; // Mantém a foto no mapa
    });
}

// Modais de Visualização
function abrirModalVisualizarFoto(imagemBase64, descricao, hora) {
    const modal = document.getElementById('modal-visualizar-foto');
    const img = document.getElementById('img-modal-view');
    const desc = document.getElementById('desc-modal-view');
    const horaEl = document.getElementById('hora-modal-view');

    if (img) img.src = imagemBase64;
    if (desc) desc.textContent = descricao;
    if (horaEl) horaEl.textContent = `Registado às ${hora}`;
    if (modal) modal.classList.add('ativo');
}

function fecharModalVisualizarFoto() {
    const modal = document.getElementById('modal-visualizar-foto');
    if (modal) modal.classList.remove('ativo');
}

function fecharModalVisualizarFotoFora(event) {
    if (event.target.id === 'modal-visualizar-foto') {
        fecharModalVisualizarFoto();
    }
}

// Exportações Globais
window.abrirModalReportarFoto = abrirModalReportarFoto;
window.fecharModalReportarFoto = fecharModalReportarFoto;
window.previewFoto = previewFoto;
window.enviarRelatorioFoto = enviarRelatorioFoto;
window.exibirAlertaNotificacao = exibirAlertaNotificacao;
window.abrirModalVisualizarFoto = abrirModalVisualizarFoto;
window.fecharModalVisualizarFoto = fecharModalVisualizarFoto;
window.fecharModalVisualizarFotoFora = fecharModalVisualizarFotoFora;
window.verificarEAtualizarFotosPorStatus = verificarEAtualizarFotosPorStatus;