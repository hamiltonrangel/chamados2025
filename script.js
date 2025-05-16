// Configuração da API do Google Sheets
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0dKoFGDkavegizgfwmBrQN9GDYhGJu6zOvGZlPSmt_DXPmP7guRV70xt_74FNDw0/exec';

// Elementos DOM
const formSection = document.getElementById('form-section');
const dashboardSection = document.getElementById('dashboard-section');
const navForm = document.getElementById('nav-form');
const navDashboard = document.getElementById('nav-dashboard');
const chamadoForm = document.getElementById('chamado-form');
const feedbackMessage = document.getElementById('feedback-message');
const feedbackText = document.getElementById('feedback-text');
const modal = document.getElementById('chamado-modal');
const closeModal = document.querySelector('.close');
const closeModalBtn = document.getElementById('close-modal');

// Variáveis globais
let chamadosData = [];
let secretarias = [];
let equipamentos = [];

// Navegação entre seções
navForm.addEventListener('click', (e) => {
    e.preventDefault();
    formSection.classList.add('section-visible');
    formSection.classList.remove('section-hidden');
    dashboardSection.classList.add('section-hidden');
    dashboardSection.classList.remove('section-visible');
    navForm.classList.add('active');
    navDashboard.classList.remove('active');
});

navDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    formSection.classList.add('section-hidden');
    formSection.classList.remove('section-visible');
    dashboardSection.classList.add('section-visible');
    dashboardSection.classList.remove('section-hidden');
    navForm.classList.remove('active');
    navDashboard.classList.add('active');
    loadDashboardData();
});

// Envio do formulário
chamadoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obter dados do formulário
    const formData = new FormData(chamadoForm);
    const chamadoData = {
        Data_Abertura: new Date().toISOString(),
        Secretaria: formData.get('secretaria'),
        Departamento: formData.get('departamento'),
        Usuario: formData.get('usuario'),
        Equipamento: formData.get('equipamento'),
        Patrimonio: formData.get('patrimonio'),
        Problema: formData.get('problema'),
        Telefone: formData.get('telefone'),
        Status: 'Aberto',
        Tecnico: '',
        Data_Resolucao: '',
        Tempo_Resolucao: '',
        Observacoes: ''
    };
    
    try {
        await submitChamado(chamadoData);
        showFeedback('Chamado aberto com sucesso!', 'success');
        chamadoForm.reset();
    } catch (error) {
        showFeedback('Erro ao abrir chamado. Tente novamente.', 'error');
        console.error('Erro ao enviar chamado:', error);
    }
});

// Função para enviar chamado para a planilha
async function submitChamado(chamadoData) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'addChamado',
                data: chamadoData
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Erro ao enviar chamado:', error);
        throw error;
    }
}

// Carregar dados para o dashboard
async function loadDashboardData() {
    try {
        showLoading(true);
        
        const response = await fetch(SCRIPT_URL + '?action=getChamados');
        if (!response.ok) {
            throw new Error('Erro ao carregar dados');
        }
        
        const data = await response.json();
        chamadosData = data.chamados || [];
        
        // Extrair listas únicas de secretarias e equipamentos
        secretarias = [...new Set(chamadosData.map(item => item.Secretaria))];
        equipamentos = [...new Set(chamadosData.map(item => item.Equipamento))];
        
        // Preencher filtros
        populateFilterOptions();
        
        // Atualizar dashboard
        updateDashboardStats();
        updateDashboardCharts();
        updateChamadosTable();
        
        showLoading(false);
    } catch (error) {
        showFeedback('Erro ao carregar dados do dashboard', 'error');
        console.error('Erro ao carregar dashboard:', error);
        showLoading(false);
    }
}

// Preencher opções de filtro
function populateFilterOptions() {
    const secretariaFilter = document.getElementById('filter-secretaria');
    
    // Limpar opções existentes, mantendo a primeira
    while (secretariaFilter.options.length > 1) {
        secretariaFilter.remove(1);
    }
    
    // Adicionar opções de secretarias
    secretarias.forEach(secretaria => {
        const option = document.createElement('option');
        option.value = secretaria;
        option.textContent = secretaria;
        secretariaFilter.appendChild(option);
    });
}

// Atualizar estatísticas do dashboard
function updateDashboardStats() {
    const filteredData = getFilteredData();
    
    // Contar chamados por status
    const totalChamados = filteredData.length;
    const abertosChamados = filteredData.filter(item => item.Status === 'Aberto').length;
    const andamentoChamados = filteredData.filter(item => item.Status === 'Em Andamento').length;
    const resolvidosChamados = filteredData.filter(item => item.Status === 'Resolvido').length;
    
    // Atualizar contadores
    document.getElementById('total-chamados').textContent = totalChamados;
    document.getElementById('abertos-chamados').textContent = abertosChamados;
    document.getElementById('andamento-chamados').textContent = andamentoChamados;
    document.getElementById('resolvidos-chamados').textContent = resolvidosChamados;
}

