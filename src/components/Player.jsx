const GRAD = "linear-gradient(135deg,#6c63ff,#ff6b9d)";

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function Player({
  currentSong, isPlaying, isBuffering, togglePlay, nextSong, prevSong,
  progress, duration, seekTo, volume, setVolume, isMuted, setIsMuted,
  isShuffle, setIsShuffle, isRepeat, setIsRepeat, likedSongs, toggleLike, isMobile
}) {
  const pct = duration ? (progress / duration) * 100 : 0;

  // ── MOBILE PLAYER ──────────────────────────────────────
  if (isMobile) {
    return (
      <footer style={{
        background: "#12121a",
        borderTop: "1px solid #2a2a45",
        flexShrink: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)"
      }}>
        {/* Progress bar at very top */}
        <div
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - r.left) / r.width);
          }}
          style={{ width: "100%", height: 3, background: "#222236", cursor: "pointer" }}
        >
          <div style={{ width: `${pct}%`, height: "100%", background: GRAD }} />
        </div>

        {/* Main row */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "10px 16px", gap: 10
        }}>
          {/* Thumbnail */}
          {currentSong ? (
            <img src={currentSong.thumbnail} alt={currentSong.title}
              style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 42, height: 42, borderRadius: 8, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>♪</div>
          )}

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: currentSong ? "#f0f0ff" : "#606080" }}>
              {currentSong ? currentSong.title : "Select a song"}
            </div>
            <div style={{ fontSize: 11, color: "#606080", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentSong ? currentSong.artist : "—"}
            </div>
          </div>

          {/* Like button */}
          <button
            onClick={() => currentSong && toggleLike(currentSong.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: currentSong && likedSongs.has(currentSong.id) ? "#ff6b9d" : "#606080", display: "flex", padding: 6, flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={currentSong && likedSongs.has(currentSong.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Prev */}
          <button onClick={prevSong}
            style={{ background: "none", border: "none", color: "#a0a0c0", cursor: "pointer", display: "flex", padding: 6, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </button>

          {/* Play/Pause */}
          <button onClick={togglePlay}
            style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0f0ff", color: "#0a0a0f", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isBuffering
              ? <div style={{ width: 20, height: 20, border: "2px solid #0a0a0f", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              : isPlaying
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </button>

          {/* Next */}
          <button onClick={nextSong}
            style={{ background: "none", border: "none", color: "#a0a0c0", cursor: "pointer", display: "flex", padding: 6, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </footer>
    );
  }

  // ── DESKTOP PLAYER ─────────────────────────────────────
  return (
    <footer style={{
      background: "#12121a",
      borderTop: "1px solid #2a2a45",
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      gap: 16,
      height: 88,
      flexShrink: 0
    }}>

      {/* Left — Song Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: 260, flexShrink: 0 }}>
        {currentSong ? (
          <img src={currentSong.thumbnail} alt={currentSong.title}
            style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 54, height: 54, borderRadius: 10, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>♪</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: currentSong ? "#f0f0ff" : "#606080" }}>
            {currentSong ? currentSong.title : "Select a song"}
          </div>
          <div style={{ fontSize: 12, color: "#606080" }}>
            {currentSong ? currentSong.artist : "—"}
          </div>
        </div>
        <button onClick={() => currentSong && toggleLike(currentSong.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: currentSong && likedSongs.has(currentSong.id) ? "#ff6b9d" : "#606080", display: "flex", padding: 4, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={currentSong && likedSongs.has(currentSong.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Center — Controls + Progress */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxWidth: 600 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CtrlBtn onClick={() => setIsShuffle(s => !s)} active={isShuffle} title="Shuffle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /></svg>
          </CtrlBtn>
          <CtrlBtn onClick={prevSong} title="Previous">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </CtrlBtn>
          <button onClick={togglePlay}
            style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0f0ff", color: "#0a0a0f", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s", flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            {isBuffering
              ? <div style={{ width: 20, height: 20, border: "2px solid #0a0a0f", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              : isPlaying
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <CtrlBtn onClick={nextSong} title="Next">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </CtrlBtn>
          <CtrlBtn onClick={() => setIsRepeat(r => !r)} active={isRepeat} title="Repeat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
          </CtrlBtn>
        </div>

        {/* Progress */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#606080", width: 32, flexShrink: 0 }}>{formatTime(progress)}</span>
          <div
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - r.left) / r.width); }}
            style={{ flex: 1, height: 4, background: "#222236", borderRadius: 4, cursor: "pointer", position: "relative" }}
            onMouseEnter={e => e.currentTarget.querySelector(".thumb").style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.querySelector(".thumb").style.opacity = "0"}
          >
            <div style={{ width: `${pct}%`, height: "100%", background: GRAD, borderRadius: 4, position: "relative" }}>
              <div className="thumb" style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, background: "#fff", borderRadius: "50%", opacity: 0, transition: "opacity .2s" }} />
            </div>
          </div>
          <span style={{ fontSize: 11, color: "#606080", width: 32, flexShrink: 0, textAlign: "right" }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right — Volume */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 180, justifyContent: "flex-end", flexShrink: 0 }}>
        {isPlaying && currentSong && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 20, marginRight: 4 }}>
            {[8, 16, 12, 18, 10].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, background: "#6c63ff", borderRadius: 2, animation: `wave 0.8s ease-in-out ${i * 0.1}s infinite alternate` }} />
            ))}
          </div>
        )}
        <button onClick={() => setIsMuted(m => !m)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#a0a0c0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isMuted
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>}
        </button>
        <div
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); setIsMuted(false); }}
          style={{ width: 80, height: 4, background: "#222236", borderRadius: 4, cursor: "pointer" }}>
          <div style={{ width: `${isMuted ? 0 : volume * 100}%`, height: "100%", background: "#a0a0c0", borderRadius: 4 }} />
        </div>
      </div>

      <style>{`
        @keyframes wave { from { transform: scaleY(1); } to { transform: scaleY(0.3); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </footer>
  );
}

function CtrlBtn({ onClick, active, title, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "none", color: active ? "#6c63ff" : "#a0a0c0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}
      onMouseEnter={e => { e.currentTarget.style.color = "#f0f0ff"; e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = active ? "#6c63ff" : "#a0a0c0"; e.currentTarget.style.transform = "scale(1)"; }}>
      {children}
    </button>
  );
}
