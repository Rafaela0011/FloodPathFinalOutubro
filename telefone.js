/* ============================================================
   TELEFONE.JS - Menu e Simulação de Chamada de Emergência com Voz
   ============================================================ */

let sosInterval;
let sosTimerInterval;

// Função auxiliar para sintetizar voz no navegador
function falarSintetizador(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Limpa falas anteriores
        const mensagem = new SpeechSynthesisUtterance(texto);
        mensagem.lang = 'pt-BR';
        mensagem.rate = 0.95; // Velocidade natural
        mensagem.pitch = 1.0;
        window.speechSynthesis.speak(mensagem);
    }
}

// Para a voz imediatamente ao desligar
function pararVoz() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

function toggleMenuSOS(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('menu-sos');
    if (!menu) return;

    const estaVisivel = menu.style.display === 'flex';
    menu.style.display = estaVisivel ? 'none' : 'flex';
}

function iniciarChamadaSOS(servico, numero) {
    const menu = document.getElementById('menu-sos');
    if (menu) menu.style.display = 'none';

    const modalSos = document.getElementById('sos-modal');
    const callerNameEl = document.getElementById('sos-caller-name');
    const statusEl = document.getElementById('sos-status');
    const timerEl = document.getElementById('sos-timer');

    if (!modalSos) return;

    if (callerNameEl) {
        callerNameEl.innerText = `${servico} (${numero})`;
    }

    modalSos.classList.add('active');
    statusEl.style.display = 'block';
    statusEl.innerText = "ligando...";
    timerEl.style.display = 'none';
    timerEl.innerText = "00:00";

    let seconds = 0;

    clearTimeout(sosInterval);
    clearInterval(sosTimerInterval);
    pararVoz();

    // Aguarda 2.5s simulando a chamada ser completada
    sosInterval = setTimeout(() => {
        statusEl.style.display = 'none';
        timerEl.style.display = 'block';

        // Fala de atendimento assim que a chamada é atendida
        const mensagemAtendimento = servico.toLowerCase().includes('bombeiros')
            ? "Central do Corpo de Bombeiros. Esta é uma simulação do sistema FloodPath. Permaneça em local seguro."
            : "Central da Defesa Civil de São Carlos. Esta é uma simulação preventiva do FloodPath. Permaneça em local seguro.";

        falarSintetizador(mensagemAtendimento);

        sosTimerInterval = setInterval(() => {
            seconds++;
            let mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            let secs = (seconds % 60).toString().padStart(2, '0');
            timerEl.innerText = `${mins}:${secs}`;
        }, 1000);

    }, 2500);
}

document.addEventListener('DOMContentLoaded', function () {
    const btnCancel = document.getElementById('btn-cancel-sos');

    if (btnCancel) {
        btnCancel.addEventListener('click', function () {
            const modalSos = document.getElementById('sos-modal');
            if (modalSos) modalSos.classList.remove('active');

            clearTimeout(sosInterval);
            clearInterval(sosTimerInterval);
            pararVoz(); // Interrompe o áudio no instante do clique
        });
    }

    document.addEventListener('click', function (e) {
        const menu = document.getElementById('menu-sos');
        const btnSos = document.querySelector('.btn-sos');
        if (menu && !menu.contains(e.target) && btnSos && !btnSos.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
});

window.toggleMenuSOS = toggleMenuSOS;
window.iniciarChamadaSOS = iniciarChamadaSOS;