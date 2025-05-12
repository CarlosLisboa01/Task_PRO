// KPI Dashboard para TaskPRO
// Este módulo implementa indicadores de performance (KPIs) para o dashboard,
// utilizando dados do Supabase

// Configuração de cores e ícones para KPIs
const KPI_CONFIG = {
    concluidas: {
        icon: 'fas fa-check-circle',
        color: '#22c55e', // Verde
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        title: 'Concluídas'
    },
    andamento: {
        icon: 'fas fa-spinner fa-spin',
        color: '#eab308', // Amarelo
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        title: 'Em Andamento'
    },
    atrasadas: {
        icon: 'fas fa-exclamation-triangle',
        color: '#ef4444', // Vermelho
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        title: 'Atrasadas'
    }
};

// Função para buscar os dados dos KPIs do Supabase
async function fetchKPIData() {
    try {
        console.log('Iniciando busca de dados KPI do Supabase...');
        
        // Verificar se temos a conexão com o Supabase
        if (!supabase) {
            throw new Error('Cliente Supabase não disponível');
        }
        
        // Método 1: Usar o banco como fonte de dados primária
        // Buscar dados diretamente da tabela no Supabase
        const { data, error } = await supabase
            .from('tasks')
            .select('status');
            
        if (error) {
            console.error('Erro ao consultar tarefas no Supabase:', error);
            throw error;
        }
        
        console.log('Dados recebidos do Supabase para KPIs:', data ? data.length : 0, 'registros');
        
        // Inicializar contadores
        const kpiData = {
            concluidas: 0,
            andamento: 0,
            atrasadas: 0,
            total: data ? data.length : 0
        };
        
        // Processar dados
        if (data && data.length > 0) {
            data.forEach(task => {
                // Mapear status do banco para categorias de KPI
                if (task.status === 'completed' || task.status === 'finished') {
                    kpiData.concluidas++;
                } else if (task.status === 'late') {
                    kpiData.atrasadas++;
                } else if (task.status === 'pending') {
                    kpiData.andamento++;
                }
            });
        }
        
        return kpiData;
    } catch (error) {
        console.error('Exceção em fetchKPIData():', error);
        
        // Método 2: Fallback para usar o estado em memória (window.tasks) caso ocorra erro
        console.log('Usando fallback: window.tasks para KPIs');
        
        try {
            // Se Supabase falhar, usar dados em memória
            if (!window.tasks) {
                console.error('window.tasks não disponível para KPIs');
                return { concluidas: 0, andamento: 0, atrasadas: 0, total: 0 };
            }
            
            // Obter todas as tarefas
            const allTasks = [
                ...window.tasks.day,
                ...window.tasks.week,
                ...window.tasks.month,
                ...window.tasks.year
            ];
            
            // Contar tarefas por status
            const kpiData = {
                concluidas: allTasks.filter(task => 
                    task.status === 'completed' || task.status === 'finished'
                ).length,
                andamento: allTasks.filter(task => 
                    task.status === 'pending'
                ).length,
                atrasadas: allTasks.filter(task => 
                    task.status === 'late'
                ).length,
                total: allTasks.length
            };
            
            console.log('KPIs calculados a partir de window.tasks:', kpiData);
            return kpiData;
        } catch (innerError) {
            console.error('Erro também no fallback para KPIs:', innerError);
            // Em último caso, retornar zeros
            return { concluidas: 0, andamento: 0, atrasadas: 0, total: 0 };
        }
    }
}

// Função para criar o HTML dos cards de KPI
function createKPICardsHTML(kpiData) {
    // Container para KPIs
    let html = `
        <div class="kpi-container">
    `;
    
    // Gerar HTML para cada KPI
    Object.keys(KPI_CONFIG).forEach(key => {
        const config = KPI_CONFIG[key];
        const value = kpiData[key] || 0;
        
        html += `
            <div class="kpi-card" data-kpi="${key}">
                <div class="kpi-icon" style="background-color: ${config.backgroundColor}">
                    <i class="${config.icon}" style="color: ${config.color}"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-title">${config.title}</div>
                    <div class="kpi-value" style="color: ${config.color}">${value}</div>
                </div>
            </div>
        `;
    });
    
    // Gráfico de pizza (opcional)
    html += `
        <div class="kpi-chart-card">
            <div class="kpi-chart-header">
                <h4>Distribuição de Tarefas</h4>
            </div>
            <div class="kpi-chart-body">
                <canvas id="kpi-distribution-chart"></canvas>
            </div>
        </div>
    `;
    
    // Fechar container
    html += `
        </div>
    `;
    
    return html;
}

