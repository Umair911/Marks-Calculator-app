const CACHE_NAME = 'marks-calculator-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon-monochrome.png',
    './icon-96.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

// Install Event
self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE)
                .then(cache => cache.addAll(STATIC_ASSETS)),
            caches.open(DYNAMIC_CACHE)
        ])
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map(key => caches.delete(key))
            );
        })
    );
    return self.clients.claim();
});

// Fetch Event with Network-First Strategy for API calls and Cache-First for static assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Static Assets: Cache First
    if (STATIC_ASSETS.includes(url.pathname)) {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetchAndCache(event.request))
        );
        return;
    }

    // Dynamic Content: Network First
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clonedResponse = response.clone();
                caches.open(DYNAMIC_CACHE)
                    .then(cache => cache.put(event.request, clonedResponse));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Helper function to fetch and cache
async function fetchAndCache(request) {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
}

// Handle offline functionality
self.addEventListener('sync', event => {
    if (event.tag === 'sync-calculations') {
        event.waitUntil(syncCalculations());
    }
});

// Periodic sync for updates
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-cache') {
        event.waitUntil(updateCache());
    }
});

async function syncCalculations() {
    // Implement offline calculations sync
    const offlineData = await getOfflineData();
    if (offlineData) {
        try {
            // Sync with server when online
            await syncWithServer(offlineData);
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
}

async function updateCache() {
    try {
        await caches.delete(DYNAMIC_CACHE);
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.addAll(STATIC_ASSETS);
    } catch (error) {
        console.error('Cache update failed:', error);
    }
} 