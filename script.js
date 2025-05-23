// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const searchValidationMessageEl = document.getElementById('search-validation-message');
    const searchSuggestionsEl = document.getElementById('search-suggestions');

    // --- Seletores para o <dialog> ---
    const serviceDialog = document.getElementById('service-detail-dialog');
    const dialogCloseButton = document.getElementById('dialog-close-button');
    const dialogServiceTitle = document.getElementById('dialog-service-title');
    const dialogProviderName = document.getElementById('dialog-provider-name');
    const dialogServicePrice = document.getElementById('dialog-service-price');
    const dialogServiceRating = document.getElementById('dialog-service-rating');
    const dialogServiceCity = document.getElementById('dialog-service-city');
    const dialogServiceEmiteNf = document.getElementById('dialog-service-emite-nf');
    const dialogServiceDescription = document.getElementById('dialog-service-description');
    const dialogServiceAddress = document.getElementById('dialog-service-address');
    const dialogServicePhone = document.getElementById('dialog-service-phone');
    const dialogContratarButton = document.getElementById('dialog-contratar-button'); // Bom ter este também

    // Seus seletores existentes
    const searchButton = document.querySelector('.search-button');
    const searchBar = document.querySelector('.search-bar');
    const citySelect = document.querySelector('#cidade-select');
    const servicosSection = document.getElementById('servicos');
    const servicosTitle = document.getElementById('servicos-section-title');
    const servicosGrid = document.getElementById('servicos-grid-content');

    // Variáveis globais ao escopo do DOMContentLoaded
    let servicosCarregados = {}; // Para armazenar os dados dos serviços carregados
    // let htmlDestaquesOriginal = ''; // Você não precisa mais desta se os destaques são 100% dinâmicos

    // Suas URLs e Chave API do Supabase (já devem estar aqui)
    const supabaseRpcUrl = 'https://tptihbousfgodqkvdqki.supabase.co/rest/v1/rpc/buscar_servicos';
    const supabaseCidadesUrl = 'https://tptihbousfgodqkvdqki.supabase.co/rest/v1/cidades_unicas?select=cidade,uf&order=cidade.asc';
    const supabaseApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwdGloYm91c2Znb2Rxa3ZkcWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzQ0NDYsImV4cCI6MjA0NTExMDQ0Nn0.fVvZOnzVrLJxUBEMDIGU-QVpdmDb_6_9NKubKDFa72A';
    const supabaseSuggestUrl = 'https://tptihbousfgodqkvdqki.supabase.co/rest/v1/rpc/sugerir_termos_pesquisa';

    function formatSinglePrice(valueString) {
        if (!valueString || valueString.trim() === "") return null;
        const number = parseFloat(valueString);
        if (isNaN(number)) return null;
        return `R$ ${number.toFixed(2).replace('.', ',')}`;
    }

    function censorPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string' || phone.length < 10) {
            return "Telefone não informado";
        }
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) return "Telefone inválido";

        if (digits.length >= 4) {
            const ddd = digits.substring(0, 2);
            const parteFinal = digits.substring(digits.length - 2);
            const numAsteriscos = Math.max(0, digits.length - 4);
            return `(${ddd}) ${'*'.repeat(numAsteriscos)}${parteFinal}`;
        }
        return "Telefone inválido";
    }

    // Funções para controlar o <dialog>
    function openServiceDialog() { // Renomeei para ser específico do dialog de serviço
        if (serviceDialog) { // serviceDialog é o elemento <dialog>
            console.log("Abrindo dialog de serviço...");
            serviceDialog.showModal(); // Método nativo para abrir
        } else {
            console.error("Elemento dialog 'service-detail-dialog' não encontrado.");
        }
    }

    function closeServiceDialog() { // Renomeei para ser específico
        if (serviceDialog) {
            console.log("Fechando dialog de serviço...");
            serviceDialog.close(); // Método nativo para fechar
        } else {
            console.error("Elemento dialog 'service-detail-dialog' não encontrado ao tentar fechar.");
        }
    }

    function showSearchValidationMessage(message) {
        if (searchValidationMessageEl) {
            searchValidationMessageEl.textContent = message;
            searchValidationMessageEl.style.display = 'block';
        }
    }

    function hideSearchValidationMessage() {
        if (searchValidationMessageEl) {
            searchValidationMessageEl.style.display = 'none';
            searchValidationMessageEl.textContent = '';
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

    function exibirDetalhesServicoDialog(idServico) {
        console.log("Função exibirDetalhesServicoDialog chamada com ID:", idServico);
        const servico = servicosCarregados[idServico];
        
        if (!servico) {
            console.error("Detalhes do serviço não encontrados para o ID:", idServico, "em servicosCarregados:", servicosCarregados);
            return;
        }
        console.log("Serviço encontrado para dialog:", servico);

        // Verifica se todos os elementos do dialog foram encontrados antes de usá-los
        if(!dialogServiceTitle || !dialogProviderName || !dialogServicePrice || !dialogServiceRating || 
           !dialogServiceCity || !dialogServiceEmiteNf || !dialogServiceDescription || 
           !dialogServiceAddress || !dialogServicePhone) {
            console.error("Um ou mais elementos internos do dialog não foram encontrados no DOM! Verifique os IDs.");
            return;
        }

        dialogServiceTitle.textContent = servico.titulo || 'Detalhes do Serviço';
        dialogProviderName.textContent = `Prestado por: ${servico.nome || 'Não informado'}`;
        
        let precoDialog = 'Valor a combinar';
        const valorFixoDialog = formatSinglePrice(servico.valorFixo);
        const valorMinDialog = formatSinglePrice(servico.valorMin);
        const valorMaxDialog = formatSinglePrice(servico.valorMax);
        const tipoDePrecoTextoDialog = servico.precotipo ? servico.precotipo.trim() : "";

        if (valorFixoDialog) { precoDialog = valorFixoDialog; }
        else if (valorMinDialog && valorMaxDialog) { precoDialog = `${valorMinDialog} - ${valorMaxDialog}`; }
        else if (valorMinDialog) { precoDialog = `A partir de ${valorMinDialog}`; }
        else if (valorMaxDialog) { precoDialog = `Até ${valorMaxDialog}`; }
        else if (tipoDePrecoTextoDialog === "Valor variável") { precoDialog = "Valor a combinar"; }
        else if (tipoDePrecoTextoDialog !== "") { precoDialog = tipoDePrecoTextoDialog; }
        dialogServicePrice.textContent = precoDialog;

        let ratingDialog = 'Novo';
        const totalAvaliacoesNumDialog = parseInt(servico.total_avaliacoes, 10);
        const mediaAvaliacaoNumDialog = parseFloat(servico.avaliacao_media);
        if (!isNaN(totalAvaliacoesNumDialog) && totalAvaliacoesNumDialog > 0) {
            if (!isNaN(mediaAvaliacaoNumDialog)) {
                ratingDialog = `${mediaAvaliacaoNumDialog.toFixed(1)} (${totalAvaliacoesNumDialog} ${totalAvaliacoesNumDialog === 1 ? 'aval.' : 'avaliações'})`;
            } else {
                ratingDialog = `(${totalAvaliacoesNumDialog} ${totalAvaliacoesNumDialog === 1 ? 'aval.' : 'avaliações'}) - Média Indisp.`;
            }
        }
        dialogServiceRating.innerHTML = `<span class="star-icon">&#9733;</span> ${ratingDialog}`;
        
        dialogServiceCity.textContent = `${servico.cidade || ''}${servico.uf ? ' - ' + servico.uf : ''}`;
        dialogServiceEmiteNf.textContent = servico.emiteNF ? 'Sim' : 'Não'; // "emiteNF" como está na sua view
        dialogServiceDescription.textContent = servico.descricao || 'Nenhuma descrição adicional fornecida.';
        
        let enderecoCompleto = "Endereço não fornecido";
        if (servico.logradouro) {
            enderecoCompleto = `${servico.logradouro || ''}${servico.numero ? ', ' + servico.numero : ', S/N'}${servico.bairro ? ' - ' + servico.bairro : ''}`;
            // Adicionar cidade e UF apenas se diferente da cidade principal do serviço, ou sempre para clareza
            // enderecoCompleto += `, ${servico.cidade || ''} - ${servico.uf || ''}`;
        }
        dialogServiceAddress.textContent = enderecoCompleto;
        
        dialogServicePhone.textContent = censorPhoneNumber(servico.telefone);

        openServiceDialog(); // Chama a função para ABRIR o dialog
    }

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
    function renderizarServicosBuscados(servicos) {
    console.log("Renderizando serviços, dados recebidos:", servicos); // Novo Log
   
    servicosGrid.innerHTML = ''; 

    if (!servicos || servicos.length === 0) {
        servicosGrid.innerHTML = `<p style="color: var(--cor-texto-principal); text-align:center;">Nenhum serviço encontrado ou disponível no momento.</p>`;
        return;
    }

    servicos.forEach(servico => {
        if (servico.idpessoaservprod) { // Importante para usar como chave e data-attribute
        servicosCarregados[servico.idpessoaservprod] = servico;
    }
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

    // Chamar a função para carregar cidades quando a página carregar
    carregarCidades();
    carregarServicosDestaque();
    
// Listener para o input da barra de pesquisa (você já tem este)
    const debouncedFetchSuggestions = debounce(fetchAndRenderSuggestions, 400); // Certifique-se que está aqui
    if (searchBar) {
        searchBar.addEventListener('input', () => {
            if (searchBar.value.trim().length === 0) { 
                if(searchSuggestionsEl) {
                    searchSuggestionsEl.style.display = 'none';
                    searchSuggestionsEl.innerHTML = '';
                }
            } else {
                debouncedFetchSuggestions();
            }
        });
        searchBar.addEventListener('blur', () => { /* ...sua lógica de blur... */ });
        searchBar.addEventListener('focus', () => { /* ...sua lógica de focus... */ });
        searchBar.addEventListener('keydown', (event) => { /* ...sua lógica do Enter... */ });
    }

    // Listener para o botão de busca principal (você já tem este)
    if (searchButton) {
        searchButton.addEventListener('click', async () => { /* ...sua lógica de busca... */ });
    }

    // Listener DELEGADO para cliques nos cards de serviço (para abrir o dialog)
    document.body.addEventListener('click', function(event) {
        const cardClicado = event.target.closest('.service-card');
        if (cardClicado) {
            const servicoId = cardClicado.dataset.serviceId; 
            if (servicoId) {
                exibirDetalhesServicoDialog(servicoId);
            }
        }
    });

    // Listeners para FECHAR o <dialog>
    if (dialogCloseButton) {
        dialogCloseButton.addEventListener('click', () => {
            closeServiceDialog();
        });
    }

    if (serviceDialog) { // serviceDialog é o próprio elemento <dialog>
        serviceDialog.addEventListener('click', (event) => {
            // Fecha se o clique for no backdrop (o próprio <dialog> fora do .dialog-content)
            // Para isso funcionar bem, o .dialog-content não deve preencher 100% do <dialog>
            // ou precisamos de uma lógica mais precisa para o clique no backdrop.
            // Uma forma simples é verificar as dimensões do clique em relação ao dialog.
            const rect = serviceDialog.getBoundingClientRect();
            const isInDialog = (
                rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX && event.clientX <= rect.left + rect.width
            );
            if (!isInDialog) { // Se o clique foi FORA da área retangular do dialog visível
                 // Esta lógica acima para fechar no backdrop pode ser um pouco complexa.
                 // O <dialog> nativo fecha com ESC.
                 // Se o clique for no próprio serviceDialog (que atua como overlay para seu conteúdo)
                 // E não no seu filho .dialog-content:
                 if (event.target === serviceDialog) {
                    closeServiceDialog();
                 }
            }
        });
    }
    
    // Listener para a tecla Escape (o <dialog> já faz isso, mas podemos adicionar para sugestões também)
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (searchSuggestionsEl && searchSuggestionsEl.style.display === 'block') {
                searchSuggestionsEl.style.display = 'none';
                searchSuggestionsEl.innerHTML = '';
            } else if (serviceDialog && serviceDialog.hasAttribute('open')) { // Verifica se o dialog está aberto
                closeServiceDialog();
            }
        }
    });
});

