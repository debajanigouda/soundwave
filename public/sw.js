const CACHE_NAME = "soundwave-v1";

// Install service worker
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

// Keep audio playing in background
self.addEventListener("fetch", (e) => {
  // Let audio streams pass through directly
  if (e.request.url.includes("/api/stream/")) {
    e.respondWith(fetch(e.request));
    return;
  }
});

// Handle media session actions from lock screen / keyboard
self.addEventListener("message", (e) => {
  if (e.data.type === "SKIP_WAITING") self.skipWaiting();
});