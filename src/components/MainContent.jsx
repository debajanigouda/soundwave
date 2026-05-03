const GRAD = "linear-gradient(135deg,#6c63ff,#ff6b9d)";

function fmt(sec) {
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${s<10?"0":""}${s}`;
}

export default function MainContent({ currentPage, searchQuery, handleSearch, songs, likedSongs, currentSong, isPlaying, isLoading, playSong, toggleLike, isShuffle, setIsShuffle, isRepeat, setIsRepeat, playlists, genres, loadTrending, handleGenreSearch, isMobile }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Search Header */}
      <div style={{ padding: isMobile ? "12px 16px" : "20px 32px", borderBottom: "1px solid #2a2a45", background: "#0a0a0f", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#1a1a28", border: "1px solid #2a2a45", borderRadius: 14, padding: "0 16px", height: 42 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606080" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={searchQuery} onChange={e => handleSearch(e.target.value)}
            placeholder="Search songs, artists worldwide..."
            style={{ background: "none", border: "none", outline: "none", color: "#f0f0ff", fontSize: 14, fontFamily: "inherit", width: "100%" }}/>
          {searchQuery && <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", color: "#606080", cursor: "pointer", fontSize: 18 }}>×</button>}
        </div>
        {!isMobile && (
          <>
            <IconBtn active={isShuffle} onClick={() => setIsShuffle(s=>!s)} title="Shuffle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
            </IconBtn>
            <IconBtn active={isRepeat} onClick={() => setIsRepeat(r=>!r)} title="Repeat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </IconBtn>
          </>
        )}
      </div>

      {/* Page Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px" : "24px 32px" }}>
        {currentPage === "home"      && <HomePage songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} genres={genres} handleGenreSearch={handleGenreSearch} loadTrending={loadTrending} isMobile={isMobile}/>}
        {currentPage === "search"    && <SongList songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} title={searchQuery ? `Results for "${searchQuery}"` : "Trending"}/>}
        {currentPage === "library"   && <LibraryPage playlists={playlists} songs={songs} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>}
        {currentPage === "liked"     && <LikedPage songs={songs.filter(s=>likedSongs.has(s.id))} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>}
        {currentPage === "downloads" && <Empty emoji="⬇️" text="Downloads" sub="Coming soon!"/>}
      </div>
    </div>
  );
}

function HomePage({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, genres, handleGenreSearch, loadTrending, isMobile }) {
  return (
    <>
      {/* Banner */}
      <div style={{ borderRadius: 20, background: "linear-gradient(135deg,#1a1040,#0d2030)", padding: isMobile?"20px":"32px", marginBottom: 24, position: "relative", overflow: "hidden", minHeight: isMobile?140:180, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: GRAD, opacity: .12 }}/>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6c63ff", fontWeight: 700, marginBottom: 8 }}>🔥 Live from YouTube</div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: isMobile?22:28, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>Every Song.<br/>Worldwide. Free.</div>
          <div style={{ fontSize: 12, color: "#a0a0c0", marginBottom: 16 }}>No ads · No limits · Background play</div>
          <button onClick={() => songs.length && playSong(songs[0])}
            style={{ background: GRAD, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>▶ Play Trending</button>
        </div>
      </div>

      {/* Genres */}
      <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Browse by Genre</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {genres.map(g => (
          <button key={g.label} onClick={() => handleGenreSearch(g.query)}
            style={{ padding: "7px 16px", borderRadius: 100, border: "1px solid #2a2a45", background: "#16162a", color: "#a0a0c0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#6c63ff"; e.currentTarget.style.color="#6c63ff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#2a2a45"; e.currentTarget.style.color="#a0a0c0"; }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Trending */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 600 }}>🔥 Trending Now</div>
        <button onClick={loadTrending} style={{ background: "none", border: "none", color: "#6c63ff", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>Refresh ↺</button>
      </div>
      <SongList songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>
    </>
  );
}

function LibraryPage({ playlists, songs, likedSongs, currentSong, isPlaying, playSong, toggleLike }) {
  return (
    <>
      <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Your Playlists</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 14, marginBottom: 32 }}>
        {playlists.map(p => (
          <div key={p.id} style={{ background: "#16162a", border: "1px solid #2a2a45", borderRadius: 14, padding: 12, cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#6c63ff"; e.currentTarget.style.transform="translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#2a2a45"; e.currentTarget.style.transform="translateY(0)"; }}>
            <div style={{ width: "100%", aspectRatio: 1, borderRadius: 8, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 10 }}>{p.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: "#606080" }}>{p.songIds.length} songs</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Recently Played</div>
      <SongList songs={songs.slice(0,10)} isLoading={false} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>
    </>
  );
}

function LikedPage({ songs, likedSongs, currentSong, isPlaying, playSong, toggleLike }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, paddingBottom: 24, borderBottom: "1px solid #2a2a45", marginBottom: 24 }}>
        <div style={{ width: 120, height: 120, borderRadius: 14, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, flexShrink: 0 }}>♥</div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#606080", marginBottom: 6 }}>Playlist</div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 30, fontWeight: 700, marginBottom: 6 }}>Liked Songs</div>
          <div style={{ fontSize: 13, color: "#a0a0c0", marginBottom: 14 }}>{songs.length} songs</div>
          {songs.length > 0 && <button onClick={() => playSong(songs[0])} style={{ background: GRAD, color: "#fff", border: "none", padding: "9px 20px", borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>▶ Play All</button>}
        </div>
      </div>
      {songs.length === 0
        ? <Empty emoji="♥" text="No liked songs yet" sub="Tap the heart on any song"/>
        : <SongList songs={songs} isLoading={false} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike}/>}
    </>
  );
}

function SongList({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, title }) {
  if (isLoading) return (
    <div>
      {[...Array(6)].map((_,i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "#1a1a28" }}/>
          <div style={{ flex: 1 }}>
            <div style={{ width: "60%", height: 12, borderRadius: 4, background: "#1a1a28", marginBottom: 8 }}/>
            <div style={{ width: "40%", height: 10, borderRadius: 4, background: "#1a1a28" }}/>
          </div>
        </div>
      ))}
    </div>
  );

  if (!songs.length) return <Empty emoji="🎵" text="No songs found" sub="Try searching for something else"/>;

  return (
    <div>
      {title && <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{title}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 16 }}>
        {songs.map((s, i) => {
          const active = currentSong?.id === s.id;
          const liked = likedSongs.has(s.id);
          return (
            <div key={s.id} onDoubleClick={() => playSong(s)} onClick={() => playSong(s)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 10, cursor: "pointer", background: active?"rgba(108,99,255,.12)":"transparent", transition: "background .15s" }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.background="#1a1a28"; }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.background="transparent"; }}>
              <div style={{ width: 20, textAlign: "center", fontSize: 12, color: active?"#6c63ff":"#606080", flexShrink: 0 }}>
                {active && isPlaying ? "▶" : i+1}
              </div>
              <img src={s.thumbnail} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                onError={e => e.target.style.display="none"}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: active?"#6c63ff":"#f0f0ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#606080", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); toggleLike(s.id); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: liked?"#ff6b9d":"#606080", padding: 4, flexShrink: 0, opacity: liked?1:0.4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={liked?"currentColor":"none"} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Empty({ emoji, text, sub }) {
  return (
    <div style={{ padding: "60px 0", textAlign: "center", color: "#606080" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{emoji}</div>
      <div style={{ fontSize: 17, fontWeight: 500, color: "#a0a0c0", marginBottom: 6 }}>{text}</div>
      <div style={{ fontSize: 13 }}>{sub}</div>
    </div>
  );
}

function IconBtn({ active, onClick, title, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 42, height: 42, borderRadius: 12, background: active?"rgba(108,99,255,.2)":"#1a1a28", border: `1px solid ${active?"#6c63ff":"#2a2a45"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: active?"#6c63ff":"#a0a0c0", flexShrink: 0 }}>
      {children}
    </button>
  );
}