// Função para renderizar o gráfico de distribuição
function renderKPIChart(kpiData) {
    const ctx = document.getElementById('kpi-distribution-chart');
    if (!ctx) return null;
    
    // Destruir gráfico existente se houver
    if (window.kpiDistributionChart) {
        window.kpiDistributionChart.destroy();
    }
    
    // Dados e cores para o gráfico
    const data = [
        kpiData.concluidas,
        kpiData.andamento,
        kpiData.atrasadas
    ];
    
    const backgroundColor = [
        '#22c55e', // Verde
        '#eab308', // Amarelo
        '#ef4444'  // Vermelho
    ];
    
    // Configurar e criar o gráfico
    window.kpiDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Concluídas', 'Em Andamento', 'Atrasadas'],
            datasets: [{
                data: data,
                backgroundColor: backgroundColor,
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = data.reduce((a, b) => a + b, 0) || 1; // Evitar divisão por zero
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    return window.kpiDistributionChart;
}

// Função principal para inicializar e renderizar KPIs
async function initKPIDashboard() {
    try {
        console.log('Inicializando KPI Dashboard...');
        
        // Buscar e validar o container no qual os KPIs serão renderizados
        const dashboardView = document.getElementById('dashboard-view');
        if (!dashboardView) {
            console.error('Container do dashboard não encontrado');
            return false;
        }
        
        // Mostrar mensagem de carregamento durante a busca de dados
        const loadingEl = document.createElement('div');
        loadingEl.className = 'kpi-loading';
        loadingEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando indicadores...';
        
        // Buscar elementos existentes para inserir KPIs após o cabeçalho
        const pageHeader = dashboardView.querySelector('.page-header');
        if (pageHeader) {
            // Inserir após o cabeçalho da página
            pageHeader.insertAdjacentElement('afterend', loadingEl);
        } else {
            // Fallback: inserir no início do dashboard
            dashboardView.prepend(loadingEl);
        }
        
        // Buscar dados dos KPIs
        const kpiData = await fetchKPIData();
        console.log('Dados de KPI obtidos:', kpiData);
        
        // Remover KPIs existentes (para atualizações)
        const existingKPIs = dashboardView.querySelector('.kpi-container');
        if (existingKPIs) {
            existingKPIs.remove();
        }
        
        // Gerar HTML dos KPIs
        const kpiHTML = createKPICardsHTML(kpiData);
        
        // Substituir mensagem de carregamento pelos KPIs
        loadingEl.outerHTML = kpiHTML;
        
        // Renderizar gráfico de distribuição
        renderKPIChart(kpiData);
        
        console.log('KPI Dashboard inicializado com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao inicializar KPI Dashboard:', error);
        
        // Tentar remover mensagem de carregamento em caso de erro
        const loadingEl = document.querySelector('.kpi-loading');
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div class="kpi-error">
                    <i class="fas fa-exclamation-circle"></i>
                    Não foi possível carregar os indicadores
                </div>
            `;
        }
        
        return false;
    }
}

// Função para atualizar os KPIs
async function updateKPIDashboard() {
    try {
        console.log('Atualizando KPI Dashboard...');
        
        // Buscar dados atualizados
        const kpiData = await fetchKPIData();
        
        // Atualizar valores nos cards existentes
        Object.keys(KPI_CONFIG).forEach(key => {
            const card = document.querySelector(`.kpi-card[data-kpi="${key}"] .kpi-value`);
            if (card) {
                card.textContent = kpiData[key] || 0;
            }
        });
        
        // Atualizar gráfico de distribuição
        renderKPIChart(kpiData);
        
        console.log('KPI Dashboard atualizado com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao atualizar KPI Dashboard:', error);
        return false;
    }
}

// Inicializar KPIs quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar KPIs apenas na página dashboard
    if (window.location.hash === '' || window.location.hash === '#dashboard') {
        // Dar um pequeno delay para garantir que o restante da página seja carregado primeiro
        setTimeout(initKPIDashboard, 500);
    }
    
    // Adicionar listener para mudanças de hash (navegação)
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '' || window.location.hash === '#dashboard') {
            // Inicializar ou atualizar KPIs ao navegar para o dashboard
            const kpiContainer = document.querySelector('.kpi-container');
            if (kpiContainer) {
                updateKPIDashboard();
            } else {
                initKPIDashboard();
            }
        }
    });
});

// Exportar funções para uso global
window.initKPIDashboard = initKPIDashboard;
window.updateKPIDashboard = updateKPIDashboard; 