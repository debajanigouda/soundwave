const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:3001/api";

// Wake up Render server silently on app load
export async function wakeServer() {
  try {
    await fetch(`${BASE}/trending`);
  } catch {}
}

export async function searchSongs(query) {
  try {
    const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.success ? data.songs : [];
  } catch (err) {
    console.error("Search error:", err);
    return [];
  }
}

export async function getTrending(onWaking) {
  // First try — fast
  try {
    const res = await fetch(`${BASE}/trending`);
    const data = await res.json();
    if (data.success) return data.songs;
  } catch {}

  // Server sleeping — notify user and retry for up to 60 seconds
  if (onWaking) onWaking(true);
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 10000)); // wait 10s
    try {
      const res = await fetch(`${BASE}/trending`);
      const data = await res.json();
      if (data.success) {
        if (onWaking) onWaking(false);
        return data.songs;
      }
    } catch {}
  }
  if (onWaking) onWaking(false);
  return [];
}

export function getStreamUrl(youtubeId) {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export function prefetchSongs(songs) {
  songs.forEach(s => {
    fetch(`${BASE}/prefetch/${s.youtubeId}`).catch(() => {});
  });
}