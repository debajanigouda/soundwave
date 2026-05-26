import { useState } from "react";

function fmt(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function Player({
  currentSong, isPlaying, isBuffering, togglePlay, nextSong, prevSong,
  progress, duration, seekTo, volume, setVolume, isMuted, setIsMuted,
  isShuffle, setIsShuffle, isRepeat, setIsRepeat, likedSongs, toggleLike,
  songs, playSong, isMobile,
}) {
  const [showQueue, setShowQueue] = useState(false);

  if (isMobile) return null;

  const pct = duration ? (progress / duration) * 100 : 0;
  const liked = currentSong && likedSongs.has(currentSong.id);
  const currentIdx = songs.findIndex(s => s.id === currentSong?.id);
  const upNext = songs.slice(currentIdx + 1, currentIdx + 6);
  const played = songs.slice(Math.max(0, currentIdx - 5), currentIdx);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bar { from { transform: scaleY(1); } to { transform: scaleY(0.2); } }
        @keyframes playerGlow { 0%,100% { box-shadow: 0 -4px 30px rgba(29,185,84,0.08); } 50% { box-shadow: 0 -4px 30px rgba(29,185,84,0.18); } }
        @keyframes thumbPop { from { transform: translateY(-50%) scale(0); } to { transform: translateY(-50%) scale(1); } }
        .player-seek:hover .seek-fill { background: #1db954 !important; }
        .player-seek:hover .seek-thumb { opacity: 1 !important; animation: thumbPop 0.15s ease; }
        .player-seek { transition: height 0.15s ease; }
        .player-seek:hover { height: 6px !important; }
        .icon-btn { transition: all 0.15s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .icon-btn:hover { transform: scale(1.18) !important; }
        .icon-btn:active { transform: scale(0.92) !important; }
        .play-btn { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .play-btn:hover { transform: scale(1.1) !important; box-shadow: 0 0 0 8px rgba(255,255,255,0.1) !important; }
        .play-btn:active { transform: scale(0.95) !important; }
        .like-btn { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .like-btn:hover { transform: scale(1.25) !important; }
        .like-btn:active { transform: scale(0.85) !important; }
        .vol-bar:hover { height: 6px !important; }
        .queue-row { transition: all 0.15s ease !important; }
        .queue-row:hover { background: rgba(255,255,255,0.06) !important; padding-left: 8px !important; }
        .thumbnail-art { transition: all 0.3s ease !important; }
        .thumbnail-art:hover { transform: scale(1.05) !important; border-radius: 14px !important; }
      `}</style>

      {/* Queue panel */}
      {showQueue && (
        <div style={{
          position: "fixed", right: 0, bottom: 90, width: 340,
          background: "linear-gradient(180deg, #141420 0%, #0f0f1a 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          zIndex: 999, display: "flex", flexDirection: "column",
          maxHeight: "60vh", borderRadius: "16px 0 0 0",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.6)",
        }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Queue</div>
            <button onClick={() => setShowQueue(false)}
              style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#a0a0b8", cursor: "pointer", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#a0a0b8"; }}>
              ✕
            </button>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
            {currentSong && (
              <div style={{ padding: "8px 20px 4px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#1db954", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Now Playing</div>
                <QueueRow song={currentSong} active={true} isPlaying={isPlaying} playSong={playSong} />
              </div>
            )}
            {upNext.length > 0 && (
              <div style={{ padding: "12px 20px 4px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Up Next</div>
                {upNext.map(s => <QueueRow key={s.id} song={s} active={false} isPlaying={false} playSong={playSong} />)}
              </div>
            )}
            {played.length > 0 && (
              <div style={{ padding: "12px 20px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Previously Played</div>
                {[...played].reverse().map(s => <QueueRow key={s.id} song={s} active={false} isPlaying={false} playSong={playSong} dimmed />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player bar */}
      <footer style={{
        height: 88, background: "linear-gradient(180deg, #0d0d18 0%, #111118 100%)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center",
        padding: "0 24px", gap: 16, flexShrink: 0,
        animation: "playerGlow 4s ease infinite",
        position: "relative",
      }}>
        {/* Progress bar at very top of player */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #1db954, #1ed760)", transition: "width 1s linear", borderRadius: 2 }} />
        </div>

        {/* Left — song info */}
        <div style={{ width: 260, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          {currentSong ? (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={currentSong.thumbnail} alt={currentSong.title} className="thumbnail-art"
                style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover", display: "block",
                  boxShadow: isPlaying ? "0 0 0 2px #1db954, 0 4px 20px rgba(29,185,84,0.3)" : "0 4px 16px rgba(0,0,0,0.4)",
                  transition: "box-shadow 0.3s ease",
                }} />
              {isPlaying && (
                <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
                    {[6, 10, 7, 10, 6].map((h, i) => (
                      <div key={i} style={{ width: 2, height: h, background: "#1db954", borderRadius: 2, animation: `bar 0.7s ease-in-out ${i * 0.1}s infinite alternate`, transformOrigin: "bottom" }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: 54, height: 54, borderRadius: 10, background: "linear-gradient(135deg,#1a1a2e,#2a2a4e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>♪</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: currentSong ? "#fff" : "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>
              {currentSong ? currentSong.title : "No song playing"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentSong ? currentSong.artist : "—"}
            </div>
          </div>
          <button className="like-btn" onClick={() => currentSong && toggleLike(currentSong.id)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: liked ? "#1db954" : "#6b7280", display: "flex", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* Center — controls */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxWidth: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IconBtn onClick={() => setIsShuffle(s => !s)} active={isShuffle} title="Shuffle">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
              </svg>
            </IconBtn>
            <IconBtn onClick={prevSong} title="Previous">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </IconBtn>
            <button className="play-btn" onClick={togglePlay}
              style={{ width: 42, height: 42, borderRadius: "50%", background: "#fff", color: "#000", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 16px rgba(255,255,255,0.15)" }}>
              {isBuffering
                ? <div style={{ width: 18, height: 18, border: "2.5px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                : isPlaying
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <IconBtn onClick={nextSong} title="Next">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </IconBtn>
            <IconBtn onClick={() => setIsRepeat(r => !r)} active={isRepeat} title="Repeat">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </IconBtn>
          </div>

          {/* Seek bar */}
          <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 36, flexShrink: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(progress)}</span>
            <div className="player-seek"
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - r.left) / r.width); }}
              style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4, cursor: "pointer", position: "relative" }}>
              <div className="seek-fill" style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 4, position: "relative", transition: "width 1s linear" }}>
                <div className="seek-thumb" style={{ position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, background: "#fff", borderRadius: "50%", opacity: 0, boxShadow: "0 0 8px rgba(255,255,255,0.6)" }} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: "#6b7280", width: 36, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* Right — volume + queue */}
        <div style={{ width: 210, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          {isPlaying && currentSong && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16, marginRight: 4 }}>
              {[7, 13, 9, 15, 7].map((h, i) => (
                <div key={i} style={{ width: 3, height: h, background: "#1db954", borderRadius: 2, animation: `bar 0.8s ease-in-out ${i * 0.12}s infinite alternate` }} />
              ))}
            </div>
          )}

          <IconBtn onClick={() => setShowQueue(q => !q)} active={showQueue} title="Queue">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </IconBtn>

          <button onClick={() => setIsMuted(m => !m)} className="icon-btn"
            style={{ background: "none", border: "none", cursor: "pointer", color: isMuted ? "#ff6b6b" : "#6b7280", display: "flex", padding: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => e.currentTarget.style.color = isMuted ? "#ff6b6b" : "#6b7280"}>
            {isMuted
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
          </button>

          <div className="vol-bar"
            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); setIsMuted(false); }}
            style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4, cursor: "pointer", maxWidth: 90, transition: "height 0.15s ease", position: "relative" }}>
            <div style={{ width: `${isMuted ? 0 : volume * 100}%`, height: "100%", background: "linear-gradient(90deg, #6b7280, #fff)", borderRadius: 4, transition: "width 0.1s" }} />
          </div>
        </div>
      </footer>
    </>
  );
}

function QueueRow({ song, active, isPlaying, playSong, dimmed }) {
  return (
    <div className="queue-row" onClick={() => playSong(song)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer", borderRadius: 10, opacity: dimmed ? 0.4 : 1 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <img src={song.thumbnail} alt={song.title}
          style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", display: "block", border: active ? "2px solid #1db954" : "2px solid transparent", transition: "border 0.2s" }} />
        {active && isPlaying && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 12 }}>
              {[5, 9, 6].map((h, i) => (
                <div key={i} style={{ width: 2, height: h, background: "#1db954", borderRadius: 2, animation: `bar 0.8s ease-in-out ${i * 0.15}s infinite alternate`, transformOrigin: "bottom" }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#1db954" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artist}</div>
      </div>
    </div>
  );
}

function IconBtn({ onClick, active, title, children }) {
  return (
    <button className="icon-btn" onClick={onClick} title={title}
      style={{ width: 36, height: 36, borderRadius: "50%", background: active ? "rgba(29,185,84,0.12)" : "none", border: "none", color: active ? "#1db954" : "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={e => { e.currentTarget.style.color = active ? "#1db954" : "#fff"; e.currentTarget.style.background = active ? "rgba(29,185,84,0.2)" : "rgba(255,255,255,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = active ? "#1db954" : "#6b7280"; e.currentTarget.style.background = active ? "rgba(29,185,84,0.12)" : "none"; }}>
      {children}
    </button>
  );
}