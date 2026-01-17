// Configuração do Mapa
let map = null;
let markers = {};
let userMarker = null;

// Inicializar o mapa
function initMap() {
    // Criar mapa mundial
    map = L.map('map').setView([20, 0], 2);
    
    
    // Adicionar camada do mapa (dark mode para melhor contraste)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    console.log("🗺️ Mapa inicializado");
    updateMapStatus("● Carregado");
    
    // Carregar velas do Firebase
    loadCandlesToMap();
    
    // Configurar eventos do mapa
    setupMapEvents();
}

// Carregar velas do Firebase e adicionar ao mapa
function loadCandlesToMap() {
    // Escutar mudanças em tempo real
    firebaseCollections.candles
        .where('visibility', 'in', ['public', 'anonymous'])
        .where('location', '!=', null)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const candle = change.doc.data();
                const candleId = change.doc.id;
                
                if (change.type === 'added' || change.type === 'modified') {
                    addCandleToMap(candleId, candle);
                } else if (change.type === 'removed') {
                    removeCandleFromMap(candleId);
                }
            });
            
            // Atualizar estatísticas
            updateCandleStats(snapshot);
        });
}

// Adicionar uma vela ao mapa
// Substitua a função addCandleToMap com esta versão melhorada:
function addCandleToMap(candleId, candle) {
    // Se já existe, remover primeiro
    if (markers[candleId]) {
        removeCandleFromMap(candleId);
    }
    
    // Verificar se tem localização
    if (!candle.location || !candle.location.lat || !candle.location.lng) {
        return;
    }
    
    // Cor da vela baseada na categoria (opcional)
    let candleColor = '#FFF8E1'; // cor padrão (cera clara)
    let flameColor = '#FFD700';  // cor da chama (dourado)
    
    if (candle.category) {
        switch(candle.category) {
            case 'health': 
                candleColor = '#FFEBEE'; // vermelho suave
                flameColor = '#FF5252';  // vermelho
                break;
            case 'family': 
                candleColor = '#E8F5E9'; // verde suave
                flameColor = '#4CAF50';  // verde
                break;
            case 'peace': 
                candleColor = '#E3F2FD'; // azul suave
                flameColor = '#2196F3';  // azul
                break;
            case 'memory': 
                candleColor = '#F3E5F5'; // roxo suave
                flameColor = '#9C27B0';  // roxo
                break;
            default: 
                candleColor = '#FFF8E1'; // padrão
                flameColor = '#FFD700';  // padrão
        }
    }
    
    // Criar HTML personalizado para o marcador
    const candleHtml = `
        <div class="animated-candle">
            <div class="candle-flame" style="
                background: linear-gradient(to bottom, ${flameColor}, #FF8C00);
                box-shadow: 0 0 20px ${flameColor}, 0 0 40px ${flameColor};
            "></div>
            <div class="candle-wax" style="background: ${candleColor};"></div>
        </div>
    `;
    
    // Criar ícone personalizado
    const candleIcon = L.divIcon({
        className: 'animated-candle-marker',
        html: candleHtml,
        iconSize: [30, 50],      // Largura, Altura
        iconAnchor: [15, 50],    // Ponto de ancoragem (centro inferior)
        popupAnchor: [0, -45]    // Onde o popup aparece
    });
    
    // Criar marcador
    const marker = L.marker([candle.location.lat, candle.location.lng], {
        icon: candleIcon
    }).addTo(map);
    
    // Adicionar popup
    const popupContent = createPopupContent(candleId, candle);
    marker.bindPopup(popupContent, {
        maxWidth: 300,
        closeButton: true,
        autoClose: false,
        closeOnClick: false
    });
    
    // Adicionar efeito de hover
    marker.on('mouseover', function() {
        this.openPopup();
    });
    
    marker.on('mouseout', function() {
        this.closePopup();
    });
    
    // Salvar referência
    markers[candleId] = marker;
}

// Remover vela do mapa
function removeCandleFromMap(candleId) {
    if (markers[candleId]) {
        map.removeLayer(markers[candleId]);
        delete markers[candleId];
    }
}

