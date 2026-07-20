const CACHE_NAME = 'washpilot-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/manifest.json',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
    '/js/utils.js',
    '/js/db.js',
    '/js/auth.js',
    '/js/app.js',
    '/js/dashboard.js',
    '/js/bookings.js',
    '/js/customers.js',
    '/js/income.js',
    '/js/expenses.js',
    '/js/equipment.js',
    '/js/route.js',
    '/js/savings.js',
    '/js/invoice.js',
    '/js/tax.js',
    '/js/sop.js',
    '/js/settings.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
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
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request)
                .then(fetchRes => {
                    if (fetchRes.status === 200 && fetchRes.type === 'basic') {
                        const clone = fetchRes.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return fetchRes;
                })
            )
            .catch(() => caches.match('/index.html'))
    );
});
