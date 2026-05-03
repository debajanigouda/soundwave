const GRAD = "linear-gradient(135deg,#6c63ff,#ff6b9d)";

export default function MainContent({ currentPage, searchQuery, handleSearch, songs, likedSongs, currentSong, isPlaying, isLoading, playSong, toggleLike, isShuffle, setIsShuffle, isRepeat, setIsRepeat, playlists, genres, loadTrending, handleGenreSearch }) {

  const likedList = songs.filter(s => likedSongs.has(s.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "#0a0a0f" }}>
      {/* Header */}
      <div style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #2a2a45", background: "#0a0a0f", flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#1a1a28", border: "1px solid #2a2a45", borderRadius: 14, padding: "0 16px", height: 44 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606080" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={searchQuery} onChange={e => handleSearch(e.target.value)}
            placeholder="Search any song, artist, album worldwide..."
            style={{ background: "none", border: "none", outline: "none", color: "#f0f0ff", fontSize: 14, fontFamily: "inherit", width: "100%" }}/>
          {searchQuery && (
            <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", color: "#606080", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
          )}
        </div>
        <IconToggle active={isShuffle} onClick={() => setIsShuffle(s => !s)} title="Shuffle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
        </IconToggle>
        <IconToggle active={isRepeat} onClick={() => setIsRepeat(r => !r)} title="Repeat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </IconToggle>
      </div>

      {/* Pages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {currentPage === "home"      && <HomePage songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} genres={genres} handleGenreSearch={handleGenreSearch} loadTrending={loadTrending}/>}
        {currentPage === "search"    && <SongList songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} title={searchQuery ? `Results for "${searchQuery}"` : "Trending"} />}
        {currentPage === "library"   && <LibraryPage playlists={playlists} songs={songs} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>}
        {currentPage === "liked"     && <LikedPage songs={songs} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>}
        {currentPage === "downloads" && <Empty emoji="⬇️" text="Downloads" sub="Coming soon in Phase 5!"/>}
      </div>
    </div>
  );
}

/* ── Pages ── */

function HomePage({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, genres, handleGenreSearch, loadTrending }) {
  return (
    <>
      {/* Banner */}
      <div style={{ borderRadius: 20, background: "linear-gradient(135deg,#1a1040,#0d2030)", padding: 32, marginBottom: 36, position: "relative", overflow: "hidden", height: 200, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: GRAD, opacity: .15 }}/>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6c63ff", fontWeight: 700, marginBottom: 8 }}>🔥 Live from YouTube</div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 30, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>Every Song.<br/>Worldwide. Free.</div>
          <div style={{ fontSize: 13, color: "#a0a0c0", marginBottom: 18 }}>No ads · No limits · Background play</div>
          <button onClick={() => songs.length && playSong(songs[0])}
            style={{ background: GRAD, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ▶ Play Trending
          </button>
        </div>
      </div>

      {/* Genres */}
      <SectionHeader title="Browse by Genre"/>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
        {genres.map(g => (
          <button key={g.label} onClick={() => handleGenreSearch(g.query)}
            style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid #2a2a45", background: "#16162a", color: "#a0a0c0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#6c63ff"; e.currentTarget.style.color = "#6c63ff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a45"; e.currentTarget.style.color = "#a0a0c0"; }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Trending */}
      <SectionHeader title="🔥 Trending Now" right={<button onClick={loadTrending} style={{ background: "none", border: "none", color: "#6c63ff", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>Refresh ↺</button>}/>
      <SongList songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>
    </>
  );
}

function LibraryPage({ playlists, songs, likedSongs, currentSong, isPlaying, playSong, toggleLike }) {
  return (
    <>
      <SectionHeader title="Your Playlists"/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 16, marginBottom: 36 }}>
        {playlists.map(p => (
          <div key={p.id} style={{ background: "#16162a", border: "1px solid #2a2a45", borderRadius: 16, padding: 14, cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "#6c63ff"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "#2a2a45"; }}>
            <div style={{ width: "100%", aspectRatio: 1, borderRadius: 10, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 12 }}>{p.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: "#606080" }}>0 songs</div>
          </div>
        ))}
      </div>
      <SectionHeader title="Recently Played"/>
      <SongList songs={songs.slice(0, 10)} isLoading={false} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>
    </>
  );
}

function LikedPage({ songs, likedSongs, currentSong, isPlaying, playSong, toggleLike }) {
  const liked = songs.filter(s => likedSongs.has(s.id));
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, paddingBottom: 28, borderBottom: "1px solid #2a2a45", marginBottom: 28 }}>
        <div style={{ width: 140, height: 140, borderRadius: 16, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, flexShrink: 0 }}>♥</div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#606080", marginBottom: 8 }}>Playlist</div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Liked Songs</div>
          <div style={{ fontSize: 14, color: "#a0a0c0", marginBottom: 16 }}>{liked.length} songs</div>
          {liked.length > 0 && <button onClick={() => playSong(liked[0])} style={{ background: GRAD, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>▶ Play All</button>}
        </div>
      </div>
      {liked.length === 0
        ? <Empty emoji="♥" text="No liked songs yet" sub="Hit the heart on any song"/>
        : <SongList songs={liked} isLoading={false} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>}
    </>
  );
}

/* ── Shared ── */

function SongList({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, title }) {
  if (isLoading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", borderRadius: 12 }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: "#1a1a28" }}/>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "#1a1a28", animation: "pulse 1.5s ease-in-out infinite" }}/>
          <div style={{ flex: 1 }}>
            <div style={{ width: "60%", height: 14, borderRadius: 4, background: "#1a1a28", marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }}/>
            <div style={{ width: "40%", height: 12, borderRadius: 4, background: "#1a1a28", animation: "pulse 1.5s ease-in-out infinite" }}/>
          </div>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
    </div>
  );

  if (!songs.length) return <Empty emoji="🎵" text="No songs found" sub="Try searching for something else"/>;

  return (
    <>
      {title && <SectionHeader title={title} right={`${songs.length} songs`}/>}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 32 }}>
        {songs.map((s, i) => {
          const active = currentSong && currentSong.id === s.id;
          const liked = likedSongs.has(s.id);
          return (
            <div key={s.id} onDoubleClick={() => playSong(s)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", borderRadius: 12, cursor: "pointer", background: active ? "rgba(108,99,255,.1)" : "none", transition: "background .2s", position: "relative" }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#1a1a28"; e.currentTarget.querySelector(".like-btn").style.opacity = "1"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; if (!liked) e.currentTarget.querySelector(".like-btn").style.opacity = "0"; }}>
              <div style={{ width: 20, textAlign: "center", fontSize: 13, color: active ? "#6c63ff" : "#606080", flexShrink: 0 }}>
                {active && isPlaying ? <span>▶</span> : (i + 1)}
              </div>
              {/* Thumbnail */}
              <img src={s.thumbnail} alt={s.title}
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                onError={e => { e.target.style.display = "none"; }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: active ? "#6c63ff" : "#f0f0ff" }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#606080", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist}</div>
              </div>
              <button className="like-btn" onClick={e => { e.stopPropagation(); toggleLike(s.id); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: liked ? "#ff6b9d" : "#606080", opacity: liked ? 1 : 0, transition: "opacity .2s", display: "flex", padding: 4, flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 600 }}>{title}</div>
      {right && <span style={{ fontSize: 13, color: "#6c63ff", fontWeight: 500 }}>{right}</span>}
    </div>
  );
}

function Empty({ emoji, text, sub }) {
  return (
    <div style={{ padding: "80px 0", textAlign: "center", color: "#606080" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 500, color: "#a0a0c0", marginBottom: 8 }}>{text}</div>
      <div style={{ fontSize: 14 }}>{sub}</div>
    </div>
  );
}

function IconToggle({ active, onClick, title, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 44, height: 44, borderRadius: 12, background: active ? "rgba(108,99,255,.2)" : "#1a1a28", border: `1px solid ${active ? "#6c63ff" : "#2a2a45"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: active ? "#6c63ff" : "#a0a0c0", flexShrink: 0 }}>
      {children}
    </button>
  );
}