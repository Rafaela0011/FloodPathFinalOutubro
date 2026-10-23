/* ============================================================
   VOZ.JS - Navegação Guiada por Voz em Tempo Real
   ============================================================ */

const VozNavegacao = {
    passosRota: [],
    passoAtualIndex: 0,
    watchId: null,
    audioAtivo: false,
    ultimoTextoFalado: '',

    desbloquearAudio: function () {
        if ('speechSynthesis' in window && !this.audioAtivo) {
            const ut = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(ut);
            this.audioAtivo = true;
        }
    },

    falar: function (texto) {
        if (!('speechSynthesis' in window) || !texto) return;

        // Evita reproduzir a mesma mensagem consecutivamente num curto espaço de tempo
        if (this.ultimoTextoFalado === texto && window.speechSynthesis.speaking) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        this.ultimoTextoFalado = texto;
        window.speechSynthesis.speak(utterance);
    },

    parar: function () {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.passosRota = [];
        this.passoAtualIndex = 0;
        this.ultimoTextoFalado = '';
    },

    iniciarRota: function (segmentoOSRM) {
        this.parar();

        const distanciaKm = (segmentoOSRM.distance / 1000).toFixed(1);
        const tempoMin = Math.round(segmentoOSRM.duration / 60);

        this.falar(`Rota iniciada. Distância de ${distanciaKm} quilômetros. Tempo estimado: ${tempoMin} minutos.`);

        if (segmentoOSRM.steps && segmentoOSRM.steps.length > 0) {
            this.passosRota = segmentoOSRM.steps;
            this.passoAtualIndex = 0;

            setTimeout(() => {
                const primeiroPasso = this.passosRota[0];
                if (primeiroPasso && primeiroPasso.instruction) {
                    this.falar(`Em ${Math.round(primeiroPasso.distance)} metros, ${primeiroPasso.instruction}`);
                }
            }, 3000);

            if ('geolocation' in navigator) {
                this.watchId = navigator.geolocation.watchPosition(
                    (pos) => this.verificarProximaInstrucao(pos.coords),
                    (err) => console.warn('Erro ao obter localização por GPS:', err),
                    { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
                );
            }
        }
    },

    verificarProximaInstrucao: function (coordsUser) {
        if (this.passoAtualIndex >= this.passosRota.length) return;

        const passoAtual = this.passosRota[this.passoAtualIndex];
        if (!passoAtual || !passoAtual.location) return;

        const dist = window.calcularDistanciaMetros
            ? window.calcularDistanciaMetros([coordsUser.longitude, coordsUser.latitude], passoAtual.location)
            : 100;

        if (dist <= 30) {
            this.falar(passoAtual.instruction);
            this.passoAtualIndex++;
        }
    }
};

document.addEventListener('click', () => VozNavegacao.desbloquearAudio(), { once: true });
window.VozNavegacao = VozNavegacao;