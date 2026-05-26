// ─────────────────────────────────────────────
//  SoundWave Service Worker
//  - Caches app shell (HTML, JS, CSS)
//  - Caches audio streams in IndexedDB (last 20 songs)
//  - Serves cached audio offline instantly
//  - Caches thumbnails automatically
// ─────────────────────────────────────────────

const SW_VERSION = "soundwave-v3";
const SHELL_CACHE = `${SW_VERSION}-shell`;
const THUMB_CACHE = `${SW_VERSION}-thumbs`;
const DB_NAME = "soundwave-audio";
const DB_VERSION = 1;
const STORE_NAME = "streams";
const MAX_CACHED_SONGS = 20;

// App shell files to precache
const SHELL_URLS = ["/", "/index.html", "/manifest.json", "/favicon.svg"];

// ── IndexedDB helpers ──────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "url" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAudioFromDB(url) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(url);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function saveAudioToDB(url, blob, songMeta) {
  const db = await openDB();

  // Enforce MAX_CACHED_SONGS — evict oldest if needed
  const all = await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).index("timestamp").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  if (all.length >= MAX_CACHED_SONGS) {
    // Sort by oldest timestamp, delete the oldest ones
    all.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = all.slice(0, all.length - MAX_CACHED_SONGS + 1);
    const delTx = db.transaction(STORE_NAME, "readwrite");
    toDelete.forEach((entry) => delTx.objectStore(STORE_NAME).delete(entry.url));
  }

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      url,
      blob,
      timestamp: Date.now(),
      title: songMeta?.title || "",
      artist: songMeta?.artist || "",
      youtubeId: songMeta?.youtubeId || "",
      thumbnail: songMeta?.thumbnail || "",
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

async function getAllCachedSongs() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).index("timestamp").getAll();
    req.onsuccess = () =>
      resolve(
        (req.result || [])
          .sort((a, b) => b.timestamp - a.timestamp)
          .map(({ url, title, artist, youtubeId, thumbnail, timestamp }) => ({
            url, title, artist, youtubeId, thumbnail, timestamp,
          }))
      );
    req.onerror = () => resolve([]);
  });
}

async function deleteCachedSong(url) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(url);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

// ── Install — precache app shell ───────────────────────────────────────────

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // Don't fail install if shell cache fails
  );
});

// ── Activate — clean up old caches ────────────────────────────────────────

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== THUMB_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => clients.claim())
  );
});

// ── Fetch — intercept requests ─────────────────────────────────────────────

self.addEventListener("fetch", (e) => {
  const { url } = e.request;

  // 1. Audio stream requests — try cache first, then network + cache
  if (url.includes("/api/stream/")) {
    e.respondWith(handleAudioStream(e.request));
    return;
  }

  // 2. Thumbnail images — cache as they load
  if (
    url.includes("i.ytimg.com") ||
    url.includes("img.youtube.com") ||
    url.includes("coverartarchive.org")
  ) {
    e.respondWith(handleThumbnail(e.request));
    return;
  }

  // 3. App shell — network first, fallback to cache
  if (
    url.includes("/index.html") ||
    url.endsWith("/") ||
    url.includes("/manifest.json")
  ) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 4. JS/CSS assets — cache first (they're hashed by Vite)
  if (url.includes("/assets/")) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ||
          fetch(e.request).then((res) => {
            caches.open(SHELL_CACHE).then((c) => c.put(e.request, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  // 5. Everything else — pass through
});

// ── Audio stream handler ───────────────────────────────────────────────────

async function handleAudioStream(request) {
  const url = request.url;

  // Check IndexedDB cache first
  const cached = await getAudioFromDB(url);
  if (cached?.blob) {
    console.log("[SW] Serving audio from cache:", url);
    return new Response(cached.blob, {
      status: 200,
      headers: {
        "Content-Type": cached.blob.type || "audio/mpeg",
        "X-SW-Cache": "hit",
      },
    });
  }

  // Not cached — fetch from network
  try {
    const response = await fetch(request);
    if (!response.ok) return response;

    // Clone and cache the audio blob in background
    const clone = response.clone();
    cacheAudioInBackground(url, clone);

    return response;
  } catch (err) {
    // Network failed and no cache — return offline error
    return new Response(
      JSON.stringify({ error: "offline", message: "No cached audio available" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function cacheAudioInBackground(url, response) {
  try {
    const blob = await response.blob();
    if (blob.size > 0) {
      await saveAudioToDB(url, blob, null);
      // Notify app that this song is now cached
      const allClients = await self.clients.matchAll();
      allClients.forEach((client) =>
        client.postMessage({ type: "AUDIO_CACHED", url })
      );
    }
  } catch (err) {
    // Silently fail — caching is best-effort
  }
}

// ── Thumbnail handler ──────────────────────────────────────────────────────

async function handleThumbnail(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(THUMB_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response("", { status: 404 });
  }
}

// ── Message handler — from app to SW ──────────────────────────────────────

self.addEventListener("message", async (e) => {
  const { type, data } = e.data || {};

  switch (type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    // App tells SW: "This song just played, cache it with metadata"
    case "CACHE_SONG": {
      const { url, song } = data || {};
      if (!url || !song) break;
      const existing = await getAudioFromDB(url);
      if (existing) {
        // Update metadata even if blob already cached
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put({ ...existing, ...song, url });
      }
      e.source?.postMessage({ type: "CACHE_SONG_ACK", url });
      break;
    }

    // App requests list of cached songs (for Downloads page)
    case "GET_CACHED_SONGS": {
      const songs = await getAllCachedSongs();
      e.source?.postMessage({ type: "CACHED_SONGS_LIST", songs });
      break;
    }

    // App requests deletion of a cached song
    case "DELETE_CACHED_SONG": {
      const { url } = data || {};
      if (url) await deleteCachedSong(url);
      e.source?.postMessage({ type: "DELETE_CACHED_SONG_ACK", url });
      break;
    }

    // App requests cache status for a URL
    case "CHECK_CACHED": {
      const { url } = data || {};
      const entry = url ? await getAudioFromDB(url) : null;
      e.source?.postMessage({
        type: "CHECK_CACHED_RESULT",
        url,
        cached: !!entry?.blob,
        meta: entry ? { title: entry.title, artist: entry.artist, timestamp: entry.timestamp } : null,
      });
      break;
    }
  }
});