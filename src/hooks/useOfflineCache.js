// src/hooks/useOfflineCache.js
// Drop this file into src/hooks/useOfflineCache.js
// Then import it in App.jsx:  import useOfflineCache from "./hooks/useOfflineCache";
// And use it:  const { cachedSongs, isCached, deleteCachedSong } = useOfflineCache(currentSong, isPlaying);

import { useState, useEffect, useCallback, useRef } from "react";

export default function useOfflineCache(currentSong, isPlaying) {
  const [cachedSongs, setCachedSongs] = useState([]);
  const [cachedUrls, setCachedUrls] = useState(new Set());
  const [swReady, setSwReady] = useState(false);
  const swRef = useRef(null);

  // ── Register SW message listener ──────────────────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function onMessage(e) {
      const { type, songs, url } = e.data || {};

      if (type === "CACHED_SONGS_LIST") {
        setCachedSongs(songs || []);
        setCachedUrls(new Set((songs || []).map((s) => s.url)));
      }

      if (type === "AUDIO_CACHED") {
        // A new song just got cached in the background — refresh list
        refreshCachedList();
        setCachedUrls((prev) => new Set([...prev, url]));
      }

      if (type === "DELETE_CACHED_SONG_ACK") {
        setCachedUrls((prev) => {
          const next = new Set(prev);
          next.delete(url);
          return next;
        });
        refreshCachedList();
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);

    // Wait for SW to be active
    navigator.serviceWorker.ready.then((reg) => {
      swRef.current = reg.active;
      setSwReady(true);
      refreshCachedList();
    });

    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  // ── Refresh cached songs list from SW ─────────────────────────────────
  const refreshCachedList = useCallback(() => {
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: "GET_CACHED_SONGS" });
  }, []);

  // ── When a song plays, tell SW to tag it with metadata ────────────────
  useEffect(() => {
    if (!currentSong || !isPlaying || !navigator.serviceWorker.controller) return;

    // Build the stream URL the same way your backend does
    // Adjust this pattern to match your actual /api/stream/ URL format
    const streamUrl = `${import.meta.env.VITE_API_URL || "https://soundwave-server.onrender.com"}/api/stream/${currentSong.youtubeId}`;

    navigator.serviceWorker.controller.postMessage({
      type: "CACHE_SONG",
      data: {
        url: streamUrl,
        song: {
          title: currentSong.title,
          artist: currentSong.artist,
          thumbnail: currentSong.thumbnail,
          youtubeId: currentSong.youtubeId,
        },
      },
    });
  }, [currentSong?.youtubeId, isPlaying]);

  // ── Check if a specific song is cached ───────────────────────────────
  const isCached = useCallback(
    (youtubeId) => {
      if (!youtubeId) return false;
      return [...cachedUrls].some((url) => url.includes(youtubeId));
    },
    [cachedUrls]
  );

  // ── Delete a cached song ──────────────────────────────────────────────
  const deleteCachedSong = useCallback((url) => {
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({
      type: "DELETE_CACHED_SONG",
      data: { url },
    });
  }, []);

  // ── Manually trigger caching for a song (e.g. Download button) ───────
  const cacheSong = useCallback(async (song) => {
    if (!song?.youtubeId) return false;
    const streamUrl = `${import.meta.env.VITE_API_URL || "https://soundwave-server.onrender.com"}/api/stream/${song.youtubeId}`;

    try {
      // Fetch the audio — SW will intercept and cache it automatically
      const res = await fetch(streamUrl);
      if (res.ok) {
        // Tag with metadata
        navigator.serviceWorker.controller?.postMessage({
          type: "CACHE_SONG",
          data: {
            url: streamUrl,
            song: { title: song.title, artist: song.artist, thumbnail: song.thumbnail, youtubeId: song.youtubeId },
          },
        });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }, []);

  return {
    cachedSongs,     // Array of cached song objects with metadata — use on Downloads page
    cachedUrls,      // Set of cached stream URLs
    isCached,        // (youtubeId) => boolean — show download icon state
    deleteCachedSong,// (url) => void — remove from cache
    cacheSong,       // (song) => Promise<boolean> — manually cache a song
    swReady,         // boolean — SW is active and ready
    refreshCachedList,
  };
}