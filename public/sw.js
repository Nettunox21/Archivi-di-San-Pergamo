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

// ---------------------------------------------------------------
//  Notifiche push: il messaggio arriva, viene mostrato e basta.
//  Non viene salvato né in cache né sul server.
// ---------------------------------------------------------------
self.addEventListener("push", (event) => {
    let dati = {};
    try {
        dati = event.data ? event.data.json() : {};
    } catch (e) {
        dati = { body: event.data ? event.data.text() : "" };
    }

    event.waitUntil(
        self.registration.showNotification(dati.title || "Archivi di San Pergamo", {
            body: dati.body || "",
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            data: { url: dati.url || "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    let destinazione;
    try {
        destinazione = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
    } catch (e) {
        return;
    }
    if (destinazione.origin !== self.location.origin) return;

    event.waitUntil(
        (async () => {
            const finestre = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
            for (const finestra of finestre) {
                if ("focus" in finestra) {
                    await finestra.focus();
                    if ("navigate" in finestra) {
                        try {
                            await finestra.navigate(destinazione.href);
                        } catch (e) {
                            /* alcuni telefoni non lo permettono: basta aver portato l'app in primo piano */
                        }
                    }
                    return;
                }
            }
            await self.clients.openWindow(destinazione.href);
        })()
    );
});
