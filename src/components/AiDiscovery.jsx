import { useState } from "react";
import { searchSongs } from "../api";

const VIBE_SUGGESTIONS = [
  "3am vibes", "gym workout", "sunday morning chill",
  "heartbreak", "road trip", "rainy day",
  "party mode", "focus & study", "happy mood",
  "bollywood romantic", "90s nostalgia", "late night drive",
];

async function askClaude(vibe) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a music expert. A user wants to listen to music matching this vibe or mood: "${vibe}"

Generate exactly 6 specific song search queries for YouTube Music that perfectly match this vibe.
Each query should be a real song title + artist name that fits the mood.
Mix popular and lesser-known tracks. Include both English and Hindi/Indian songs if the vibe suits it.

Respond ONLY with a JSON array of 6 strings, no explanation, no markdown, no backticks.
Example format: ["Blinding Lights The Weeknd","Tum Hi Ho Arijit Singh","Night Owl Galimatias","Raataan Lambiyan Jubin Nautiyal","Midnight Rain Taylor Swift","Khairiyat Arijit Singh"]`
      }],
    }),
  });
  const data = await response.json();
  const text = data.content?.[0]?.text || "[]";
  try {
    return JSON.parse(text.trim());
  } catch {
    // fallback: extract anything in quotes
    const matches = text.match(/"([^"]+)"/g);
    return matches ? matches.map(m => m.replace(/"/g, "")) : [];
  }
}

export default function AiDiscovery({ playSong, currentSong, isPlaying, likedSongs, toggleLike, darkMode, isMobile, handleAddToPlaylist }) {
  const [vibe, setVibe] = useState("");
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState([]);
  const [currentVibe, setCurrentVibe] = useState("");
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState("");

  async function discover(inputVibe) {
    const query = (inputVibe || vibe).trim();
    if (!query) return;
    setLoading(true);
    setSongs([]);
    setError("");
    setCurrentVibe(query);

    try {
      // Step 1: Ask Claude for song suggestions
      setLoadingStep("🤖 Understanding your vibe...");
      const queries = await askClaude(query);

      if (!queries.length) {
        setError("Couldn't understand that vibe. Try something like '3am vibes' or 'gym workout'.");
        setLoading(false);
        return;
      }

      // Step 2: Search for each song
      setLoadingStep("🎵 Finding songs for you...");
      const results = await Promise.all(
        queries.slice(0, 6).map(q => searchSongs(q).then(r => r[0]).catch(() => null))
      );

      const found = results.filter(Boolean);

      // Remove duplicates by youtubeId
      const unique = found.filter((s, i, arr) => arr.findIndex(x => x.youtubeId === s.youtubeId) === i);

      if (!unique.length) {
        setError("No songs found for that vibe. Try a different description.");
      } else {
        setSongs(unique);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
    setLoadingStep("");
  }

  function handleKey(e) {
    if (e.key === "Enter") discover();
  }

  const card = darkMode ? "#1a1a28" : "#fff";
  const border = darkMode ? "#2a2a3e" : "#e0e0ee";
  const text = darkMode ? "#fff" : "#111";
  const sub = darkMode ? "#6b7280" : "#888";

  return (
    <div style={{ marginBottom: 40 }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, #6c63ff, #ff6b9d)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>🤖</div>
          <div style={{ fontSize: isMobile ? 17 : 19, fontWeight: 700, color: text }}>AI Music Discovery</div>
        </div>
        <div style={{ fontSize: 13, color: sub, paddingLeft: 42 }}>
          Describe a vibe, mood, or moment — Claude will build a playlist for you
        </div>
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        background: card, border: `1px solid ${border}`,
        borderRadius: 16, padding: "6px 6px 6px 16px",
        boxShadow: darkMode ? "0 4px 24px rgba(108,99,255,0.08)" : "0 2px 12px rgba(0,0,0,0.06)",
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>✨</span>
        <input
          value={vibe}
          onChange={e => setVibe(e.target.value)}
          onKeyDown={handleKey}
          placeholder='Try "3am vibes", "gym workout", "rainy day chill"...'
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: text, fontSize: isMobile ? 14 : 15, fontFamily: "inherit",
            minWidth: 0,
          }}
        />
        <button
          onClick={() => discover()}
          disabled={loading || !vibe.trim()}
          style={{
            padding: isMobile ? "10px 16px" : "10px 22px",
            borderRadius: 12, border: "none", cursor: loading || !vibe.trim() ? "not-allowed" : "pointer",
            background: loading || !vibe.trim() ? "#2a2a3e" : "linear-gradient(135deg, #6c63ff, #ff6b9d)",
            color: loading || !vibe.trim() ? "#6b7280" : "#fff",
            fontSize: 14, fontWeight: 700, fontFamily: "inherit",
            transition: "all 0.2s", flexShrink: 0,
            whiteSpace: "nowrap",
          }}>
          {loading ? "..." : "Play ▶"}
        </button>
      </div>

      {/* Suggestion chips */}
      {!songs.length && !loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {VIBE_SUGGESTIONS.map(s => (
            <button key={s} onClick={() => { setVibe(s); discover(s); }}
              style={{
                padding: "6px 14px", borderRadius: 100,
                background: darkMode ? "#1a1a28" : "#f0f0ff",
                border: `1px solid ${darkMode ? "#2a2a3e" : "#d0d0ee"}`,
                color: darkMode ? "#a0a0c8" : "#555",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,99,255,0.15)"; e.currentTarget.style.color = "#6c63ff"; e.currentTarget.style.borderColor = "#6c63ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = darkMode ? "#1a1a28" : "#f0f0ff"; e.currentTarget.style.color = darkMode ? "#a0a0c8" : "#555"; e.currentTarget.style.borderColor = darkMode ? "#2a2a3e" : "#d0d0ee"; }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          background: card, border: `1px solid ${border}`,
          borderRadius: 16, padding: "28px 24px", textAlign: "center",
        }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: 4, height: 20, borderRadius: 2,
                background: "linear-gradient(135deg, #6c63ff, #ff6b9d)",
                animation: `aiBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                transformOrigin: "bottom",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 14, color: sub }}>{loadingStep}</div>
          <div style={{ fontSize: 12, color: darkMode ? "#3a3a5e" : "#ccc", marginTop: 6 }}>
            Building your "{currentVibe}" playlist
          </div>
          <style>{`@keyframes aiBar { from{transform:scaleY(0.3)} to{transform:scaleY(1)} }`}</style>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{
          background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)",
          borderRadius: 14, padding: "14px 18px", color: "#ff6b6b", fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {songs.length > 0 && !loading && (
        <div>
          {/* Playlist header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: text }}>
                ✨ "{currentVibe}"
                <span style={{ fontSize: 12, fontWeight: 400, color: sub, marginLeft: 8 }}>
                  {songs.length} songs • AI generated
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => playSong(songs[0])}
                style={{
                  padding: "8px 16px", borderRadius: 100,
                  background: "#1db954", border: "none",
                  color: "#000", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                ▶ Play all
              </button>
              <button
                onClick={() => { setSongs([]); setCurrentVibe(""); setVibe(""); }}
                style={{
                  padding: "8px 14px", borderRadius: 100,
                  background: "none", border: `1px solid ${border}`,
                  color: sub, fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                ✕ Clear
              </button>
            </div>
          </div>

          {/* Song list */}
          <div style={{
            background: card, border: `1px solid ${border}`,
            borderRadius: 16, overflow: "hidden",
          }}>
            {songs.map((song, i) => {
              const active = currentSong?.id === song.id;
              const liked = likedSongs?.has(song.id);
              return (
                <div key={song.id}
                  onClick={() => playSong(song)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: isMobile ? "10px 14px" : "10px 16px",
                    cursor: "pointer",
                    background: active ? (darkMode ? "rgba(29,185,84,0.08)" : "rgba(29,185,84,0.06)") : "none",
                    borderBottom: i < songs.length - 1 ? `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "#f0f0f0"}` : "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.04)" : "#fafafa"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; }}>

                  {/* Index / playing indicator */}
                  <div style={{ width: 22, textAlign: "center", flexShrink: 0 }}>
                    {active && isPlaying
                      ? <span style={{ color: "#1db954", fontSize: 14 }}>▶</span>
                      : <span style={{ color: sub, fontSize: 12 }}>{i + 1}</span>
                    }
                  </div>

                  {/* Thumbnail */}
                  <img src={song.thumbnail} alt={song.title}
                    style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", flexShrink: 0,
                      border: active ? "2px solid #1db954" : "2px solid transparent",
                    }} />

                  {/* Title + artist */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: active ? 600 : 400,
                      color: active ? "#1db954" : text,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{song.title}</div>
                    <div style={{ fontSize: 12, color: sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {song.artist}
                    </div>
                  </div>

                  {/* Like button */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleLike(song.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: liked ? "#1db954" : sub, flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>

                  {/* Add to playlist */}
                  {handleAddToPlaylist && (
                    <button
                      onClick={e => { e.stopPropagation(); handleAddToPlaylist(song); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: sub, flexShrink: 0, fontSize: 18, lineHeight: 1 }}>
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Try another vibe */}
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, color: sub, alignSelf: "center" }}>Try also:</span>
            {VIBE_SUGGESTIONS.filter(s => s !== currentVibe).slice(0, 4).map(s => (
              <button key={s} onClick={() => { setVibe(s); discover(s); }}
                style={{
                  padding: "5px 12px", borderRadius: 100,
                  background: "none", border: `1px solid ${border}`,
                  color: sub, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}