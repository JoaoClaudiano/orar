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
        
        // Adiciona canvas atrás do conteúdo principal
        this.app.view.style.position = 'fixed';
        this.app.view.style.top = '0';
        this.app.view.style.left = '0';
        this.app.view.style.zIndex = '1';
        this.app.view.style.pointerEvents = 'none'; // Permite clicar nas velas
        document.body.prepend(this.app.view);
        
        // Contêiner para os fios
        this.fiosContainer = new PIXI.Container();
        this.app.stage.addChild(this.fiosContainer);
        
        // Mapa para armazenar fios por categoria
        this.fiosPorCategoria = new Map();
        
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
    }
    
    // Adiciona uma vela à rede
    adicionarVela(velaInfo) {
        // velaInfo: { id, elementoDOM, categoria, x, y }
        const categoria = velaInfo.categoria || 'Geral';
        
        // Cria array para a categoria se não existir
        if (!this.fiosPorCategoria.has(categoria)) {
            this.fiosPorCategoria.set(categoria, []);
        }
        
        // Conecta com todas as velas da mesma categoria
        const velasDaCategoria = this.fiosPorCategoria.get(categoria);
        
        velasDaCategoria.forEach(vExistente => {
            this.criarFio(vExistente, velaInfo, categoria);
        });
        
        // Adiciona esta vela à lista
        velasDaCategoria.push(velaInfo);
        
        // Adiciona evento de clique
        velaInfo.elementoDOM.addEventListener('click', () => {
            this.ativarCategoria(categoria, velaInfo.id);
        });
    }
    
    // Cria um fio entre duas velas
    criarFio(velaA, velaB, categoria) {
        const linha = new PIXI.Graphics();
        this.fiosContainer.addChild(linha);
        
        const fio = {
            linha: linha,
            velaA: velaA,
            velaB: velab,
            categoria: categoria,
            fasePulsacao: Math.random() * Math.PI * 2, // Fase aleatória
            estaAtivo: false
        };
        
        // Adiciona à lista da categoria
        const fiosCategoria = this.fiosPorCategoria.get(categoria);
        if (!fiosCategoria.fios) {
            fiosCategoria.fios = [];
        }
        fiosCategoria.fios.push(fio);
        
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
        
        // Ponto central das velas
        const x1 = fio.velaA.x + fio.velaA.elementoDOM.clientWidth / 2;
        const y1 = fio.velaA.y + fio.velaA.elementoDOM.clientHeight / 2;
        const x2 = fio.velaB.x + fio.velaB.elementoDOM.clientWidth / 2;
        const y2 = fio.velaB.y + fio.velaB.elementoDOM.clientHeight / 2;
        
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
        this.fiosPorCategoria.forEach((infoCategoria, categoria) => {
            if (infoCategoria.fios) {
                infoCategoria.fios.forEach(fio => {
                    // Atualiza fase da pulsação apenas se não estiver ativo
                    if (categoria !== this.categoriaAtiva) {
                        fio.fasePulsacao += this.config.pulsacao.velocidade * delta;
                    }
                    this.atualizarFio(fio);
                });
            }
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
        
        // Atualiza todos os fios desta categoria
        const infoCategoria = this.fiosPorCategoria.get(categoria);
        if (infoCategoria && infoCategoria.fios) {
            infoCategoria.fios.forEach(fio => {
                fio.estaAtivo = true;
            });
        }
        
        // Configura desativação automática
        this.timeoutAtivacao = setTimeout(() => {
            this.desativarCategoria();
        }, this.config.duracaoAtivacao);
    }
    
    // Destaca a vela clicada
    destacarVelaClicada(idVela) {
        // Encontra o elemento da vela (você pode adaptar conforme sua estrutura)
        const elementoVela = document.querySelector(`[data-vela-id="${idVela}"]`);
        if (elementoVela) {
            elementoVela.classList.add('vela-destaque');
            
            // Remove o destaque após o tempo de ativação
            setTimeout(() => {
                elementoVela.classList.remove('vela-destaque');
            }, this.config.duracaoAtivacao);
        }
    }
    
    // Remove destaque de uma categoria
    removerDestaqueCategoria(categoria) {
        const infoCategoria = this.fiosPorCategoria.get(categoria);
        if (infoCategoria && infoCategoria.fios) {
            infoCategoria.fios.forEach(fio => {
                fio.estaAtivo = false;
            });
        }
    }
    
    // Desativa a categoria atual
    desativarCategoria() {
        if (this.categoriaAtiva) {
            this.removerDestaqueCategoria(this.categoriaAtiva);
            this.categoriaAtiva = null;
        }
    }
    
    // Atualiza dimensões do canvas
    redimensionar() {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        
        // Recalcula posições de todos os fios
        this.fiosPorCategoria.forEach((infoCategoria, categoria) => {
            if (infoCategoria.fios) {
                infoCategoria.fios.forEach(fio => {
                    this.atualizarFio(fio);
                });
            }
        });
    }
    
    // Limpa todos os fios
    limpar() {
        this.fiosPorCategoria.clear();
        this.fiosContainer.removeChildren();
    }
}

// Exporta para uso global
window.RedeDeIntencoes = RedeDeIntencoes;