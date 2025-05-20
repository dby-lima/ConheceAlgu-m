// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    const searchValidationMessageEl = document.getElementById('search-validation-message');
    let htmlDestaquesOriginal = ''; // Variável para guardar o HTML dos destaques
    const searchButton = document.querySelector('.search-button');
    const searchBar = document.querySelector('.search-bar');
    const citySelect = document.querySelector('#cidade-select');

    // IDs para a seção de serviços que será atualizada
    const servicosSection = document.getElementById('servicos'); // A seção inteira
    const servicosTitle = document.getElementById('servicos-section-title'); // O H2 dentro da seção
    const servicosGrid = document.getElementById('servicos-grid-content'); // O div que contém os cards

    // Captura o HTML original dos serviços em destaque ASSIM que o DOM carregar
    if (servicosGrid) {
        htmlDestaquesOriginal = servicosGrid.innerHTML;
    }

    // URL e Chave API para a função buscar_servicos (POST)
    const supabaseRpcUrl = 'https://tptihbousfgodqkvdqki.supabase.co/rest/v1/rpc/buscar_servicos';
    // URL e Chave API para a view cidades_unicas (GET)
    const supabaseCidadesUrl = 'https://tptihbousfgodqkvdqki.supabase.co/rest/v1/cidades_unicas?select=cidade,uf&order=cidade.asc'; // Adicionamos uf e ordenamos
    
    const supabaseApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwdGloYm91c2Znb2Rxa3ZkcWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzQ0NDYsImV4cCI6MjA0NTExMDQ0Nn0.fVvZOnzVrLJxUBEMDIGU-QVpdmDb_6_9NKubKDFa72A';

    // --- Função para carregar cidades no dropdown ---
    async function carregarCidades() {
        if (!citySelect) return;

        try {
            const response = await fetch(supabaseCidadesUrl, {
                method: 'GET',
                headers: {
                    'apikey': supabaseApiKey,
                    'Authorization': `Bearer ${supabaseApiKey}`
                }
            });

            if (!response.ok) {
                console.error('Erro ao buscar cidades:', response.statusText);
                // Adicionar uma opção de erro ou manter as opções estáticas do HTML
                const optionError = document.createElement('option');
                optionError.value = "";
                optionError.textContent = "Erro ao carregar cidades";
                citySelect.appendChild(optionError);
                return;
            }

            const cidades = await response.json();

            if (cidades && cidades.length > 0) {
                // Limpa opções existentes (exceto a primeira "Escolha a cidade")
                // Para fazer isso de forma segura, podemos remover todas a partir da segunda
                while (citySelect.options.length > 1) {
                    citySelect.remove(1);
                }
                
                cidades.forEach(item => {
                    const option = document.createElement('option');
                    // A view retorna objetos {cidade: "Nome Cidade", uf: "UF"}
                    // Vamos usar "Nome Cidade - UF" como texto e "Nome Cidade" como valor, 
                    // pois sua função buscar_servicos espera 'cidade_usuario text'
                    option.value = item.cidade; 
                    option.textContent = `${item.cidade} - ${item.uf}`;
                    citySelect.appendChild(option);
                });
            } else {
                // Caso não retorne cidades, pode adicionar uma mensagem
                const optionNoCity = document.createElement('option');
                optionNoCity.value = "";
                optionNoCity.textContent = "Nenhuma cidade disponível";
                citySelect.appendChild(optionNoCity);
            }

        } catch (error) {
            console.error('Erro na requisição para buscar cidades:', error);
            const optionError = document.createElement('option');
            optionError.value = "";
            optionError.textContent = "Falha ao carregar cidades";
            citySelect.appendChild(optionError);
        }
    }

    // Chamar a função para carregar cidades quando a página carregar
    carregarCidades();

    // --- Lógica da Busca de Serviços (modificada) ---
    if (searchButton) {
        searchButton.addEventListener('click', async () => {
            hideSearchValidationMessage(); // Função para esconder a mensagem (vamos criá-la abaixo)

            const filtro = searchBar.value.trim();
            const cidadeSelecionada = citySelect.value;
            const nomeCidadeDisplay = citySelect.options[citySelect.selectedIndex].text;

            // 1. VERIFICAR SE AMBOS OS CAMPOS ESTÃO VAZIOS PARA RESTAURAR DESTAQUES
            if (!filtro && !cidadeSelecionada) { // Se filtro de texto está vazio E nenhuma cidade selecionada
                if (servicosTitle) {
                    servicosTitle.textContent = "Serviços em Destaque";
                }
                if (servicosGrid && htmlDestaquesOriginal) {
                    servicosGrid.innerHTML = htmlDestaquesOriginal;
                }
                if (servicosSection) {
                    servicosSection.scrollIntoView({ behavior: 'smooth' });
                }
                return; // Interrompe a execução aqui, não faz busca nem validação de cidade
            }

            // 2. VALIDAR SE A CIDADE FOI SELECIONADA (se não estivermos restaurando destaques)
            if (!cidadeSelecionada) {
                showSearchValidationMessage('Por favor, selecione uma cidade para continuar a busca.'); // Nova função
                return;
            }

            // 3. PREPARAR UI E FAZER A BUSCA (como antes)
            servicosGrid.innerHTML = '<p style="color: var(--cor-texto-principal); text-align:center;">Buscando serviços...</p>';
            
            let tituloBusca = '';
            if (filtro && cidadeSelecionada) {
                tituloBusca = `Resultados para "${filtro}" em ${nomeCidadeDisplay.split(' - ')[0]}`;
            } else if (cidadeSelecionada) { // Filtro de texto pode estar vazio, mas cidade selecionada
                tituloBusca = `Serviços em ${nomeCidadeDisplay.split(' - ')[0]}`;
            }
            servicosTitle.textContent = tituloBusca;

            try {
                const response = await fetch(supabaseRpcUrl, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseApiKey,
                        'Authorization': `Bearer ${supabaseApiKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        filtro: filtro || "", 
                        cidade_usuario: cidadeSelecionada
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Erro da API Supabase (buscar_servicos):', errorData);
                    throw new Error(`Erro na busca: ${response.statusText} (Status: ${response.status})`);
                }

                const servicosEncontrados = await response.json();
                renderizarServicosBuscados(servicosEncontrados);
                
function showSearchValidationMessage(message) {
    if (searchValidationMessageEl) {
        searchValidationMessageEl.textContent = message;
        searchValidationMessageEl.style.display = 'block';
        // Para animação (se adicionou as classes .visible no CSS):
        // setTimeout(() => searchValidationMessageEl.classList.add('visible'), 10); 
    }
}

function hideSearchValidationMessage() {
    if (searchValidationMessageEl) {
        searchValidationMessageEl.style.display = 'none';
        searchValidationMessageEl.textContent = '';
        // Para animação:
        // searchValidationMessageEl.classList.remove('visible');
    }
}
            } catch (error) {
                console.error('Erro ao buscar serviços:', error);
                servicosGrid.innerHTML = `<p style="color: red; text-align:center;">Ocorreu um erro ao buscar os serviços. Tente novamente.</p>`;
            } finally {
                // Rolar para a seção de serviços após a tentativa de busca
                if (servicosSection) {
                    servicosSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }

    function renderizarServicosBuscados(servicos) {
        servicosGrid.innerHTML = ''; // Limpa mensagem de "buscando" ou resultados antigos

        if (!servicos || servicos.length === 0) {
            servicosGrid.innerHTML = `<p style="color: var(--cor-texto-principal); text-align:center;">Nenhum serviço encontrado para os critérios informados.</p>`;
            return;
        }

        servicos.forEach(servico => {
            let precoFormatado = 'N/D';
            if (servico.valorFixo) { // "valorFixo" com F maiúsculo conforme sua view no Supabase
                precoFormatado = `R$ ${parseFloat(servico.valorFixo).toFixed(2).replace('.', ',')}`;
            } else if (servico.valorMin && servico.valorMax) { // Idem para valorMin e valorMax
                precoFormatado = `R$ ${parseFloat(servico.valorMin).toFixed(2).replace('.', ',')} - R$ ${parseFloat(servico.valorMax).toFixed(2).replace('.', ',')}`;
            } else if (servico.precotipo) {
                precoFormatado = servico.precotipo;
            }

            const cardHTML = `
                <div class="service-card">
                    <div class="card-header-title">
                        <h3 class="service-title">${servico.titulo || 'Título indisponível'}</h3>
                    </div>
                    <div class="card-body">
                        <div class="provider-info">
                            <div class="provider-initial">${(servico.nome || 'N')[0].toUpperCase()}</div>
                            <span class="service-provider">${servico.nome || 'Prestador não informado'}</span>
                        </div>
                        <div class="service-details">
                            <p>Valor:</p>
                            <p class="service-price">${precoFormatado}</p>
                            <p>Cidade:</p>
                            <p class="service-city">${servico.cidade || 'Cidade não informada'}</p>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="service-rating">
                            <span class="star-icon">&#9733;</span>
                            <span>--</span> 
                        </div>
                        <span class="status-badge ${servico.servicoAtivo ? 'disponivel' : 'indisponivel'}">
                            ${servico.servicoAtivo ? 'Disponível' : 'Indisponível'}
                        </span>
                    </div>
                </div>
            `;
            servicosGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    }
});