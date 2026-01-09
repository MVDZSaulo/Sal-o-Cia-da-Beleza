// Importar scripts do Firebase
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAqwvfNgFCKno8IYSmOQHual4Ks7tWIO1c",
  projectId: "cia-da-beleza-beb00",
  messagingSenderId: "567844800760",
  appId: "1:567844800760:web:8f16e64daa0315a9ae130d"
};

// Inicializar Firebase no Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Lidar com mensagens em background
messaging.onBackgroundMessage((payload) => {
  console.log('Notificação recebida em background:', payload);
  
  const notificationTitle = payload.notification?.title || 'Salão Beleza & Cia';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova notificação',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
    tag: 'salao-notification',
    requireInteraction: true
  };

  // Mostrar notificação
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Lidar com clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Verificar se já existe uma janela aberta
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Se não existir, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});