const CACHE_NAME = "muscle-foundation-v7";
const BASE = new URL("./", self.location).pathname;
const APP_SHELL = [BASE, BASE + "manifest.webmanifest", BASE + "icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(BASE);
    const html = await response.clone().text();
    const assets = [...html.matchAll(/(?:src|href)="(?:\.\/|\/)?(assets\/[^"]+)"/g)].map((match) => BASE + match[1]);
    await cache.put(BASE, response);
    await cache.addAll([...APP_SHELL.slice(1), ...assets]);
    await self.skipWaiting();
    fetch(BASE + "exercises/manifest.json").then((res) => res.json())
      .then((files) => Promise.all(files.map((file) => cache.add(BASE + file).catch(() => undefined))))
      .catch(() => undefined);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const requestUrl = new URL(event.request.url);
    const cached = await cache.match(event.request, { ignoreSearch: true }) ?? await cache.match(requestUrl.pathname);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const copy = response.clone();
        await cache.put(event.request, copy);
      }
      return response;
    } catch {
      if (event.request.mode === "navigate") return cache.match(BASE);
      return new Response("This resource is not available offline.", { status: 503, statusText: "Offline" });
    }
  })());
});