// Obter dados filtrados com base nas seleções do usuário
function getFilteredData() {
    const statusFilter = document.getElementById('filter-status').value;
    const secretariaFilter = document.getElementById('filter-secretaria').value;
    const periodoFilter = document.getElementById('filter-periodo').value;
    
    return chamadosData.filter(item => {
        // Filtro de status
        if (statusFilter !== 'todos' && item.Status.toLowerCase() !== statusFilter) {
            return false;
        }
        
        // Filtro de secretaria
        if (secretariaFilter !== 'todas' && item.Secretaria !== secretariaFilter) {
            return false;
        }
        
        // Filtro de período
        if (periodoFilter !== 'todos') {
            const dataAbertura = new Date(item.Data_Abertura);
            const hoje = new Date();
            const diffDias = Math.floor((hoje - dataAbertura) / (1000 * 60 * 60 * 24));
            
            if (periodoFilter === '7dias' && diffDias > 7) {
                return false;
            }
            
            if (periodoFilter === '30dias' && diffDias > 30) {
                return false;
            }
        }
        
        return true;
    });
}

// Atualizar gráficos do dashboard
function updateDashboardCharts() {
    const filteredData = getFilteredData();
    
    // Gráfico de status
    updateStatusChart(filteredData);
    
    // Gráfico de secretarias
    updateSecretariaChart(filteredData);
    
    // Gráfico de equipamentos
    updateEquipamentoChart(filteredData);
    
    // Gráfico de tempo médio
    updateTempoChart(filteredData);
}

