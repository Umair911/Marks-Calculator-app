const CACHE_NAME = 'marks-calculator-v2';
const STATIC_CACHE = 'static-cache-v2';
const DYNAMIC_CACHE = 'dynamic-cache-v2';

const STATIC_ASSETS = [
    './',
    'index.html',
    'manifest.json',
    'icon-192.png',
    'icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE)
                .then(cache => cache.addAll(STATIC_ASSETS)),
            caches.open(DYNAMIC_CACHE)
        ])
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch event - network first for dynamic content, cache first for static assets
self.addEventListener('fetch', event => {
    if (event.request.url.includes('/api/')) {
        // Network first strategy for API calls
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return caches.open(DYNAMIC_CACHE)
                        .then(cache => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                })
                .catch(() => caches.match(event.request))
        );
    } else if (STATIC_ASSETS.some(asset => event.request.url.includes(asset))) {
        // Cache first strategy for static assets
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetchAndCache(event.request))
        );
    } else {
        // Network first with cache fallback for everything else
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return caches.open(DYNAMIC_CACHE)
                        .then(cache => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                })
                .catch(() => caches.match(event.request))
        );
    }
});

// Helper function to fetch and cache
function fetchAndCache(request) {
    return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
        }

        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, responseToCache));

        return response;
    });
}

// Background sync
self.addEventListener('sync', event => {
    if (event.tag === 'syncCalculations') {
        event.waitUntil(syncCalculations());
    }
});

// Periodic sync
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-cache') {
        event.waitUntil(updateCache());
    }
});

// Function to sync calculations
async function syncCalculations() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        const calculations = requests.filter(request => 
            request.url.includes('/calculations/')
        );

        await Promise.all(calculations.map(async request => {
            try {
                const response = await fetch(request);
                await cache.put(request, response);
            } catch (error) {
                console.error('Error syncing calculation:', error);
            }
        }));
    } catch (error) {
        console.error('Error in syncCalculations:', error);
    }
}

// Function to update cache
async function updateCache() {
    try {
        const cache = await caches.open(STATIC_CACHE);
        await Promise.all(
            STATIC_ASSETS.map(async asset => {
                try {
                    const response = await fetch(asset);
                    await cache.put(asset, response);
                } catch (error) {
                    console.error('Error updating cache for asset:', asset, error);
                }
            })
        );
    } catch (error) {
        console.error('Error in updateCache:', error);
    }
}