/* ============================================================
   HISTORICO.JS - Registos e Gráfico Comparativo de Leituras
   ============================================================ */
const getApiHistoricoUrl = () => (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : 'http://localhost:8080/api/rios';

let meuGrafico = null;
let dadosHistoricoCompletos = [];
let abaHistoricoAtiva = 'geral';

async function carregarHistorico() {
    try {
        const apiUrl = getApiHistoricoUrl();
        const resposta = await fetch(`${apiUrl}?limite=20`);
        if (!resposta.ok) return;

        const dados = await resposta.json();
        if (!Array.isArray(dados) || dados.length === 0) return;

        dadosHistoricoCompletos = dados;
        atualizarExibicaoHistorico();
    } catch (erro) {
        console.error("Erro ao carregar histórico do banco:", erro);
    }
}

function alternarAbaHistorico(filtro, elementoBotao) {
    abaHistoricoAtiva = filtro;

    const botoes = document.querySelectorAll('.historico-tabs .tab-btn-hist');
    botoes.forEach(btn => {
        btn.style.background = '#e2e8f0';
        btn.style.color = '#475569';
    });

    if (elementoBotao) {
        elementoBotao.style.background = '#3b82f6';
        elementoBotao.style.color = 'white';
    }

    atualizarExibicaoHistorico();
}

function filtrarDadosPorAba(dados) {
    if (abaHistoricoAtiva === 'SENSOR_01') {
        return dados.filter(item => 
            (item.sensorId && item.sensorId.toUpperCase() === 'SENSOR_01') || 
            (item.nome && item.nome.toLowerCase().includes('cristo'))
        );
    } else if (abaHistoricoAtiva === 'SENSOR_02') {
        return dados.filter(item => 
            (item.sensorId && item.sensorId.toUpperCase() === 'SENSOR_02') || 
            (item.nome && item.nome.toLowerCase().includes('sesc'))
        );
    }
    return dados;
}

function atualizarExibicaoHistorico() {
    const dadosFiltrados = filtrarDadosPorAba(dadosHistoricoCompletos);

    const elTitulo = document.getElementById('titulo-historico');
    if (elTitulo) {
        if (abaHistoricoAtiva === 'SENSOR_01') elTitulo.innerText = 'Histórico - Cristo';
        else if (abaHistoricoAtiva === 'SENSOR_02') elTitulo.innerText = 'Histórico - SESC';
        else elTitulo.innerText = 'Comparativo de Leituras (Geral)';
    }

    renderizarTabelaHistorico(dadosFiltrados.slice(0, 10));
    renderizarGraficoHistorico(dadosHistoricoCompletos);
}

function renderizarTabelaHistorico(lista) {
    const tbody = document.getElementById('tabela-historico-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 10px; color: #94a3b8;">Nenhum registo encontrado.</td></tr>';
        return;
    }

    lista.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f1f5f9';

        let nomeSensor = item.sensorId || item.nome || 'Sensor';
        if (nomeSensor === 'SENSOR_01') nomeSensor = 'Cristo';
        if (nomeSensor === 'SENSOR_02') nomeSensor = 'SESC';

        const nivel = item.nivelAgua !== undefined ? `${item.nivelAgua}m` : '--';
        const status = item.status || 'NORMAL';

        let corStatus = '#10b981';
        if (status === 'ATENÇÃO' || status === 'ATENCAO') corStatus = '#f59e0b';
        if (status === 'CRÍTICO' || status === 'CRITICO') corStatus = '#ef4444';

        tr.innerHTML = `
            <td style="padding: 6px 4px; font-weight: 600;">${nomeSensor}</td>
            <td style="padding: 6px 4px;">${nivel}</td>
            <td style="padding: 6px 4px; color: ${corStatus}; font-weight: 700;">${status}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarGraficoHistorico(todosDados) {
    const canvas = document.getElementById('graficoHistorico');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');

    if (meuGrafico) {
        meuGrafico.destroy();
        meuGrafico = null;
    }

    let datasets = [];
    let rotulos = [];

    if (abaHistoricoAtiva === 'geral') {
        const dadosCristo = todosDados
            .filter(item => (item.sensorId && item.sensorId.toUpperCase() === 'SENSOR_01') || (item.nome && item.nome.toLowerCase().includes('cristo')))
            .slice(0, 10)
            .reverse();

        const dadosSesc = todosDados
            .filter(item => (item.sensorId && item.sensorId.toUpperCase() === 'SENSOR_02') || (item.nome && item.nome.toLowerCase().includes('sesc')))
            .slice(0, 10)
            .reverse();

        const maxRegistos = Math.max(dadosCristo.length, dadosSesc.length);
        for (let i = 0; i < maxRegistos; i++) {
            const item = dadosCristo[i] || dadosSesc[i];
            if (item && item.dataHora) {
                rotulos.push(new Date(item.dataHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            } else {
                rotulos.push(`#${i + 1}`);
            }
        }

        datasets = [
            {
                label: 'Cristo (m)',
                data: dadosCristo.map(item => item.nivelAgua || 0),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.3
            },
            {
                label: 'SESC (m)',
                data: dadosSesc.map(item => item.nivelAgua || 0),
                borderColor: '#eab308',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.3
            }
        ];

    } else {
        const dadosFiltrados = filtrarDadosPorAba(todosDados).slice(0, 10).reverse();

        rotulos = dadosFiltrados.map((item, index) => {
            if (item.dataHora) {
                return new Date(item.dataHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return `#${index + 1}`;
        });

        const eCristo = abaHistoricoAtiva === 'SENSOR_01';
        const corLinha = eCristo ? '#2563eb' : '#eab308';

        datasets = [{
            label: eCristo ? 'Nível Cristo (m)' : 'Nível SESC (m)',
            data: dadosFiltrados.map(item => item.nivelAgua || 0),
            borderColor: corLinha,
            backgroundColor: eCristo ? 'rgba(37, 99, 235, 0.1)' : 'rgba(234, 179, 8, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3
        }];
    }

    meuGrafico = new Chart(ctx, {
        type: 'line',
        data: { labels: rotulos, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: abaHistoricoAtiva === 'geral',
                    position: 'top',
                    labels: { boxWidth: 12, font: { size: 10 } }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    carregarHistorico();
    setInterval(carregarHistorico, 5000);
});

window.alternarAbaHistorico = alternarAbaHistorico;