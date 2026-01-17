// Lógica principal da aplicação
document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const welcomeOverlay = document.getElementById('welcomeOverlay');
    const exploreBtn = document.getElementById('exploreBtn');
    const lightFirstCandle = document.getElementById('lightFirstCandle');
    const controlCard = document.getElementById('controlCard');
    const toggleCardBtn = document.getElementById('toggleCard');
    const closeCardBtn = document.getElementById('closeCard');
    const lightCandleBtn = document.getElementById('lightCandleBtn');
    const findMyLocationBtn = document.getElementById('findMyLocation');
    const toggleMapBtn = document.getElementById('toggleMapBtn');
    const viewWallBtn = document.getElementById('viewWallBtn');
    const expandMapBtn = document.getElementById('expandMap');
    const candleModal = document.getElementById('candleModal');
    const submitCandleBtn = document.getElementById('submitCandle');
    const cancelCandleBtn = document.getElementById('cancelCandle');
    const useMyLocationCheckbox = document.getElementById('useMyLocation');
    const menuToggleBtn = document.getElementById('menuToggle');
    
    // Estado da aplicação
    let appState = {
        isCardMinimized: false,
        isMapFocused: false,
        userLocation: null,
        candles: [],
        rooms: []
    };
    
    // ========== INICIALIZAÇÃO ==========
    function initApp() {
        // Login anônimo no Firebase
        firebaseAuth.signInAnonymously()
            .then(() => {
                console.log('👤 Usuário anônimo conectado');
                updateFirebaseStatus('● Conectado');
            })
            .catch(error => {
                console.error('Erro na autenticação:', error);
                updateFirebaseStatus('○ Desconectado');
            });
        
        // Carregar estatísticas iniciais
        updatePrayersToday();
        setInterval(updatePrayersToday, 60000); // Atualizar a cada minuto
        
        // Configurar eventos
        setupEventListeners();
        
        // Verificar se já visitou antes
        const hasVisited = localStorage.getItem('orar_hasVisited');
        if (hasVisited) {
            welcomeOverlay.style.display = 'none';
            document.getElementById('map').classList.remove('map-dimmed');
        }
    }
    
    // ========== EVENT LISTENERS ==========
    function setupEventListeners() {
        // Overlay de boas-vindas
        exploreBtn.addEventListener('click', () => {
            welcomeOverlay.style.display = 'none';
            document.getElementById('map').classList.remove('map-dimmed');
            localStorage.setItem('orar_hasVisited', 'true');
        });
        
        lightFirstCandle.addEventListener('click', () => {
            welcomeOverlay.style.display = 'none';
            document.getElementById('map').classList.remove('map-dimmed');
            openCandleModal();
            localStorage.setItem('orar_hasVisited', 'true');
        });
        
        // Card flutuante
        toggleCardBtn.addEventListener('click', () => {
            appState.isCardMinimized = !appState.isCardMinimized;
            controlCard.classList.toggle('minimized', appState.isCardMinimized);
            const icon = toggleCardBtn.querySelector('i');
            icon.className = appState.isCardMinimized ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        });
        
        closeCardBtn.addEventListener('click', () => {
            controlCard.style.display = 'none';
            // Mostrar botão para reabrir
            menuToggleBtn.style.display = 'flex';
        });
        
        // Botões de ação
        lightCandleBtn.addEventListener('click', openCandleModal);
        findMyLocationBtn.addEventListener('click', handleFindLocation);
        toggleMapBtn.addEventListener('click', toggleMapFocus);
        viewWallBtn.addEventListener('click', () => {
            alert('🧱 Mural de Orações em breve!\n\nEsta funcionalidade será implementada na próxima atualização.');
        });
        expandMapBtn.addEventListener('click', toggleFullscreen);
        
        // Modal de vela
        cancelCandleBtn.addEventListener('click', () => {
            candleModal.style.display = 'none';
        });
        
        submitCandleBtn.addEventListener('click', handleSubmitCandle);
        
        // Localização
        useMyLocationCheckbox.addEventListener('change', (e) => {
            const locationPreview = document.getElementById('locationPreview');
            if (e.target.checked) {
                locationPreview.style.display = 'block';
                getUserLocation()
                    .then(location => {
                        appState.userLocation = location;
                        document.getElementById('locationText').textContent = 
                            `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
                    })
                    .catch(error => {
                        console.error('Erro ao obter localização:', error);
                        showToast('Não foi possível obter sua localização', 'error');
                        e.target.checked = false;
                        locationPreview.style.display = 'none';
                    });
            } else {
                locationPreview.style.display = 'none';
            }
        });
        
        // Botão de menu
        menuToggleBtn.addEventListener('click', () => {
            controlCard.style.display = 'block';
            menuToggleBtn.style.display = 'none';
        });
        
        // Teclas de atalho
        document.addEventListener('keydown', (e) => {
            // ESC fecha modais
            if (e.key === 'Escape') {
                if (candleModal.style.display === 'flex') {
                    candleModal.style.display = 'none';
                }
                if (welcomeOverlay.style.display === 'flex') {
                    welcomeOverlay.style.display = 'none';
                    document.getElementById('map').classList.remove('map-dimmed');
                }
            }
            // Espaço para acender vela
            if (e.key === ' ' && !e.target.matches('textarea, input')) {
                e.preventDefault();
                openCandleModal();
            }
        });
    }
    
    // ========== FUNÇÕES PRINCIPAIS ==========
    function openCandleModal() {
        candleModal.style.display = 'flex';
        document.getElementById('candleIntention').focus();
    }
    
    async function handleSubmitCandle() {
        const intention = document.getElementById('candleIntention').value.trim();
        const category = document.getElementById('candleCategory').value;
        const saint = document.getElementById('candleSaint').value;
        const visibility = document.querySelector('input[name="visibility"]:checked').value;
        const useMyLocation = document.getElementById('useMyLocation').checked;
        
        if (!intention) {
            showToast('Por favor, escreva sua intenção', 'error');
            return;
        }
        
        // Dados da vela
        const candleData = {
            intention: intention,
            category: category,
            saint: saint || null,
            visibility: visibility,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
            prayerCount: 0,
            isActive: true
        };
        
        // Adicionar localização se disponível
        if (useMyLocation && appState.userLocation) {
            candleData.location = {
                lat: appState.userLocation.lat,
                lng: appState.userLocation.lng
            };
            
            // Adicionar marcador temporário no mapa
            if (window.addUserLocationMarker) {
                window.addUserLocationMarker(appState.userLocation.lat, appState.userLocation.lng);
            }
        }
        
        // Adicionar ID do usuário se autenticado
        if (firebaseAuth.currentUser) {
            candleData.userId = firebaseAuth.currentUser.uid;
        }
        
        try {
            // Salvar no Firebase
            const docRef = await firebaseCollections.candles.add(candleData);
            console.log('Vela salva com ID:', docRef.id);
            
            // Feedback visual
            showToast('🕯️ Vela acesa com sucesso!');
            
            // Fechar modal e resetar formulário
            candleModal.style.display = 'none';
            document.getElementById('candleIntention').value = '';
            document.getElementById('useMyLocation').checked = false;
            document.getElementById('locationPreview').style.display = 'none';
            
        } catch (error) {
            console.error('Erro ao salvar vela:', error);
            showToast('Erro ao acender vela. Tente novamente.', 'error');
        }
    }
    
    async function handleFindLocation() {
        try {
            const location = await getUserLocation();
            appState.userLocation = location;
            
            // Adicionar marcador no mapa
            if (window.addUserLocationMarker) {
                window.addUserLocationMarker(location.lat, location.lng);
            }
            
            showToast('📍 Localização encontrada!');
            
        } catch (error) {
            console.error('Erro ao obter localização:', error);
            showToast('Não foi possível obter sua localização', 'error');
        }
    }
    
    function toggleMapFocus() {
        appState.isMapFocused = !appState.isMapFocused;
        
        if (appState.isMapFocused) {
            // Esconder card e focar no mapa
            controlCard.style.display = 'none';
            menuToggleBtn.style.display = 'flex';
            document.getElementById('map').style.filter = 'none';
            showToast('🗺️ Modo mapa ativado');
        } else {
            // Mostrar card novamente
            controlCard.style.display = 'block';
            menuToggleBtn.style.display = 'none';
        }
    }
    
    function toggleFullscreen() {
        const elem = document.getElementById('map');
        
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) { /* Safari */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { /* IE11 */
                elem.msRequestFullscreen();
            }
            showToast('📺 Modo tela cheia ativado');
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }
    }
    
    function updatePrayersToday() {
        // Para simular enquanto não temos dados reais
        const now = new Date();
        const hour = now.getHours();
        const basePrayers = 1247;
        const hourlyIncrease = 42;
        const prayers = basePrayers + (hour * hourlyIncrease);
        
        document.getElementById('prayersToday').textContent = 
            prayers.toLocaleString('pt-BR');
    }
    
    function updateFirebaseStatus(status) {
        const statusEl = document.getElementById('firebaseStatus');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.style.color = status.includes('●') ? '#4CAF50' : '#f44336';
        }
    }
    
    // ========== INICIAR APLICAÇÃO ==========
    initApp();
});
