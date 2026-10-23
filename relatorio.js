/* ============================================================
   RELATORIO.JS - Gerador do Relatório Histórico de Alagamentos
   ============================================================ */

async function abrirRelatorioPronto() {
    const modal = document.getElementById('modal-relatorio');
    const containerConteudo = document.getElementById('conteudo-relatorio-modal');

    if (modal) modal.style.display = 'flex';
    if (!containerConteudo) return;

    containerConteudo.innerHTML = `
        <div style="text-align:center; padding: 25px; color: #64748b;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 10px; font-weight: 600;">A carregar histórico consolidado...</p>
        </div>
    `;

    try {
        const urlAPI = (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : 'http://localhost:8080/api/rios';
        
        let dadosHistorico = [];
        try {
            const resp = await fetch(`${urlAPI}?limite=1000`);
            if (resp.ok) {
                dadosHistorico = await resp.json();
            }
        } catch (e) {
            console.warn("Não foi possível carregar dados remotos da API:", e);
        }

        const dataEmissao = new Date().toLocaleDateString('pt-BR');
        const horaEmissao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (!Array.isArray(dadosHistorico) || dadosHistorico.length === 0) {
            containerConteudo.innerHTML = `
                <div style="text-align:center; padding: 30px; color: #64748b;">
                    <i class="fas fa-database fa-2x" style="margin-bottom: 10px; color: #cbd5e1;"></i>
                    <p style="font-weight: 700;">Nenhum registo encontrado na base de dados.</p>
                    <small>Certifique-se de que o backend está a guardar os dados no banco de dados.</small>
                </div>
            `;
            return;
        }

        const relatorioAgrupado = {};
        let totalAlertas = 0;

        dadosHistorico.forEach(item => {
            let sId = item.sensorId || item.sensor_id || item.nome || 'SENSOR_01';
            
            let nomeLocal = 'Sensor Desconhecido';
            if (sId.toUpperCase().includes('CRISTO') || sId.toUpperCase() === 'SENSOR_01') {
                sId = 'SENSOR_01';
                nomeLocal = 'Rotatória do Cristo';
            } else if (sId.toUpperCase().includes('SESC') || sId.toUpperCase() === 'SENSOR_02') {
                sId = 'SENSOR_02';
                nomeLocal = 'SESC São Carlos';
            }

            let dataItem = dataEmissao;
            let horaItem = '--:--';

            if (item.dataHora) {
                const d = new Date(item.dataHora);
                dataItem = d.toLocaleDateString('pt-BR');
                horaItem = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            } else if (item.data) {
                dataItem = item.data;
                horaItem = item.hora || '--:--';
            }

            const chaveGrupo = `${dataItem}_${sId}`;

            if (!relatorioAgrupado[chaveGrupo]) {
                relatorioAgrupado[chaveGrupo] = {
                    data: dataItem,
                    sensorId: sId,
                    nome: nomeLocal,
                    qtdAlertas: 0,
                    totalLeituras: 0,
                    horariosAlertas: []
                };
            }

            relatorioAgrupado[chaveGrupo].totalLeituras += 1;

            const status = (item.status || '').toUpperCase();
            if (status === 'ATENÇÃO' || status === 'CRÍTICO' || status === 'ATENCAO' || status === 'CRITICO') {
                relatorioAgrupado[chaveGrupo].qtdAlertas += 1;
                totalAlertas += 1;
                if (!relatorioAgrupado[chaveGrupo].horariosAlertas.includes(horaItem)) {
                    relatorioAgrupado[chaveGrupo].horariosAlertas.push(horaItem);
                }
            }
        });

        const chavesOrdenadas = Object.keys(relatorioAgrupado).sort((a, b) => {
            const dataA = relatorioAgrupado[a].data.split('/').reverse().join('-');
            const dataB = relatorioAgrupado[b].data.split('/').reverse().join('-');
            return dataB.localeCompare(dataA);
        });

        let linhasTabelaHTML = '';

        chavesOrdenadas.forEach(chave => {
            const grupo = relatorioAgrupado[chave];
            const temAlertas = grupo.qtdAlertas > 0;
            const horariosTexto = temAlertas 
                ? grupo.horariosAlertas.join(', ') 
                : 'Apenas estado NORMAL registado neste dia.';
            
            const qtdEstilo = temAlertas ? 'color: #ef4444; font-weight: bold;' : 'color: #10b981; font-weight: bold;';

            linhasTabelaHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 8px; vertical-align: top;">
                        <strong>${grupo.nome}</strong>
                    </td>
                    <td style="padding: 10px 8px; vertical-align: top; text-align: center; font-weight: 600;">
                        ${grupo.data}
                    </td>
                    <td style="padding: 10px 8px; vertical-align: top; text-align: center; ${qtdEstilo}">
                        ${grupo.qtdAlertas} alerta(s) <br>
                        <small style="color: #64748b; font-weight: normal;">(${grupo.totalLeituras} leituras)</small>
                    </td>
                    <td style="padding: 10px 8px; vertical-align: top; font-size: 0.82rem; color: ${temAlertas ? '#475569' : '#059669'}; max-width: 260px; word-wrap: break-word;">
                        ${horariosTexto}
                    </td>
                </tr>
            `;
        });

        containerConteudo.innerHTML = `
            <div class="relatorio-cabecalho" style="margin-bottom: 18px;">
                <h4 style="margin: 0 0 4px 0; font-size: 1.1rem; font-weight: 800; color: #0f172a;">
                    FLOODPATH - Relatório Histórico de Alagamentos
                </h4>
                <p style="margin: 0; font-size: 0.8rem; color: #64748b;">
                    Emissão do Relatório: ${dataEmissao} às ${horaEmissao}
                </p>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #334155; font-size: 0.85rem; font-weight: 700;">
                    Total de Alertas Registados no Histórico:
                </span>
                <span style="color: #dc2626; font-size: 1rem; font-weight: 800;">
                    ${totalAlertas} ocorrência(s)
                </span>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid #e2e8f0; color: #334155; font-size: 0.8rem; text-transform: uppercase;">
                        <th style="padding: 8px;">Ponto / Sensor</th>
                        <th style="padding: 8px; text-align: center;">Data</th>
                        <th style="padding: 8px; text-align: center;">Alertas / Registos</th>
                        <th style="padding: 8px;">Horários dos Alertas</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTabelaHTML}
                </tbody>
            </table>
        `;

    } catch (erro) {
        console.error("Erro ao gerar relatório:", erro);
        containerConteudo.innerHTML = `
            <div style="text-align:center; padding: 20px; color: #ef4444;">
                <i class="fas fa-exclamation-circle fa-2x"></i>
                <p style="margin-top: 10px;">Erro ao carregar o relatório de alagamentos.</p>
            </div>
        `;
    }
}

function fecharModalRelatorio() {
    const modal = document.getElementById('modal-relatorio');
    if (modal) modal.style.display = 'none';
}

function fecharModalRelatorioFora(event) {
    if (event.target.id === 'modal-relatorio') {
        fecharModalRelatorio();
    }
}

window.abrirRelatorioPronto = abrirRelatorioPronto;
window.fecharModalRelatorio = fecharModalRelatorio;
window.fecharModalRelatorioFora = fecharModalRelatorioFora;