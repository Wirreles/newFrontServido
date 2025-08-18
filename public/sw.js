// Service Worker para Servido PWA
const CACHE_NAME = 'servido-v1.0.0';
const STATIC_CACHE = 'servido-static-v1';
const DYNAMIC_CACHE = 'servido-dynamic-v1';

// URLs para cache estático
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
  '/images/logo-128.png',
  '/images/logo-192.png',
  '/images/logo-512.png',
  '/images/banner-1.png',
  '/images/banner-2.png'
];

// Estrategia de cache: Cache First para recursos estáticos
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Si falla la red, devolver página offline
    if (request.destination === 'document') {
      return caches.match('/offline');
    }
    throw error;
  }
};

// Estrategia de cache: Network First para API calls
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
};

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Cache estático abierto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Recursos estáticos cacheados');
        return self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker listo para usar');
      return self.clients.claim();
    })
  );
});

// Interceptar fetch requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache First para recursos estáticos
  if (request.destination === 'image' || 
      request.destination === 'font' || 
      request.destination === 'style' ||
      request.destination === 'script') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network First para API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache First para páginas HTML
  if (request.destination === 'document') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Para otros recursos, usar Network First
  event.respondWith(networkFirst(request));
});

// Manejo de mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Manejo de push notifications (para futuras implementaciones)
self.addEventListener('push', (event) => {
  console.log('Push notification recibida:', event);
  
  const options = {
    body: 'Nueva notificación de Servido',
    icon: '/images/logo-192.png',
    badge: '/images/logo-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver',
        icon: '/images/logo-192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/images/logo-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Servido', options)
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notificación clickeada:', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
