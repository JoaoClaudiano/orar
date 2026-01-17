// 🕸️ REDE DE INTENÇÕES - Conexões visuais entre velas
class RedeDeIntencoes {
    constructor() {
        // Configuração do canvas PixiJS
        this.app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            transparent: true,
            antialias: true,
            resolution: window.devicePixelRatio || 1
        });
        
        // Adiciona canvas sobre o mapa
        this.app.view.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 500;
            pointer-events: none;
        `;
        
        // Adiciona o canvas dentro do container do mapa
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.appendChild(this.app.view);
        } else {
            console.error('Container do mapa não encontrado');
            document.body.appendChild(this.app.view);
        }
        
        // Contêiner para os fios
        this.fiosContainer = new PIXI.Container();
        this.app.stage.addChild(this.fiosContainer);
        
        // Mapa para armazenar fios por categoria
        this.fiosPorCategoria = new Map(); // Chave: categoria, valor: { velas: [], fios: [] }
        
        // Configurações visuais
        this.config = {
            opacidadeNormal: 0.15,    // Muito esmaecido
            opacidadeAtiva: 1.0,      // Totalmente visível
            corFio: 0xF5E6A2,         // Dourado claro
            espessura: 1.5,
            duracaoAtivacao: 5000,    // 5 segundos
            pulsacao: {
                amplitude: 0.05,      // Intensidade da pulsação
                velocidade: 0.02      // Velocidade da animação
            }
        };
        
        // Estado atual
        this.categoriaAtiva = null;
        this.timeoutAtivacao = null;
        
        // Inicia a animação
        this.app.ticker.add((delta) => this.animarFios(delta));
        
        // Redimensionamento
        window.addEventListener('resize', () => this.redimensionar());
        
        console.log("🕸️ Rede de intenções criada");
    }
    
    // Adiciona uma vela à rede
    adicionarVela(velaInfo) {
        const categoria = velaInfo.categoria || 'Geral';
        
        // Inicializa a estrutura da categoria se não existir
        if (!this.fiosPorCategoria.has(categoria)) {
            this.fiosPorCategoria.set(categoria, { velas: [], fios: [] });
        }
        
        const categoriaData = this.fiosPorCategoria.get(categoria);
        
        // Conecta com todas as velas da mesma categoria
        categoriaData.velas.forEach(vExistente => {
            this.criarFio(vExistente, velaInfo, categoria);
        });
        
        // Adiciona esta vela à lista
        categoriaData.velas.push(velaInfo);
        
        console.log(`🔗 Vela ${velaInfo.id} conectada à categoria "${categoria}"`);
    }
    
    // Cria um fio entre duas velas
    criarFio(velaA, velaB, categoria) {
        const linha = new PIXI.Graphics();
        this.fiosContainer.addChild(linha);
        
        const fio = {
            linha: linha,
            velaA: velaA,
            velaB: velaB,
            categoria: categoria,
            fasePulsacao: Math.random() * Math.PI * 2, // Fase aleatória
            estaAtivo: false
        };
        
        // Adiciona à lista de fios da categoria
        const categoriaData = this.fiosPorCategoria.get(categoria);
        categoriaData.fios.push(fio);
        
        // Desenha o fio inicial
        this.atualizarFio(fio);
        
        return fio;
    }
    
    // Atualiza a aparência de um fio
    atualizarFio(fio) {
        const estaNaCategoriaAtiva = fio.categoria === this.categoriaAtiva;
        const opacidadeBase = estaNaCategoriaAtiva 
            ? this.config.opacidadeAtiva 
            : this.config.opacidadeNormal;
        
        // Adiciona efeito de pulsação se não estiver ativo
        let opacidadeFinal = opacidadeBase;
        if (!estaNaCategoriaAtiva) {
            const pulsacao = Math.sin(fio.fasePulsacao) * this.config.pulsacao.amplitude;
            opacidadeFinal = Math.max(0.1, opacidadeBase + pulsacao);
        }
        
        // Desenha a linha
        fio.linha.clear();
        fio.linha.lineStyle(
            this.config.espessura,
            this.config.corFio,
            opacidadeFinal
        );
        
        // As coordenadas x e y já são o ponto central do marcador
        const x1 = fio.velaA.x;
        const y1 = fio.velaA.y;
        const x2 = fio.velaB.x;
        const y2 = fio.velaB.y;
        
        fio.linha.moveTo(x1, y1);
        fio.linha.lineTo(x2, y2);
        
        // Adiciona um pequeno brilho no centro do fio se ativo
        if (estaNaCategoriaAtiva) {
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            
            fio.linha.beginFill(this.config.corFio, 0.3);
            fio.linha.drawCircle(midX, midY, 3);
            fio.linha.endFill();
        }
    }
    
    // Anima todos os fios
    animarFios(delta) {
        this.fiosPorCategoria.forEach((categoriaData, categoria) => {
            categoriaData.fios.forEach(fio => {
                // Atualiza fase da pulsação apenas se não estiver ativo
                if (categoria !== this.categoriaAtiva) {
                    fio.fasePulsacao += this.config.pulsacao.velocidade * delta;
                }
                this.atualizarFio(fio);
            });
        });
    }
    
    // Ativa uma categoria inteira
    ativarCategoria(categoria, idVelaClicada) {
        // Cancela ativação anterior
        if (this.timeoutAtivacao) {
            clearTimeout(this.timeoutAtivacao);
        }
        
        // Remove destaque anterior
        if (this.categoriaAtiva) {
            this.removerDestaqueCategoria(this.categoriaAtiva);
        }
        
        // Ativa nova categoria
        this.categoriaAtiva = categoria;
        this.destacarVelaClicada(idVelaClicada);
        
        console.log(`✨ Ativando categoria: "${categoria}"`);
        
        // Configura desativação automática
        this.timeoutAtivacao = setTimeout(() => {
            this.desativarCategoria();
            console.log(`💫 Desativando categoria: "${categoria}"`);
        }, this.config.duracaoAtivacao);
    }
    
    // Destaca a vela clicada (adiciona uma classe CSS ao ícone do marcador)
    destacarVelaClicada(idVela) {
        // O marcador é armazenado em `markers` global (do map.js)
        if (window.markers && window.markers[idVela]) {
            const marker = window.markers[idVela];
            const iconElement = marker._icon;
            if (iconElement) {
                iconElement.classList.add('candle-highlighted');
                
                // Remove o destaque após o tempo de ativação
                setTimeout(() => {
                    iconElement.classList.remove('candle-highlighted');
                }, this.config.duracaoAtivacao);
            }
        }
    }
    
    // Remove destaque de uma categoria
    removerDestaqueCategoria(categoria) {
        // Não é necessário fazer nada aqui, a animação já cuida
    }
    
    // Desativa a categoria atual
    desativarCategoria() {
        if (this.categoriaAtiva) {
            this.categoriaAtiva = null;
        }
    }
    
    // Atualiza dimensões do canvas
    redimensionar() {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        // Não precisamos recalcular as posições aqui
    }
    
    // Atualiza as posições dos fios (chamada quando o mapa se move ou amplia)
    atualizarPosicoesFios() {
        // Para cada vela em cada categoria, atualiza as coordenadas x e y
        this.fiosPorCategoria.forEach((categoriaData, categoria) => {
            categoriaData.velas.forEach(vela => {
                // Busca o marcador correspondente
                if (window.markers && window.markers[vela.id] && window.map) {
                    const marker = window.markers[vela.id];
                    const point = window.map.latLngToContainerPoint(marker.getLatLng());
                    vela.x = point.x;
                    vela.y = point.y;
                }
            });
        });
        
        // Redesenha todos os fios com as novas posições
        this.redesenharTodosFios();
    }
    
    // Redesenha todos os fios (útil após atualizar posições)
    redesenharTodosFios() {
        this.fiosPorCategoria.forEach((categoriaData, categoria) => {
            categoriaData.fios.forEach(fio => {
                this.atualizarFio(fio);
            });
        });
    }
    
    // Limpa todos os fios
    limpar() {
        this.fiosPorCategoria.clear();
        this.fiosContainer.removeChildren();
    }
}

// ========== FUNÇÕES GLOBAIS PARA INTEGRAÇÃO ==========

// Conectar uma vela do mapa à rede (chamada pelo map.js)
window.connectCandleToNetwork = function(candleInfo) {
    if (!window.redeGlobal) {
        window.redeGlobal = new RedeDeIntencoes();
        console.log("✅ Rede de intenções inicializada");
    }
    
    window.redeGlobal.adicionarVela({
        id: candleInfo.id,
        elementoDOM: candleInfo.element,
        categoria: candleInfo.categoria,
        x: candleInfo.x,
        y: candleInfo.y
    });
};

// Atualizar posições quando o mapa se mover (chamada pelo map.js)
window.updateNetworkPositions = function() {
    if (window.redeGlobal) {
        window.redeGlobal.atualizarPosicoesFios();
    }
};

// Exporta para uso global
window.RedeDeIntencoes = RedeDeIntencoes;