// Gráfico de chamados por status
function updateStatusChart(data) {
    const ctx = document.getElementById('status-chart').getContext('2d');
    
    // Contar chamados por status
    const abertos = data.filter(item => item.Status === 'Aberto').length;
    const emAndamento = data.filter(item => item.Status === 'Em Andamento').length;
    const resolvidos = data.filter(item => item.Status === 'Resolvido').length;
    
    // Destruir gráfico existente se houver
    if (window.statusChart) {
        window.statusChart.destroy();
    }
    
    // Criar novo gráfico
    window.statusChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Aberto', 'Em Andamento', 'Resolvido'],
            datasets: [{
                data: [abertos, emAndamento, resolvidos],
                backgroundColor: ['#ea4335', '#fbbc05', '#34a853'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Gráfico de chamados por secretaria
function updateSecretariaChart(data) {
    const ctx = document.getElementById('secretaria-chart').getContext('2d');
    
    // Contar chamados por secretaria
    const secretariaCounts = {};
    data.forEach(item => {
        if (!secretariaCounts[item.Secretaria]) {
            secretariaCounts[item.Secretaria] = 0;
        }
        secretariaCounts[item.Secretaria]++;
    });
    
    const labels = Object.keys(secretariaCounts);
    const values = Object.values(secretariaCounts);
    
    // Destruir gráfico existente se houver
    if (window.secretariaChart) {
        window.secretariaChart.destroy();
    }
    
    // Criar novo gráfico
    window.secretariaChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Chamados',
                data: values,
                backgroundColor: '#4285f4',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Gráfico de chamados por equipamento
function updateEquipamentoChart(data) {
    const ctx = document.getElementById('equipamento-chart').getContext('2d');
    
    // Contar chamados por equipamento
    const equipamentoCounts = {};
    data.forEach(item => {
        if (!equipamentoCounts[item.Equipamento]) {
            equipamentoCounts[item.Equipamento] = 0;
        }
        equipamentoCounts[item.Equipamento]++;
    });
    
    const labels = Object.keys(equipamentoCounts);
    const values = Object.values(equipamentoCounts);
    
    // Destruir gráfico existente se houver
    if (window.equipamentoChart) {
        window.equipamentoChart.destroy();
    }
    
    // Criar novo gráfico
    window.equipamentoChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#4285f4', '#ea4335', '#fbbc05', '#34a853', 
                    '#46bdc6', '#7baaf7', '#f07b72', '#fcd04f'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Gráfico de tempo médio de resolução
function updateTempoChart(data) {
    const ctx = document.getElementById('tempo-chart').getContext('2d');
    
    // Calcular tempo médio por secretaria
    const secretariaTempos = {};
    const secretariaContagem = {};
    
    data.forEach(item => {
        if (item.Status === 'Resolvido' && item.Tempo_Resolucao) {
            if (!secretariaTempos[item.Secretaria]) {
                secretariaTempos[item.Secretaria] = 0;
                secretariaContagem[item.Secretaria] = 0;
            }
            secretariaTempos[item.Secretaria] += parseFloat(item.Tempo_Resolucao);
            secretariaContagem[item.Secretaria]++;
        }
    });
    
    const labels = Object.keys(secretariaTempos);
    const values = labels.map(secretaria => 
        secretariaTempos[secretaria] / secretariaContagem[secretaria]
    );
    
    // Destruir gráfico existente se houver
    if (window.tempoChart) {
        window.tempoChart.destroy();
    }
    
    // Criar novo gráfico
    window.tempoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tempo Médio (dias)',
                data: values,
                backgroundColor: '#0d47a1',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Atualizar tabela de chamados
function updateChamadosTable() {
    const filteredData = getFilteredData();
    const tableBody = document.querySelector('#chamados-table tbody');
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    // Adicionar linhas
    filteredData.forEach(chamado => {
        const row = document.createElement('tr');
        
        // Formatar data
        const dataAbertura = new Date(chamado.Data_Abertura);
        const dataFormatada = `${dataAbertura.getDate()}/${dataAbertura.getMonth() + 1}/${dataAbertura.getFullYear()}`;
        
        // Criar células
        row.innerHTML = `
            <td>${chamado.ID || '-'}</td>
            <td>${dataFormatada}</td>
            <td>${chamado.Secretaria}</td>
            <td>${chamado.Usuario}</td>
            <td>${chamado.Equipamento}</td>
            <td>${chamado.Problema.substring(0, 30)}${chamado.Problema.length > 30 ? '...' : ''}</td>
            <td>
                <span class="status-badge status-${chamado.Status.toLowerCase().replace(' ', '-')}">${chamado.Status}</span>
            </td>
            <td>
                <button class="btn-view" data-id="${chamado.ID || ''}">Ver</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Adicionar eventos aos botões de visualização
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const chamadoId = btn.getAttribute('data-id');
            showChamadoDetails(chamadoId);
        });
    });
}

// Exibir detalhes do chamado
function showChamadoDetails(chamadoId) {
    const chamado = chamadosData.find(item => item.ID == chamadoId);
    
    if (!chamado) {
        showFeedback('Chamado não encontrado', 'error');
        return;
    }
    
    const detailsContainer = document.getElementById('chamado-details');
    
    // Formatar datas
    const dataAbertura = new Date(chamado.Data_Abertura);
    const dataAberturaFormatada = `${dataAbertura.getDate()}/${dataAbertura.getMonth() + 1}/${dataAbertura.getFullYear()} ${dataAbertura.getHours()}:${String(dataAbertura.getMinutes()).padStart(2, '0')}`;
    
    let dataResolucaoFormatada = '-';
    if (chamado.Data_Resolucao) {
        const dataResolucao = new Date(chamado.Data_Resolucao);
        dataResolucaoFormatada = `${dataResolucao.getDate()}/${dataResolucao.getMonth() + 1}/${dataResolucao.getFullYear()} ${dataResolucao.getHours()}:${String(dataResolucao.getMinutes()).padStart(2, '0')}`;
    }
    
    // Preencher detalhes
    detailsContainer.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">ID:</div>
            <div class="detail-value">${chamado.ID || '-'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Data de Abertura:</div>
            <div class="detail-value">${dataAberturaFormatada}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Secretaria:</div>
            <div class="detail-value">${chamado.Secretaria}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Departamento:</div>
            <div class="detail-value">${chamado.Departamento}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Usuário:</div>
            <div class="detail-value">${chamado.Usuario}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Telefone:</div>
            <div class="detail-value">${chamado.Telefone}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Equipamento:</div>
            <div class="detail-value">${chamado.Equipamento}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Patrimônio:</div>
            <div class="detail-value">${chamado.Patrimonio || '-'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Problema:</div>
            <div class="detail-value">${chamado.Problema}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Status:</div>
            <div class="detail-value">
                <select id="status-select">
                    <option value="Aberto" ${chamado.Status === 'Aberto' ? 'selected' : ''}>Aberto</option>
                    <option value="Em Andamento" ${chamado.Status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
                    <option value="Resolvido" ${chamado.Status === 'Resolvido' ? 'selected' : ''}>Resolvido</option>
                </select>
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Técnico:</div>
            <div class="detail-value">
                <input type="text" id="tecnico-input" value="${chamado.Tecnico || ''}">
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Data de Resolução:</div>
            <div class="detail-value">${dataResolucaoFormatada}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Tempo de Resolução:</div>
            <div class="detail-value">${chamado.Tempo_Resolucao ? chamado.Tempo_Resolucao + ' dias' : '-'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Observações:</div>
            <div class="detail-value">
                <textarea id="observacoes-input">${chamado.Observacoes || ''}</textarea>
            </div>
        </div>
    `;
    
    // Configurar botão de atualização
    const updateBtn = document.getElementById('update-status');
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('status-select').value;
        const newTecnico = document.getElementById('tecnico-input').value;
        const newObservacoes = document.getElementById('observacoes-input').value;
        
        try {
            await updateChamadoStatus(chamadoId, newStatus, newTecnico, newObservacoes);
            showFeedback('Chamado atualizado com sucesso!', 'success');
            closeModalFunction();
            loadDashboardData();
        } catch (error) {
            showFeedback('Erro ao atualizar chamado', 'error');
            console.error('Erro ao atualizar chamado:', error);
        }
    };
    
    // Exibir modal
    modal.style.display = 'block';
}

// Atualizar status do chamado
async function updateChamadoStatus(chamadoId, newStatus, newTecnico, newObservacoes) {
    try {
        const chamado = chamadosData.find(item => item.ID == chamadoId);
        
        // Calcular tempo de resolução se o status mudou para Resolvido
        let dataResolucao = chamado.Data_Resolucao || '';
        let tempoResolucao = chamado.Tempo_Resolucao || '';
        
        if (newStatus === 'Resolvido' && chamado.Status !== 'Resolvido') {
            dataResolucao = new Date().toISOString();
            const dataAbertura = new Date(chamado.Data_Abertura);
            tempoResolucao = ((new Date() - dataAbertura) / (1000 * 60 * 60 * 24)).toFixed(1);
        }
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateChamado',
                id: chamadoId,
                data: {
                    Status: newStatus,
                    Tecnico: newTecnico,
                    Data_Resolucao: dataResolucao,
                    Tempo_Resolucao: tempoResolucao,
                    Observacoes: newObservacoes
                }
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Erro ao atualizar chamado:', error);
        throw error;
    }
}

// Funções para o modal
function closeModalFunction() {
    modal.style.display = 'none';
}

closeModal.addEventListener('click', closeModalFunction);
closeModalBtn.addEventListener('click', closeModalFunction);

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModalFunction();
    }
});

// Funções para filtros
document.getElementById('filter-status').addEventListener('change', () => {
    updateDashboardStats();
    updateDashboardCharts();
    updateChamadosTable();
});

document.getElementById('filter-secretaria').addEventListener('change', () => {
    updateDashboardStats();
    updateDashboardCharts();
    updateChamadosTable();
});

document.getElementById('filter-periodo').addEventListener('change', () => {
    updateDashboardStats();
    updateDashboardCharts();
    updateChamadosTable();
});

// Função para exibir feedback
function showFeedback(message, type) {
    feedbackText.textContent = message;
    feedbackMessage.className = type === 'error' ? 'feedback-message feedback-visible error' : 'feedback-message feedback-visible success';
    
    // Exibir mensagem
    feedbackMessage.classList.add('feedback-visible');
    feedbackMessage.classList.remove('feedback-hidden');
    
    // Ocultar após 3 segundos
    setTimeout(() => {
        feedbackMessage.classList.add('feedback-hidden');
        feedbackMessage.classList.remove('feedback-visible');
    }, 3000);
}

// Função para exibir/ocultar indicador de carregamento
function showLoading(show) {
    // Implementar indicador de carregamento se necessário
}

// Inicializar a página no formulário
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar estilos CSS para badges de status
    const style = document.createElement('style');
    style.textContent = `
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
            color: white;
        }
        .status-aberto {
            background-color: #ea4335;
        }
        .status-em-andamento {
            background-color: #fbbc05;
        }
        .status-resolvido {
            background-color: #34a853;
        }
        .detail-row {
            display: flex;
            margin-bottom: 10px;
        }
        .detail-label {
            font-weight: 500;
            width: 150px;
            color: var(--text-secondary);
        }
        .detail-value {
            flex: 1;
        }
        .detail-value input, .detail-value select, .detail-value textarea {
            width: 100%;
            padding: 5px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
        }
        .detail-value textarea {
            height: 80px;
        }
        .btn-view {
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
        }
        .btn-view:hover {
            background-color: var(--primary-dark);
        }
    `;
    document.head.appendChild(style);
});
