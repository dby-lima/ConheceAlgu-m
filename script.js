// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const searchValidationMessageEl = document.getElementById('search-validation-message');
    const searchSuggestionsEl = document.getElementById('search-suggestions'); // Novo seletor
    let htmlDestaquesOriginal = ''; // Variável para guardar o HTML dos destaques
    
    const searchButton = document.querySelector('.search-button');
    const searchBar = document.querySelector('.search-bar');
    const citySelect = document.querySelector('#cidade-select');
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
     function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    async function fetchAndRenderSuggestions() {
        const filtroParcial = searchBar.value.trim();
        const cidadeAtual = citySelect.value;

        // Se não há cidade selecionada, mas o usuário começou a digitar:
        if (filtroParcial.length >= 3 && !cidadeAtual) {
            searchSuggestionsEl.innerHTML = '<div class="suggestion-item" style="color: #777; cursor: default;">Selecione uma cidade para ver sugestões.</div>';
            searchSuggestionsEl.style.display = 'block';
            return;
        }

        // Se o filtro for muito curto OU a cidade ainda não estiver selecionada (após a mensagem acima), limpa e esconde
        if (filtroParcial.length < 3 || !cidadeAtual) {
            searchSuggestionsEl.innerHTML = '';
            searchSuggestionsEl.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(supabaseSuggestUrl, {
                method: 'POST',
                headers: {
                    'apikey': supabaseApiKey,
                    'Authorization': `Bearer ${supabaseApiKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    filtro_parcial: filtroParcial,
                    cidade_usuario_atual: cidadeAtual
                })
            });

            if (!response.ok) {
                console.error('Erro ao buscar sugestões:', response.statusText);
                searchSuggestionsEl.style.display = 'none';
                return;
            }

            const sugestoes = await response.json(); // Retorna [{sugestao: "texto", prioridade: 1}, ...]

            searchSuggestionsEl.innerHTML = ''; // Limpa sugestões anteriores
            if (sugestoes && sugestoes.length > 0) {
                sugestoes.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('suggestion-item');
                    
                    // Para destacar o termo buscado na sugestão (opcional, mas melhora UX)
                    const regex = new RegExp(`(${filtroParcial})`, 'gi');
                    const highlightedText = item.sugestao.replace(regex, '<strong>$1</strong>');
                    div.innerHTML = highlightedText;

                    div.addEventListener('click', () => {
                        searchBar.value = item.sugestao; // Preenche a barra de busca
                        searchSuggestionsEl.style.display = 'none'; // Esconde sugestões
                        searchSuggestionsEl.innerHTML = '';
                        // Opcional: disparar a busca principal automaticamente
                        if (searchButton) {
                           // searchButton.click(); // Descomente se quiser buscar automaticamente
                        }
                    });
                    searchSuggestionsEl.appendChild(div);
                });
                searchSuggestionsEl.style.display = 'block';
            } else {
                searchSuggestionsEl.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro na requisição de sugestões:', error);
            searchSuggestionsEl.style.display = 'none';
        }
    }

    if (searchBar) {
    searchBar.addEventListener('input', () => {
        if (searchBar.value.trim().length === 0) { // Se esvaziar o campo, esconde sugestões
            searchSuggestionsEl.style.display = 'none';
            searchSuggestionsEl.innerHTML = '';
        } else {
            debouncedFetchSuggestions();
        }
    });

    // Esconder sugestões se o usuário clicar fora (blur)
    searchBar.addEventListener('blur', () => {
        // Pequeno delay para permitir o clique na sugestão antes de esconder
        setTimeout(() => {
            if (!searchSuggestionsEl.matches(':hover')) { // Não esconde se o mouse estiver sobre as sugestões
                searchSuggestionsEl.style.display = 'none';
            }
        }, 150);
    });
    
    // Garantir que as sugestões apareçam ao focar, se houver texto e condições atendidas
    searchBar.addEventListener('focus', () => {
        if (searchBar.value.trim().length >= 3 && citySelect.value) {
            debouncedFetchSuggestions(); // Ou fetchAndRenderSuggestions() se não quiser debounce no focus
        }
    });

    // NOVA LÓGICA PARA O "ENTER" KEY
        searchBar.addEventListener('keydown', (event) => {
            // Verifica se a tecla pressionada foi "Enter"
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault(); // Previne qualquer comportamento padrão do Enter (ex: submeter formulário, se houvesse um)
                if (searchSuggestionsEl) { // Verifica se o elemento existe
                    searchSuggestionsEl.style.display = 'none';
                    searchSuggestionsEl.innerHTML = ''; // Limpa o conteúdo das sugestões
                    }
                // Simula um clique no botão "Buscar"
                // Isso garantirá que toda a lógica de validação (cidade selecionada) e
                // a lógica de busca (ou restauração dos destaques) sejam executadas.
                if (searchButton) {
                    searchButton.click();
                }
            }
        });
        // FIM DA NOVA LÓGICA PARA O "ENTER" KEY
    }

        // Opcional: Esconder sugestões ao pressionar a tecla 'Escape'
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (searchSuggestionsEl) {
                    searchSuggestionsEl.style.display = 'none';
                }
            }
        });
    

    const debouncedFetchSuggestions = debounce(fetchAndRenderSuggestions, 400);
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
    const supabaseCidadesUrl = 'https://tptihbousfgodqkvdqki.supabase.co/rest/v1/cidades_unicas?select=cidade,uf&order=cidade.asc';
    const supabaseApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwdGloYm91c2Znb2Rxa3ZkcWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzQ0NDYsImV4cCI6MjA0NTExMDQ0Nn0.fVvZOnzVrLJxUBEMDIGU-QVpdmDb_6_9NKubKDFa72A';
    const supabaseSuggestUrl = 'https://tptihbousfgodqkvdqki.supabase.co/rest/v1/rpc/sugerir_termos_pesquisa';
    
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
    async function carregarServicosDestaque() {
        console.log("1. Iniciando carregarServicosDestaque..."); // Novo Log

        if (!servicosGrid || !servicosTitle) {
            console.error("ERRO: servicosGrid ou servicosTitle não encontrado no DOM."); // Novo Log
            return;
        }

        servicosTitle.textContent = "Serviços em Destaque";
        servicosGrid.innerHTML = '<p style="color: var(--cor-texto-principal); text-align:center;">Carregando destaques...</p>';
        console.log("2. Mensagem 'Carregando destaques...' exibida."); // Novo Log

        const limiteInicialBusca = 15;
        const limiteFinalExibicao = 6;

        // Confirme que supabaseCidadesUrl e supabaseApiKey estão definidas e corretas no escopo.
        // console.log("Supabase API Key:", supabaseApiKey); // Descomente para verificar a chave se suspeitar dela
        const urlDestaques = `${supabaseCidadesUrl.split('/cidades_unicas')[0]}/view_servicos_completa?select=*,idpessoaservprod,avaliacao_media,total_avaliacoes&order=avaliacao_media.desc,total_avaliacoes.desc&limit=${limiteInicialBusca}`;
        console.log("3. URL para buscar destaques:", urlDestaques); // Novo Log

        try {
            const responseDestaques = await fetch(urlDestaques, {
                method: 'GET',
                headers: { 'apikey': supabaseApiKey, 'Authorization': `Bearer ${supabaseApiKey}` }
            });
            console.log("4. Resposta da API recebida, status:", responseDestaques.status); // Novo Log

            if (!responseDestaques.ok) {
                console.error('Erro ao buscar serviços em destaque:', responseDestaques.status, responseDestaques.statusText);
                const errorBody = await responseDestaques.text(); // Tenta ler o corpo do erro
                console.error("Corpo do erro da API:", errorBody);
                servicosGrid.innerHTML = '<p style="color: red; text-align:center;">Não foi possível carregar os destaques. Verifique o console.</p>';
                return;
            }
            
            let destaquesCompletos = await responseDestaques.json();
            console.log("5. Destaques recebidos da API:", destaquesCompletos); // Novo Log

            if (!destaquesCompletos || destaquesCompletos.length === 0) {
                console.log("Nenhum destaque completo retornado pela API."); // Novo Log
                servicosGrid.innerHTML = `<p style="color: var(--cor-texto-principal); text-align:center;">Nenhum serviço em destaque no momento.</p>`;
                return; // IMPORTANTE: Adicionar este return para sair se não houver dados.
            }

            const servicosUnicosDestaque = [];
            const titulosAdicionados = new Set();

            for (const servico of destaquesCompletos) {
                if (servicosUnicosDestaque.length >= limiteFinalExibicao) {
                    break; 
                }
                const tituloNormalizado = servico.titulo ? servico.titulo.trim().toLowerCase() : ''; 
                if (servico.titulo && !titulosAdicionados.has(tituloNormalizado)) { // Adicionado check se servico.titulo existe
                    servicosUnicosDestaque.push(servico);
                    titulosAdicionados.add(tituloNormalizado);
                }
            }
            console.log("6. Serviços únicos filtrados:", servicosUnicosDestaque); // Novo Log
            
            if (servicosUnicosDestaque.length === 0 && destaquesCompletos.length > 0) {
                console.log("Nenhum serviço com título único encontrado, usando fallback."); // Novo Log
                renderizarServicosBuscados(destaquesCompletos.slice(0, limiteFinalExibicao));
            } else if (servicosUnicosDestaque.length > 0) { // Modificado para else if
                renderizarServicosBuscados(servicosUnicosDestaque);
            } else { // Se ambos são vazios (já tratado pelo return anterior, mas como segurança)
                console.log("Nenhum serviço para renderizar após filtros."); // Novo Log
                servicosGrid.innerHTML = `<p style="color: var(--cor-texto-principal); text-align:center;">Nenhum serviço em destaque no momento.</p>`;
            }

        } catch (error) {
            console.error('Erro CRÍTICO na requisição ou processamento de serviços em destaque:', error);
            servicosGrid.innerHTML = '<p style="color: red; text-align:center;">Falha crítica ao carregar destaques. Verifique o console.</p>';
        }
    }

    // Chamar a função para carregar cidades quando a página carregar
    carregarCidades();
    carregarServicosDestaque();

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
                tituloBusca = `Encontre ${filtro} em ${nomeCidadeDisplay.split(' - ')[0]}`;
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

    function formatSinglePrice(valueString) {
    if (!valueString || valueString.trim() === "") return null; // Retorna null se vazio
    const number = parseFloat(valueString);
    if (isNaN(number)) return null; // Retorna null se não for um número válido
    return `R$ ${number.toFixed(2).replace('.', ',')}`;
    }

    function renderizarServicosBuscados(servicos) {
    console.log("Renderizando serviços, dados recebidos:", servicos); // Novo Log
   
    servicosGrid.innerHTML = ''; 

    if (!servicos || servicos.length === 0) {
        servicosGrid.innerHTML = `<p style="color: var(--cor-texto-principal); text-align:center;">Nenhum serviço encontrado ou disponível no momento.</p>`;
        return;
    }

    servicos.forEach(servico => {
        console.log('Dados do serviço para avaliação:', 
        { 
            titulo: servico.titulo, 
            idpessoaservprod: servico.idpessoaservprod, // Para identificar o serviço
            avaliacao_media_recebida: servico.avaliacao_media, 
            tipo_avaliacao_media: typeof servico.avaliacao_media,
            total_avaliacoes_recebido: servico.total_avaliacoes,
            tipo_total_avaliacoes: typeof servico.total_avaliacoes
            }
        );

        let precoFormatado = 'Valor a combinar'; // Define um valor padrão inicial

            // Usamos a função auxiliar para tentar formatar cada tipo de valor numérico
            const valorFixoFormatado = formatSinglePrice(servico.valorFixo);
            const valorMinFormatado = formatSinglePrice(servico.valorMin);
            const valorMaxFormatado = formatSinglePrice(servico.valorMax);

            // Variável para o texto do precotipo, tratando se for null ou só espaços
            const tipoDePrecoTexto = servico.precotipo ? servico.precotipo.trim() : "";

            if (valorFixoFormatado) {
                // 1. Se existe um valor fixo formatado
                precoFormatado = valorFixoFormatado;
            } else if (valorMinFormatado && valorMaxFormatado) {
                // 2. Se existem valor mínimo E máximo formatados
                precoFormatado = `${valorMinFormatado} - ${valorMaxFormatado}`;
            } else if (valorMinFormatado) {
                // 3. Se existe APENAS o valor mínimo formatado
                precoFormatado = `A partir de ${valorMinFormatado}`;
            } else if (valorMaxFormatado) {
                // 4. Se existe APENAS o valor máximo formatado
                precoFormatado = `Até ${valorMaxFormatado}`;
            } else if (tipoDePrecoTexto === "Valor variável") {
                // 5. Se NENHUM valor numérico foi encontrado (fixo, min, max são null/inválidos)
                // E o precotipo é exatamente "Valor variável"
                precoFormatado = "Valor a combinar"; // Sobrescreve "Valor variável"
            } else if (tipoDePrecoTexto !== "") {
                // 6. Se NENHUM valor numérico, mas existe outro texto no precotipo (ex: "Sob consulta")
                precoFormatado = tipoDePrecoTexto;
            }

        // Lógica ATUALIZADA para exibir a avaliação
       let ratingDisplay = 'Novo'; // Default se não houver avaliações

            // Os nomes dos campos vindos da sua view são "avaliacao_media" e "total_avaliacoes"
            const totalAvaliacoesNum = parseInt(servico.total_avaliacoes, 10);
            const mediaAvaliacaoNum = parseFloat(servico.avaliacao_media);

            if (!isNaN(totalAvaliacoesNum) && totalAvaliacoesNum > 0) {
                if (!isNaN(mediaAvaliacaoNum)) {
                    ratingDisplay = `${mediaAvaliacaoNum.toFixed(1)} (${totalAvaliacoesNum} ${totalAvaliacoesNum === 1 ? 'aval.' : 'avaliações'})`;
                } else {
                    // Se tem contagem mas a média não é um número (improvável com a view atualizada)
                    ratingDisplay = `(${totalAvaliacoesNum} ${totalAvaliacoesNum === 1 ? 'aval.' : 'avaliações'}) - Média Indisp.`;
                }
            }
            // Se totalAvaliacoesNum for 0 ou NaN, ratingDisplay permanecerá 'Novo'

            // A montagem do cardHTML continua a mesma, usando ${ratingDisplay}
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
                            <span>${ratingDisplay}</span> </div>
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