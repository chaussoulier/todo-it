// Service Worker pour Todo It

// Nom du cache pour les ressources statiques
const CACHE_NAME = 'todo-it-cache-v1';

// Liste des ressources à mettre en cache
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/config.js',
  '/firebase-config.js',
  '/firebase-service.js',
  '/push-config.js',
  '/push-service.js',
  '/today.html',
  '/tomorrow.html',
  '/soon.html',
  '/late.html',
  '/today.js',
  '/tomorrow.js',
  '/soon.js',
  '/late.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Mise en cache des ressources');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interception des requêtes fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - retourner la réponse du cache
        if (response) {
          return response;
        }
        // Pas de correspondance dans le cache, récupérer depuis le réseau
        return fetch(event.request).then(
          (response) => {
            // Vérifier si nous avons reçu une réponse valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cloner la réponse car elle ne peut être utilisée qu'une fois
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Notification push reu00e7ue', event);
  
  let notificationData = {};
  
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'Todo It',
      body: event.data ? event.data.text() : 'Nouvelle notification'
    };
  }
  
  const title = notificationData.title || 'Todo It';
  const options = {
    body: notificationData.body || 'Vous avez des tu00e2ches u00e0 accomplir !',
    icon: notificationData.icon || '/favicon.ico',
    badge: notificationData.badge || '/favicon.ico',
    data: notificationData.data || {},
    actions: notificationData.actions || [
      { action: 'view', title: 'Voir les tu00e2ches' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Clic sur notification', event);
  
  event.notification.close();
  
  const action = event.action;
  const notification = event.notification;
  const data = notification.data || {};
  
  let url = '/';
  
  if (action === 'view') {
    // Rediriger vers la page appropriu00e9e en fonction du type de notification
    if (data.type === 'today') {
      url = '/today.html';
    } else if (data.type === 'tomorrow') {
      url = '/tomorrow.html';
    } else if (data.type === 'soon') {
      url = '/soon.html';
    } else if (data.type === 'late') {
      url = '/late.html';
    }
  } else if (data.url) {
    url = data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Vu00e9rifier si une fenu00eatre est du00e9ju00e0 ouverte et la focaliser
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon, ouvrir une nouvelle fenu00eatre
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Gestion de la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Fermeture de notification', event);
  // Vous pouvez ajouter ici une logique pour suivre les notifications fermu00e9es
});

// Synchronisation en arriu00e8re-plan
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Sync event', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(
      // Logique pour synchroniser les tu00e2ches en arriu00e8re-plan
      // Cette fonctionnalitu00e9 nu00e9cessiterait un serveur pour u00eatre pleinement implu00e9mentu00e9e
      console.log('Synchronisation des tu00e2ches en arriu00e8re-plan')
    );
  }
});
