// ============================================================
//  pointy Beta — Service Worker con soporte Offline-First
//  Versión: 4.0
// ============================================================

const CACHE_NAME = 'pointy-v4';
const OFFLINE_QUEUE_KEY = 'pointy_offline_queue';

// Assets que se cachean en la instalación (shell de la app)
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
];

// ── INSTALAR ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        }).then(() => self.skipWaiting())
    );
});

// ── ACTIVAR ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// ── FETCH — Estrategia Cache-First para assets, Network-First para API ──
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Peticiones a Supabase/APIs externas: solo network, no cachear
    if (url.hostname.includes('supabase.co') ||
        url.hostname.includes('supabase.io') ||
        url.protocol === 'chrome-extension:') {
        return; // Dejar que el navegador maneje estas normalmente
    }

    // Para métodos que no son GET, no interceptar
    if (event.request.method !== 'GET') return;

    // Estrategia: Cache-first con fallback a network
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // Tenemos caché, devolver y actualizar en background
                const networkUpdate = fetch(event.request)
                    .then((response) => {
                        if (response && response.ok) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, clone);
                            });
                        }
                        return response;
                    })
                    .catch(() => null);

                // Para JS/CSS actualizamos en background pero respondemos con caché
                return cached;
            }

            // Sin caché, intentar network
            return fetch(event.request)
                .then((response) => {
                    if (!response || !response.ok) return response;
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline y sin caché — devolver el index.html para SPA routing
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
        })
    );
});

// ── BACKGROUND SYNC ─────────────────────────────────────────
// Se dispara cuando se recupera la conexión (si el navegador soporta Background Sync)
self.addEventListener('sync', (event) => {
    if (event.tag === 'pointy-sync-queue') {
        event.waitUntil(processPendingQueue());
    }
});

// También escuchar mensajes directos desde la app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PROCESS_QUEUE') {
        processPendingQueue().then(() => {
            // Notificar a todos los clientes que la cola fue procesada
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'QUEUE_PROCESSED' });
                });
            });
        });
    }

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Función para procesar la cola de operaciones offline
// (Esta es una función auxiliar; la lógica real de sync está en la app)
async function processPendingQueue() {
    // Notificamos a los clientes activos para que procesen su cola
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
        client.postMessage({ type: 'TRIGGER_SYNC' });
    });
}
