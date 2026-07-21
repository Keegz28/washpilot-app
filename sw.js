const CACHE_NAME = 'washpilot-v6';
const BASE = self.registration.scope;

const ASSETS = [
    '',
    'index.html',
    'css/style.css',
    'manifest.json',
    'icons/icon-192.svg',
    'icons/icon-512.svg',
    'js/icons.js',
    'js/utils.js',
    'js/db.js',
    'js/auth.js',
    'js/app.js',
    'js/dashboard.js',
    'js/bookings.js',
    'js/customers.js',
    'js/income.js',
    'js/expenses.js',
    'js/equipment.js',
    'js/route.js',
    'js/savings.js',
    'js/invoice.js',
    'js/tax.js',
    'js/sop.js',
    'js/settings.js'
];

const CDN_ASSETS = [
    'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                const local = ASSETS.map(a => cache.add(new URL(a, BASE).href));
                const cdn = CDN_ASSETS.map(u => cache.add(u).catch(() => {}));
                return Promise.all([...local, ...cdn]);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const reqUrl = event.request.url.split('?')[0].split('#')[0];
    const localPath = reqUrl.replace(location.origin + self.registration.scope, '');

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(new URL(localPath || '', BASE).href).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.ok && event.request.method === 'GET') {
                        const clone = response.clone();
                        cache.put(event.request, clone).catch(() => {});
                    }
                    return response;
                }).catch(() => {
                    if (event.request.mode === 'navigate') {
                        return cache.match(new URL('index.html', BASE).href);
                    }
                    return new Response('Offline', { status: 503 });
                });
            });
        })
    );
});
