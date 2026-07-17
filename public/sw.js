const CACHE_NAME = "san-pergamo-v1";
const OFFLINE_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Network-first per le pagine (contenuti sempre aggiornati),
// cache-first per asset statici (immagini, css, font).
self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    const isStaticAsset = /\.(png|jpg|jpeg|svg|webp|ico|css|woff2?)$/.test(
        url.pathname
    );

    if (isStaticAsset) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request).then((res) => {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                        return res;
                    })
            )
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then((res) => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                return res;
            })
            .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
});
