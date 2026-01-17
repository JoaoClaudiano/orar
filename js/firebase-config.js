// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDNDAOqdCVsk4w2aEdLR_ihsrhqASacDpw",
    authDomain: "orar-b23db.firebaseapp.com",
    projectId: "orar-b23db",
    storageBucket: "orar-b23db.firebasestorage.app",
    messagingSenderId: "552018175417",
    appId: "1:552018175417:web:fc7606ec957128685b4268",
    measurementId: "G-SMHCL4S3RY"
};


// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Coleções
const candlesCollection = db.collection('candles');
const usersCollection = db.collection('users');
const prayersCollection = db.collection('prayers');

console.log("✅ Firebase conectado: Projeto 'orar-b23db'");

// Exportar para uso global
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;
window.firebaseCollections = {
    candles: candlesCollection,
    users: usersCollection,
    prayers: prayersCollection
};