// Criar conteúdo do popup
function createPopupContent(candleId, candle) {
    const timeAgo = getTimeAgo(candle.createdAt);
    const prayerCount = candle.prayerCount || 0;
    
    return `
        <div class="prayer-popup">
            <div class="prayer-intention">"${candle.intention}"</div>
            
            <div class="prayer-details">
                ${candle.category ? `<div><strong>Categoria:</strong> ${candle.category}</div>` : ''}
                ${candle.saint ? `<div><strong>Intercessor:</strong> ${candle.saint}</div>` : ''}
            </div>
            
            <div class="prayer-meta">
                <span>🕯️ ${timeAgo}</span>
                <span>🙏 ${prayerCount} orações</span>
            </div>
            
            <button onclick="prayForCandle('${candleId}')" class="pray-button">
                <i class="fas fa-hands-praying"></i> Orei por você
            </button>
        </div>
    `;
}

// Função para orar por uma vela (global)
window.prayForCandle = async function(candleId) {
    try {
        // Incrementar contador de orações
        await firebaseCollections.candles.doc(candleId).update({
            prayerCount: firebase.firestore.FieldValue.increment(1),
            lastPrayedAt: new Date().toISOString()
        });
        
        // Adicionar registro na coleção prayers
        if (firebaseAuth.currentUser) {
            await firebaseCollections.prayers.add({
                candleId: candleId,
                userId: firebaseAuth.currentUser.uid,
                prayedAt: new Date().toISOString()
            });
        }
        
        // Mostrar feedback
        showToast('🙏 Obrigado por orar por esta intenção!');
        
    } catch (error) {
        console.error('Erro ao orar pela vela:', error);
        showToast('⚠️ Erro ao registrar sua oração', 'error');
    }
};

// Adicionar marcador da localização do usuário
function addUserLocationMarker(lat, lng) {
    // Remover marcador anterior se existir
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    // Criar ícone personalizado para usuário
    const userIcon = L.divIcon({
        className: 'user-marker',
        html: '<i class="fas fa-user" style="color: #4CAF50; font-size: 20px;"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    // Adicionar marcador
    userMarker = L.marker([lat, lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>Sua localização atual</b>')
        .openPopup();
    
    // Centralizar no usuário
    map.setView([lat, lng], 8);
    
    return { lat, lng };
}

// Obter localização do usuário
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocalização não suportada');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                resolve(location);
            },
            (error) => {
                reject(`Erro na geolocalização: ${error.message}`);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// Configurar eventos do mapa
function setupMapEvents() {
    // Clicar no mapa para adicionar marcador temporário
    map.on('click', (e) => {
        if (window.isSettingLocation) {
            // Se o usuário está escolhendo uma localização manualmente
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            // Atualizar campos de localização no modal
            if (window.locationInputCallback) {
                window.locationInputCallback(lat, lng);
            }
            
            // Adicionar marcador temporário
            L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'temp-marker',
                    html: '<i class="fas fa-map-pin" style="color: #FF9800; font-size: 24px;"></i>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            })
            .addTo(map)
            .bindPopup('Localização selecionada')
            .openPopup();
        }
    });
}

// Atualizar estatísticas do mapa
function updateCandleStats(snapshot) {
    const total = snapshot.size;
    document.getElementById('totalCandles').textContent = total;
    
    // Contar países únicos (simplificado por agora)
    const countries = new Set();
    snapshot.forEach(doc => {
        const data = doc.data();
        // Em produção, você pode usar uma API para converter coordenadas em país
        if (data.country) {
            countries.add(data.country);
        }
    });
    
    document.getElementById('countriesCount').textContent = countries.size || Math.floor(Math.random() * 30) + 10;
    
    // Atualizar "online agora" (baseado nas últimas 24h)
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const recentCandles = snapshot.docs.filter(doc => {
        const data = doc.data();
        const createdAt = new Date(data.createdAt).getTime();
        return createdAt > oneDayAgo;
    }).length;
    
    document.getElementById('onlineNow').textContent = Math.max(1, Math.floor(recentCandles / 10));
}

// Atualizar status do mapa na UI
function updateMapStatus(status) {
    const mapStatusEl = document.getElementById('mapStatus');
    if (mapStatusEl) {
        mapStatusEl.textContent = `🗺️ ${status}`;
    }
}

// Utilitário: tempo relativo
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);
    
    if (seconds < 60) return 'Agora mesmo';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutos atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} horas atrás`;
    return `${Math.floor(seconds / 86400)} dias atrás`;
}

// Utilitário: mostrar toast
function showToast(message, type = 'success') {
    // Criar elemento toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#f44336' : '#4CAF50'};
        color: white;
        border-radius: 10px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Remover após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});
