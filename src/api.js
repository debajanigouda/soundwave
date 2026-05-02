const BASE = "http://localhost:3001/api";

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

export async function getTrending() {
  try {
    const res = await fetch(`${BASE}/trending`);
    const data = await res.json();
    return data.success ? data.songs : [];
  } catch (err) {
    console.error("Trending error:", err);
    return [];
  }
}

export function getStreamUrl(youtubeId) {
  return `${BASE}/stream/${youtubeId}`;
}

// Pre-fetch next songs so they're instant when clicked
export function prefetchSongs(songs) {
  songs.forEach(s => {
    fetch(`${BASE}/prefetch/${s.youtubeId}`).catch(() => {});
  });
}