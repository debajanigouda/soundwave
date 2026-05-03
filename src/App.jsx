const GRAD = "linear-gradient(135deg,#6c63ff,#ff6b9d)";

function fmt(s) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
}

export default function Player({ currentSong, isPlaying, isBuffering, togglePlay, nextSong, prevSong, progress, duration, seekTo, volume, setVolume, isMuted, setIsMuted, isShuffle, setIsShuffle, isRepeat, setIsRepeat, likedSongs, toggleLike, isMobile }) {
  const pct = duration ? (progress / duration) * 100 : 0;
  const liked = currentSong && likedSongs.has(currentSong.id);

  const PlayBtn = () => (
    <button onClick={togglePlay} style={{ width: isMobile?40:44, height: isMobile?40:44, borderRadius: "50%", background: "#f0f0ff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {isBuffering
        ? <div style={{ width: 18, height: 18, border: "2px solid #0a0a0f", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }}/>
        : isPlaying
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0a0f"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0a0f"><path d="M8 5v14l11-7z"/></svg>}
    </button>
  );

  // ── MOBILE PLAYER ─────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: "#12121a", borderTop: "1px solid #2a2a45", flexShrink: 0 }}>
        {/* Progress */}
        <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX-r.left)/r.width); }}
          style={{ width: "100%", height: 3, background: "#222236", cursor: "pointer" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: GRAD }}/>
        </div>
        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", gap: 8 }}>
          {currentSong
            ? <img src={currentSong.thumbnail} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}/>
            : <div style={{ width: 42, height: 42, borderRadius: 8, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>♪</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: currentSong?"#f0f0ff":"#606080", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentSong ? currentSong.title : "Select a song"}
            </div>
            <div style={{ fontSize: 11, color: "#606080", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentSong ? currentSong.artist : "—"}
            </div>
          </div>
          <button onClick={() => currentSong && toggleLike(currentSong.id)} style={{ background: "none", border: "none", cursor: "pointer", color: liked?"#ff6b9d":"#606080", padding: 4, flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={liked?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button onClick={prevSong} style={{ background: "none", border: "none", cursor: "pointer", color: "#a0a0c0", padding: 4, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </button>
          <PlayBtn/>
          <button onClick={nextSong} style={{ background: "none", border: "none", cursor: "pointer", color: "#a0a0c0", padding: 4, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── DESKTOP PLAYER ────────────────────────────────────
  return (
    <footer style={{ background: "#12121a", borderTop: "1px solid #2a2a45", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0, height: 100 }}>
      {/* Left - Song Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: 260, flexShrink: 0 }}>
        {currentSong
          ? <img src={currentSong.thumbnail} alt="" style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}/>
          : <div style={{ width: 54, height: 54, borderRadius: 10, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>♪</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: currentSong?"#f0f0ff":"#606080" }}>
            {currentSong ? currentSong.title : "Select a song"}
          </div>
          <div style={{ fontSize: 12, color: "#606080" }}>{currentSong ? currentSong.artist : "—"}</div>
        </div>
        <button onClick={() => currentSong && toggleLike(currentSong.id)} style={{ background: "none", border: "none", cursor: "pointer", color: liked?"#ff6b9d":"#606080", padding: 4, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>

      {/* Center - Controls */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxWidth: 600 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Ctrl onClick={() => setIsShuffle(s=>!s)} active={isShuffle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
          </Ctrl>
          <Ctrl onClick={prevSong}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </Ctrl>
          <PlayBtn/>
          <Ctrl onClick={nextSong}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </Ctrl>
          <Ctrl onClick={() => setIsRepeat(r=>!r)} active={isRepeat}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </Ctrl>
        </div>
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#606080", width: 32, flexShrink: 0 }}>{fmt(progress)}</span>
          <div onClick={e => { const r=e.currentTarget.getBoundingClientRect(); seekTo((e.clientX-r.left)/r.width); }}
            style={{ flex: 1, height: 4, background: "#222236", borderRadius: 4, cursor: "pointer", position: "relative" }}
            onMouseEnter={e=>e.currentTarget.querySelector(".dot").style.opacity="1"}
            onMouseLeave={e=>e.currentTarget.querySelector(".dot").style.opacity="0"}>
            <div style={{ width: `${pct}%`, height: "100%", background: GRAD, borderRadius: 4, position: "relative" }}>
              <div className="dot" style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, background: "#fff", borderRadius: "50%", opacity: 0, transition: "opacity .2s" }}/>
            </div>
          </div>
          <span style={{ fontSize: 11, color: "#606080", width: 32, textAlign: "right", flexShrink: 0 }}>{fmt(duration)}</span>
        </div>
      </div>

      {/* Right - Volume */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 180, justifyContent: "flex-end", flexShrink: 0 }}>
        {isPlaying && currentSong && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 20 }}>
            {[8,16,12,18,10].map((h,i) => <div key={i} style={{ width: 3, height: h, background: "#6c63ff", borderRadius: 2, animation: `wave .8s ease-in-out ${i*.1}s infinite alternate` }}/>)}
          </div>
        )}
        <button onClick={() => setIsMuted(m=>!m)} style={{ background: "none", border: "none", cursor: "pointer", color: "#a0a0c0", display: "flex" }}>
          {isMuted
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
        </button>
        <div onClick={e => { const r=e.currentTarget.getBoundingClientRect(); setVolume(Math.min(1,Math.max(0,(e.clientX-r.left)/r.width))); setIsMuted(false); }}
          style={{ width: 80, height: 4, background: "#222236", borderRadius: 4, cursor: "pointer" }}>
          <div style={{ width: `${isMuted?0:volume*100}%`, height: "100%", background: "#a0a0c0", borderRadius: 4 }}/>
        </div>
      </div>
      <style>{`@keyframes wave{from{transform:scaleY(1)}to{transform:scaleY(.3)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </footer>
  );
}

function Ctrl({ onClick, active, children }) {
  return (
    <button onClick={onClick} style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "none", color: active?"#6c63ff":"#a0a0c0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </button>
  );
}