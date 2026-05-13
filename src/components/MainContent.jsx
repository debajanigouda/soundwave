/* MainContent.jsx — Mobile-first, Spotify-style */

export default function MainContent({
  currentPage, searchQuery, handleSearch, songs, likedSongs, currentSong,
  isPlaying, isLoading, playSong, toggleLike, isShuffle, setIsShuffle,
  isRepeat, setIsRepeat, playlists, genres, loadTrending, handleGenreSearch, isMobile,
}) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "#0a0a0f",
      /* On desktop this div itself scrolls; on mobile the parent scrolls */
overflowY: isMobile ? "auto" : "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
    }}>
      {/* Desktop search header */}
      {!isMobile && (
        <DesktopSearchHeader
          searchQuery={searchQuery}
          handleSearch={handleSearch}
          isShuffle={isShuffle} setIsShuffle={setIsShuffle}
          isRepeat={isRepeat} setIsRepeat={setIsRepeat}
        />
      )}

      {/* Mobile search bar — only on search page */}
      {isMobile && currentPage === "search" && (
        <div style={{ padding: "8px 16px 0" }}>
          <SearchBar searchQuery={searchQuery} handleSearch={handleSearch} />
        </div>
      )}

      {/* Page content */}
      <div style={{ padding: isMobile ? "12px 16px 24px" : "24px 32px 100px" }}>
        {currentPage === "home"      && <HomePage songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} genres={genres} handleGenreSearch={handleGenreSearch} loadTrending={loadTrending} isMobile={isMobile} handleSearch={handleSearch} />}
        {currentPage === "search"    && <SearchPage songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} searchQuery={searchQuery} isMobile={isMobile} genres={genres} handleGenreSearch={handleGenreSearch} />}
        {currentPage === "library"   && <LibraryPage playlists={playlists} songs={songs} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} />}
        {currentPage === "liked"     && <LikedPage songs={songs} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} />}
        {currentPage === "downloads" && <Empty emoji="⬇️" text="Downloads coming soon" sub="Phase 5 of the roadmap" />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DESKTOP SEARCH HEADER
══════════════════════════════════════════════════════ */
function DesktopSearchHeader({ searchQuery, handleSearch, isShuffle, setIsShuffle, isRepeat, setIsRepeat }) {
  return (
    <div style={{
      padding: "20px 32px",
      display: "flex", alignItems: "center", gap: 12,
      borderBottom: "1px solid #1e1e2e",
      background: "#0a0a0f",
      flexShrink: 0,
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <SearchBar searchQuery={searchQuery} handleSearch={handleSearch} />
      <ToggleBtn active={isShuffle} onClick={() => setIsShuffle(s => !s)} title="Shuffle">
        <ShuffleIcon />
      </ToggleBtn>
      <ToggleBtn active={isRepeat} onClick={() => setIsRepeat(r => !r)} title="Repeat">
        <RepeatIcon />
      </ToggleBtn>
    </div>
  );
}

function SearchBar({ searchQuery, handleSearch }) {
  return (
    <div style={{
      flex: 1,
      display: "flex", alignItems: "center", gap: 10,
      background: "#1a1a28",
      border: "1px solid #2a2a3e",
      borderRadius: 12, padding: "0 16px", height: 44,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
      <input
        value={searchQuery}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Songs, artists, albums..."
        style={{
          flex: 1, background: "none", border: "none", outline: "none",
          color: "#ffffff", fontSize: 14, fontFamily: "inherit",
        }}
      />
      {searchQuery && (
        <button onClick={() => handleSearch("")}
          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20, lineHeight: 1, display: "flex" }}>
          ×
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════════════ */
function HomePage({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, genres, handleGenreSearch, loadTrending, isMobile, handleSearch }) {

  /* Quick picks — first 6 songs in a 2-col grid (mobile) or 3-col (desktop) */
  const quickPicks = songs.slice(0, 6);

  return (
    <>
      {/* Quick picks grid — like Spotify home */}
      {quickPicks.length > 0 && (
        <>
          <SectionTitle title="Quick picks" />
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
            gap: isMobile ? 8 : 12,
            marginBottom: 32,
          }}>
            {quickPicks.map(s => (
              <QuickPickCard key={s.id} song={s} active={currentSong?.id === s.id} isPlaying={isPlaying} playSong={playSong} />
            ))}
          </div>
        </>
      )}

      {/* Genres */}
      <SectionTitle title="Browse by genre" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
        {genres.map(g => (
          <button key={g.label} onClick={() => handleGenreSearch(g.query)}
            style={{
              padding: "8px 16px", borderRadius: 100,
              background: "#1a1a28", border: "1px solid #2a2a3e",
              color: "#a0a0b8", fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#252540"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#1a1a28"; e.currentTarget.style.color = "#a0a0b8"; }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Trending */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <SectionTitle title="Trending now" noMargin />
        <button onClick={loadTrending}
          style={{ background: "none", border: "none", color: "#1db954", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          Refresh ↺
        </button>
      </div>
      <SongList songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} />
    </>
  );
}

/* Quick pick card — thumbnail left, title right, whole card is tappable */
function QuickPickCard({ song, active, isPlaying, playSong }) {
  return (
    <button
      onClick={() => playSong(song)}
      style={{
        display: "flex", alignItems: "center", gap: 0,
        background: active ? "#1e3a2a" : "#161622",
        border: `1px solid ${active ? "#1db954" : "#2a2a3e"}`,
        borderRadius: 10, overflow: "hidden",
        cursor: "pointer", width: "100%", textAlign: "left",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#1e1e30"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "#161622"; }}
    >
      <img
        src={song.thumbnail}
        alt={song.title}
        style={{ width: 52, height: 52, objectFit: "cover", flexShrink: 0 }}
        onError={e => { e.target.style.background = "#1db954"; e.target.alt = ""; }}
      />
      <div style={{ flex: 1, padding: "0 10px", minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: active ? "#1db954" : "#ffffff",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {song.title}
        </div>
      </div>
      {active && isPlaying && (
        <div style={{ paddingRight: 10, color: "#1db954", fontSize: 12, flexShrink: 0 }}>▶</div>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════
   SEARCH PAGE
══════════════════════════════════════════════════════ */
function SearchPage({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, searchQuery, isMobile, genres, handleGenreSearch }) {
  if (!searchQuery) {
    return (
      <>
        <SectionTitle title="Browse categories" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
        }}>
          {genres.map((g, i) => {
            const colors = ["#1db954","#e91429","#2d46b9","#af2896","#e8115b","#148a08","#1e3264","#8400e7","#ba5d07","#006450","#e13300","#477d95"];
            return (
              <button key={g.label} onClick={() => handleGenreSearch(g.query)}
                style={{
                  height: 70, borderRadius: 12,
                  background: colors[i % colors.length],
                  border: "none", cursor: "pointer",
                  fontSize: 15, fontWeight: 700, color: "#fff",
                  fontFamily: "inherit", letterSpacing: -0.3,
                  textAlign: "left", padding: "0 16px",
                  position: "relative", overflow: "hidden",
                }}>
                {g.label}
                <span style={{ position: "absolute", right: 10, bottom: 6, fontSize: 28, opacity: 0.3 }}>♪</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <SectionTitle title={`Results for "${searchQuery}"`} />
      <SongList songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   LIBRARY PAGE
══════════════════════════════════════════════════════ */
function LibraryPage({ playlists, songs, likedSongs, currentSong, isPlaying, playSong, toggleLike, isMobile }) {
  return (
    <>
      <SectionTitle title="Your playlists" />
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 14, marginBottom: 36,
      }}>
        {playlists.map(p => (
          <div key={p.id}
            style={{
              background: "#161622", border: "1px solid #2a2a3e",
              borderRadius: 14, padding: 12, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1e1e30"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#161622"; }}>
            <div style={{
              width: "100%", aspectRatio: "1",
              borderRadius: 10, background: p.color,
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 36, marginBottom: 10,
            }}>
              {p.emoji}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>0 songs</div>
          </div>
        ))}
      </div>

      <SectionTitle title="Recently played" />
      <SongList songs={songs.slice(0, 10)} isLoading={false} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   LIKED PAGE
══════════════════════════════════════════════════════ */
function LikedPage({ songs, likedSongs, currentSong, isPlaying, playSong, toggleLike, isMobile }) {
  const liked = songs.filter(s => likedSongs.has(s.id));
  return (
    <>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: isMobile ? "0 0 24px" : "0 0 32px",
        marginBottom: 24, borderBottom: "1px solid #1e1e2e",
      }}>
        <div style={{
          width: isMobile ? 90 : 140, height: isMobile ? 90 : 140,
          borderRadius: 14, flexShrink: 0,
          background: "linear-gradient(135deg,#4c1a96,#9b45d6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isMobile ? 36 : 56,
        }}>
          ♥
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Playlist</div>
          <div style={{ fontSize: isMobile ? 26 : 40, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: -1 }}>Liked Songs</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>{liked.length} songs</div>
          {liked.length > 0 && (
            <button onClick={() => playSong(liked[0])}
              style={{
                background: "#1db954", color: "#000", border: "none",
                padding: "10px 28px", borderRadius: 100,
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>
              ▶ Play
            </button>
          )}
        </div>
      </div>
      {liked.length === 0
        ? <Empty emoji="♥" text="No liked songs yet" sub="Tap the heart on any song to save it here" />
        : <SongList songs={liked} isLoading={false} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} />}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SONG LIST — the core component
══════════════════════════════════════════════════════ */
function SongList({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, isMobile }) {
  if (isLoading) return <LoadingSkeleton />;
  if (!songs.length) return <Empty emoji="🎵" text="No songs found" sub="Try a different search" />;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {songs.map((s, i) => {
        const active = currentSong?.id === s.id;
        const liked = likedSongs.has(s.id);
        return (
          <SongRow
            key={s.id}
            song={s}
            index={i}
            active={active}
            isPlaying={isPlaying}
            liked={liked}
            playSong={playSong}
            toggleLike={toggleLike}
            isMobile={isMobile}
          />
        );
      })}
    </div>
  );
}

function SongRow({ song, index, active, isPlaying, liked, playSong, toggleLike, isMobile }) {
  return (
    <div
      onClick={() => playSong(song)}
      style={{
        display: "flex", alignItems: "center",
        gap: isMobile ? 12 : 14,
        padding: isMobile ? "8px 4px" : "6px 8px",
        borderRadius: 8,
        background: active ? "rgba(29,185,84,0.08)" : "transparent",
        cursor: "pointer",
        transition: "background 0.15s",
        /* Extra bottom spacing so last item isn't hidden behind player */
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#161622"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Track number — desktop only */}
      {!isMobile && (
        <div style={{ width: 20, textAlign: "center", flexShrink: 0, color: active ? "#1db954" : "#6b7280", fontSize: 13 }}>
          {active && isPlaying ? "▶" : index + 1}
        </div>
      )}

      {/* Thumbnail with active overlay */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <img
          src={song.thumbnail}
          alt={song.title}
          style={{ width: 46, height: 46, borderRadius: 8, objectFit: "cover", display: "block" }}
          onError={e => { e.target.style.background = "#1db954"; }}
        />
        {active && isPlaying && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 8,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {/* Animated bars like Spotify */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16 }}>
              {[10, 16, 8, 14, 12].map((h, i) => (
                <div key={i} style={{
                  width: 3, height: h,
                  background: "#1db954", borderRadius: 2,
                  animation: `bar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Title + artist */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: active ? "#1db954" : "#ffffff",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {song.title}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {song.artist}
        </div>
      </div>

      {/* Like button — ALWAYS visible on mobile */}
      <button
        onClick={e => { e.stopPropagation(); toggleLike(song.id); }}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 8,
          color: liked ? "#1db954" : "#6b7280",
          flexShrink: 0, display: "flex", alignItems: "center",
          opacity: isMobile ? 1 : (liked ? 1 : 0),
          transition: "all 0.2s",
        }}
        className="like-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════════════ */
function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 4px" }}>
          <div style={{ width: 46, height: 46, borderRadius: 8, background: "#1a1a28", animation: "pulse 1.5s ease infinite", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 13, width: "55%", borderRadius: 4, background: "#1a1a28", marginBottom: 8, animation: "pulse 1.5s ease infinite" }} />
            <div style={{ height: 11, width: "35%", borderRadius: 4, background: "#1a1a28", animation: "pulse 1.5s ease infinite" }} />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes bar { from{transform:scaleY(1)} to{transform:scaleY(0.3)} }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes bar { from{transform:scaleY(1)} to{transform:scaleY(0.3)} }
      `}</style>
    </div>
  );
}

function SectionTitle({ title, noMargin }) {
  return (
    <div style={{
      fontSize: 20, fontWeight: 700, color: "#ffffff",
      letterSpacing: -0.5,
      marginBottom: noMargin ? 0 : 16,
    }}>
      {title}
    </div>
  );
}

function Empty({ emoji, text, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>{emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#a0a0b8", marginBottom: 8 }}>{text}</div>
      <div style={{ fontSize: 14 }}>{sub}</div>
    </div>
  );
}

function ToggleBtn({ active, onClick, title, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{
        width: 44, height: 44, borderRadius: 12, border: `1px solid ${active ? "#1db954" : "#2a2a3e"}`,
        background: active ? "rgba(29,185,84,0.15)" : "#1a1a28",
        color: active ? "#1db954" : "#6b7280",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
      }}>
      {children}
    </button>
  );
}

function ShuffleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
    </svg>
  );
}
function RepeatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
