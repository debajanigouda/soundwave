// src/hooks/useOfflineCache.js
import { useState, useEffect, useCallback } from "react";

const DB_NAME = "soundwave-audio";
const STORE = "streams";
const MAX = 20;

function openDB() {
  return new Promise((resolve, reject) => {
const req = indexedDB.open(DB_NAME, 2);    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "youtubeId" });
        s.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveSong(song) {
  const db = await openDB();
  // Enforce max limit — delete oldest if needed
  const all = await new Promise((res) => {
    const tx = db.transaction(STORE, "readonly");
    tx.objectStore(STORE).index("timestamp").getAll().onsuccess = (e) => res(e.target.result || []);
  });
  if (all.length >= MAX) {
    all.sort((a, b) => a.timestamp - b.timestamp);
    const delTx = db.transaction(STORE, "readwrite");
    all.slice(0, all.length - MAX + 1).forEach((s) =>
      delTx.objectStore(STORE).delete(s.youtubeId)
    );
  }
  return new Promise((res) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...song, timestamp: Date.now() });
    tx.oncomplete = () => res(true);
    tx.onerror = () => res(false);
  });
}

async function getAllSongs() {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction(STORE, "readonly");
    tx.objectStore(STORE).index("timestamp").getAll().onsuccess = (e) =>
      res((e.target.result || []).sort((a, b) => b.timestamp - a.timestamp));
  });
}

async function removeSong(youtubeId) {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(youtubeId);
    tx.oncomplete = () => res(true);
  });
}

export default function useOfflineCache(currentSong, isPlaying) {
  const [cachedSongs, setCachedSongs] = useState([]);
  const [cachedIds, setCachedIds] = useState(new Set());

  // Load cached songs on mount
  useEffect(() => {
    getAllSongs().then((songs) => {
      setCachedSongs(songs);
      setCachedIds(new Set(songs.map((s) => s.youtubeId)));
    });
  }, []);

  // Auto-save song metadata when it plays for 30 seconds
  useEffect(() => {
    if (!currentSong || !isPlaying) return;
    const timer = setTimeout(async () => {
      await saveSong({
        youtubeId: currentSong.youtubeId,
        title: currentSong.title,
        artist: currentSong.artist,
        thumbnail: currentSong.thumbnail,
        id: currentSong.id,
      });
      setCachedSongs(await getAllSongs());
      setCachedIds((prev) => new Set([...prev, currentSong.youtubeId]));
    }, 5000); // Save after 30 seconds of playing
    return () => clearTimeout(timer);
  }, [currentSong?.youtubeId, isPlaying]);

  const isCached = useCallback(
    (youtubeId) => cachedIds.has(youtubeId),
    [cachedIds]
  );

  const deleteCachedSong = useCallback(async (youtubeId) => {
    await removeSong(youtubeId);
    setCachedSongs(await getAllSongs());
    setCachedIds((prev) => {
      const next = new Set(prev);
      next.delete(youtubeId);
      return next;
    });
  }, []);

  return { cachedSongs, isCached, deleteCachedSong };
}