import { useContext } from "react";
import { ThemeContext } from "../ThemeContext";
import AiDiscovery from "./AiDiscovery";
import { useContext, useState, useEffect, useRef } from "react";

export default function MainContent({
  currentPage, searchQuery, handleSearch, songs, likedSongs, currentSong,
  isPlaying, isLoading, playSong, toggleLike, isShuffle, setIsShuffle,
  isRepeat, setIsRepeat, playlists, dbPlaylists, genres, loadTrending,
  handleGenreSearch, isMobile, handleAddToPlaylist,
}) {
  const { darkMode } = useContext(ThemeContext);
  const bg = darkMode ? "#0a0a0f" : "#f5f5f5";

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: bg, minHeight: "100%",
      overflowX: "hidden", WebkitOverflowScrolling: "touch",
    }}>
      {!isMobile && (
        <DesktopSearchHeader
          searchQuery={searchQuery} handleSearch={handleSearch}
          isShuffle={isShuffle} setIsShuffle={setIsShuffle}
          isRepeat={isRepeat} setIsRepeat={setIsRepeat}
          darkMode={darkMode}
        />
      )}

      {isMobile && currentPage === "search" && (
        <div style={{ padding: "12px 16px 0" }}>
          <SearchBar searchQuery={searchQuery} handleSearch={handleSearch} darkMode={darkMode} />
        </div>
      )}

      <div style={{ padding: isMobile ? "16px 16px 32px" : "24px 32px 100px" }}>
        {currentPage === "home"      && <HomePage songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} genres={genres} handleGenreSearch={handleGenreSearch} loadTrending={loadTrending} isMobile={isMobile} handleSearch={handleSearch} darkMode={darkMode} handleAddToPlaylist={handleAddToPlaylist} />}
        {currentPage === "search"    && <SearchPage songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} searchQuery={searchQuery} isMobile={isMobile} genres={genres} handleGenreSearch={handleGenreSearch} darkMode={darkMode} handleAddToPlaylist={handleAddToPlaylist} />}
        {currentPage === "library"   && <LibraryPage playlists={dbPlaylists || playlists} songs={songs} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} darkMode={darkMode} handleAddToPlaylist={handleAddToPlaylist} />}
        {currentPage === "liked"     && <LikedPage songs={songs} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} darkMode={darkMode} handleAddToPlaylist={handleAddToPlaylist} />}
        {currentPage === "downloads" && <Empty emoji="⬇️" text="Downloads coming soon" sub="Phase 5 of the roadmap" darkMode={darkMode} />}
      </div>

      <style>{`
  @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
  @keyframes bar { from{transform:scaleY(1)} to{transform:scaleY(0.3)} }
  @keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }
  @keyframes songIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes heartPop { 0%{transform:scale(1)} 40%{transform:scale(1.4)} 70%{transform:scale(0.9)} 100%{transform:scale(1)} }
  .song-row { transition: all 0.18s cubic-bezier(0.4,0,0.2,1) !important; }
  .song-row:hover { background: rgba(255,255,255,0.05) !important; transform: translateX(3px); }
  .song-row:active { transform: scale(0.99) !important; }
  .genre-btn { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1) !important; }
  .genre-btn:hover { transform: scale(1.05) !important; }
  .genre-btn:active { transform: scale(0.96) !important; }
  .quick-card { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1) !important; }
  .quick-card:hover { transform: scale(1.03) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important; }
  .quick-card:active { transform: scale(0.97) !important; }
  .heart-liked { animation: heartPop 0.35s ease !important; }
  .add-btn { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1) !important; }
  .add-btn:hover { transform: scale(1.2) rotate(90deg) !important; color: #1db954 !important; }
  .add-btn:active { transform: scale(0.9) !important; }
`}</style>
    </div>
  );
}

function DesktopSearchHeader({ searchQuery, handleSearch, isShuffle, setIsShuffle, isRepeat, setIsRepeat, darkMode }) {
  return (
    <div style={{
      padding: "20px 32px", display: "flex", alignItems: "center", gap: 12,
      borderBottom: `1px solid ${darkMode ? "#1e1e2e" : "#e0e0ee"}`,
      background: darkMode ? "#0a0a0f" : "#f5f5f5",
      flexShrink: 0, position: "sticky", top: 0, zIndex: 10,
    }}>
      <SearchBar searchQuery={searchQuery} handleSearch={handleSearch} darkMode={darkMode} />
      <ToggleBtn active={isShuffle} onClick={() => setIsShuffle(s => !s)} title="Shuffle" darkMode={darkMode}>
        <ShuffleIcon />
      </ToggleBtn>
      <ToggleBtn active={isRepeat} onClick={() => setIsRepeat(r => !r)} title="Repeat" darkMode={darkMode}>
        <RepeatIcon />
      </ToggleBtn>
    </div>
  );
}

function SearchBar({ searchQuery, handleSearch, darkMode }) {
  const [inputValue, setInputValue] = useState(searchQuery || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Sync inputValue with searchQuery from outside
  useEffect(() => {
    setInputValue(searchQuery || "");
  }, [searchQuery]);

  // Debounced suggestions fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!inputValue.trim() || inputValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const API = import.meta.env.VITE_API_URL || "https://soundwave-server.onrender.com";
        const res = await fetch(`${API}/api/search?q=${encodeURIComponent(inputValue)}`);
        const data = await res.json();
        if (data.success && data.songs?.length > 0) {
          setSuggestions(data.songs.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (e) {
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [inputValue]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(val) {
    setInputValue(val);
    if (!val.trim()) {
      handleSearch("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function handleSubmit() {
    if (!inputValue.trim()) return;
    setShowSuggestions(false);
    handleSearch(inputValue);
  }

  function handleSuggestionClick(song) {
    setInputValue(song.title);
    setShowSuggestions(false);
    handleSearch(song.title);
  }

  function handleClear() {
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    handleSearch("");
  }

  return (
    <div ref={containerRef} style={{ flex: 1, position: "relative" }}>
      {/* Search input */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: darkMode ? "#1a1a28" : "#ffffff",
        border: `1px solid ${showSuggestions && suggestions.length > 0
          ? "#6c63ff"
          : darkMode ? "#2a2a3e" : "#ddd"}`,
        borderRadius: showSuggestions && suggestions.length > 0 ? "14px 14px 0 0" : 14,
        padding: "0 16px", height: 46,
        transition: "border-color 0.2s, border-radius 0.2s",
      }}>
        {isLoadingSuggestions ? (
          <div style={{ width: 16, height: 16, border: "2px solid #6c63ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        )}
        <input
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") { setShowSuggestions(false); }
          }}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder="Songs, artists, albums..."
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: darkMode ? "#fff" : "#111", fontSize: 15, fontFamily: "inherit",
          }}
        />
        {inputValue && (
          <button onClick={handleClear}
            style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20, lineHeight: 1, display: "flex", flexShrink: 0 }}>
            ×
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: darkMode ? "#1a1a28" : "#ffffff",
          border: `1px solid #6c63ff`,
          borderTop: `1px solid ${darkMode ? "#2a2a3e" : "#eee"}`,
          borderRadius: "0 0 14px 14px",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          animation: "suggestionsDrop 0.15s ease",
        }}>
          {suggestions.map((song, i) => (
            <div key={song.id} onClick={() => handleSuggestionClick(song)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px", cursor: "pointer",
                borderBottom: i < suggestions.length - 1
                  ? `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "#f0f0f0"}`
                  : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = darkMode ? "rgba(108,99,255,0.1)" : "#f5f0ff"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <img src={song.thumbnail} alt={song.title}
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                onError={e => { e.target.style.background = "#6c63ff"; e.target.src = ""; }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#fff" : "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {song.title}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{song.artist}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M7 17L17 7M7 7h10v10"/>
              </svg>
            </div>
          ))}

          {/* Search all button */}
          <div onClick={handleSubmit}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px", cursor: "pointer",
              background: darkMode ? "rgba(108,99,255,0.08)" : "#f8f5ff",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = darkMode ? "rgba(108,99,255,0.15)" : "#efe8ff"}
            onMouseLeave={e => e.currentTarget.style.background = darkMode ? "rgba(108,99,255,0.08)" : "#f8f5ff"}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#6c63ff,#ff6b9d)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#a0a0ff" : "#6c63ff" }}>
                Search all results for "{inputValue}"
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>Press Enter or tap here</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes suggestionsDrop {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function HomePage({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, genres, handleGenreSearch, loadTrending, isMobile, handleSearch, darkMode, handleAddToPlaylist }) {
  const quickPicks = songs.slice(0, 6);
  const featured   = songs.slice(0, 4);
  const genreBg    = darkMode ? "#1a1a28" : "#fff";
  const genreBdr   = darkMode ? "#2a2a3e" : "#ddd";
  const genreClr   = darkMode ? "#a0a0b8" : "#555";

  return (
    <>
    <AiDiscovery
  playSong={playSong}
  currentSong={currentSong}
  isPlaying={isPlaying}
  likedSongs={likedSongs}
  toggleLike={toggleLike}
  darkMode={darkMode}
  isMobile={isMobile}
  handleAddToPlaylist={handleAddToPlaylist}
/>
      {isMobile && featured.length > 0 && (
        <>
          <SectionTitle title="Featured" darkMode={darkMode} />
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, marginBottom: 28, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
            {featured.map(s => (
              <FeaturedCard key={s.id} song={s} active={currentSong?.id === s.id} isPlaying={isPlaying} playSong={playSong} />
            ))}
          </div>
        </>
      )}

      {quickPicks.length > 0 && (
        <>
          <SectionTitle title="Quick picks" darkMode={darkMode} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? 10 : 12, marginBottom: 32 }}>
            {quickPicks.map(s => (
              <QuickPickCard key={s.id} song={s} active={currentSong?.id === s.id} isPlaying={isPlaying} playSong={playSong} darkMode={darkMode} />
            ))}
          </div>
        </>
      )}

      <SectionTitle title="Browse genres" darkMode={darkMode} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
        {genres.map(g => (
          <button key={g.label} className="genre-btn" onClick={() => handleGenreSearch(g.query)}
            style={{ padding: "8px 18px", borderRadius: 100, background: genreBg, border: `1px solid ${genreBdr}`, color: genreClr, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = darkMode ? "#252540" : "#ebebff"; e.currentTarget.style.color = darkMode ? "#fff" : "#333"; }}
            onMouseLeave={e => { e.currentTarget.style.background = genreBg; e.currentTarget.style.color = genreClr; }}>
            {g.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <SectionTitle title="Trending now" noMargin darkMode={darkMode} />
        <button onClick={loadTrending} style={{ background: "none", border: "none", color: "#1db954", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Refresh ↺</button>
      </div>
      <SongList songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} darkMode={darkMode} handleAddToPlaylist={handleAddToPlaylist} />
    </>
  );
}

function FeaturedCard({ song, active, isPlaying, playSong }) {
  return (
    <div className="quick-card" onClick={() => playSong(song)}
      style={{ minWidth: 160, scrollSnapAlign: "start", flexShrink: 0, borderRadius: 16, overflow: "hidden", cursor: "pointer", position: "relative", border: `2px solid ${active ? "#1db954" : "transparent"}`, transition: "border-color 0.2s" }}>
      <img src={song.thumbnail} alt={song.title} style={{ width: 160, height: 160, objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.85))", padding: "24px 10px 10px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{song.artist}</div>
      </div>
      {active && isPlaying && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "#1db954", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PauseIcon size={12} color="#000" />
        </div>
      )}
    </div>
  );
}

function QuickPickCard({ song, active, isPlaying, playSong, darkMode }) {
  return (
    <button className="quick-card" onClick={() => playSong(song)}
      style={{ display: "flex", alignItems: "center", gap: 0, background: active ? "rgba(29,185,84,0.12)" : (darkMode ? "#161622" : "#fff"), border: `1px solid ${active ? "#1db954" : (darkMode ? "#252535" : "#e0e0ee")}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.15s" }}>
      <img src={song.thumbnail} alt={song.title} style={{ width: 50, height: 50, objectFit: "cover", flexShrink: 0 }} onError={e => { e.target.style.background = "#1db954"; }} />
      <div style={{ flex: 1, padding: "0 10px", minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: active ? "#1db954" : (darkMode ? "#fff" : "#111"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
      </div>
      {active && isPlaying && (
        <div style={{ paddingRight: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
            {[8, 14, 6, 12].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, background: "#1db954", borderRadius: 2, animation: `bar 0.8s ease-in-out ${i * 0.15}s infinite alternate`, transformOrigin: "bottom" }} />
            ))}
          </div>
        </div>
      )}
    </button>
  );
}

function SearchPage({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, searchQuery, isMobile, genres, handleGenreSearch, darkMode, handleAddToPlaylist }) {
  const colors = ["#6c63ff","#e91429","#2d46b9","#af2896","#e8115b","#148a08","#1e3264","#8400e7","#ba5d07","#006450","#e13300","#477d95"];
  if (!searchQuery) {
    return (
      <>
        <SectionTitle title="Browse categories" darkMode={darkMode} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {genres.map((g, i) => (
            <button key={g.label} className="genre-btn" onClick={() => handleGenreSearch(g.query)}
              style={{ height: 76, borderRadius: 14, background: colors[i % colors.length], border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "inherit", textAlign: "left", padding: "0 16px", position: "relative", overflow: "hidden", transition: "transform 0.15s" }}>
              {g.label}
              <span style={{ position: "absolute", right: 8, bottom: 4, fontSize: 32, opacity: 0.25 }}>♪</span>
            </button>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <SectionTitle title={`Results for "${searchQuery}"`} darkMode={darkMode} />
      <SongList songs={songs} isLoading={isLoading} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} darkMode={darkMode} handleAddToPlaylist={handleAddToPlaylist} />
    </>
  );
}

function LibraryPage({ playlists, songs, likedSongs, currentSong, isPlaying, playSong, toggleLike, isMobile, darkMode, handleAddToPlaylist }) {
  const cardBg  = darkMode ? "#161622" : "#fff";
  const cardBdr = darkMode ? "#252535" : "#e0e0ee";
  const cardHov = darkMode ? "#1e1e30" : "#f0f0ff";
  return (
    <>
      <SectionTitle title="Your playlists" darkMode={darkMode} />
      {playlists.length === 0 && (
        <Empty emoji="🎵" text="No playlists yet" sub="Create one by tapping + on any song" darkMode={darkMode} />
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 36 }}>
        {playlists.map(p => (
  <div key={p.id}
   onClick={() => {
  const playlistSongs = p.playlist_songs
    ?.map(ps => {
      const s = ps.songs || ps;
      // Fix field names from Supabase format to app format
      return {
        id: s.id,
        title: s.title,
        artist: s.artist,
        thumbnail: s.thumbnail,
        youtubeId: s.youtubeId || s.youtube_id,
      };
    })
    .filter(s => s.youtubeId);
  if (playlistSongs?.length > 0) playSong(playlistSongs[0]);
}}
    style={{ background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 16, padding: 12, cursor: "pointer", transition: "all 0.15s" }}
    onMouseEnter={e => e.currentTarget.style.background = cardHov}
    onMouseLeave={e => e.currentTarget.style.background = cardBg}>
            <div style={{ width: "100%", aspectRatio: "1", borderRadius: 12, background: p.color || "linear-gradient(135deg,#6c63ff,#ff6b9d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 10 }}>
              {p.cover_emoji || p.emoji || "🎵"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: darkMode ? "#fff" : "#111", marginBottom: 2 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{p.playlist_songs?.length || 0} songs</div>
          </div>
        ))}
      </div>
      <SectionTitle title="Recently played" darkMode={darkMode} />
      <SongList songs={songs.slice(0, 10)} isLoading={false} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} darkMode={darkMode} handleAddToPlaylist={handleAddToPlaylist} />
    </>
  );
}

function LikedPage({ songs, likedSongs, currentSong, isPlaying, playSong, toggleLike, isMobile, darkMode, handleAddToPlaylist }) {
  const liked = songs.filter(s => likedSongs.has(s.id));
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 20, paddingBottom: 24, marginBottom: 24, borderBottom: `1px solid ${darkMode ? "#1e1e2e" : "#e0e0ee"}` }}>
        <div style={{ width: isMobile ? 90 : 140, height: isMobile ? 90 : 140, borderRadius: 16, flexShrink: 0, background: "linear-gradient(135deg,#4c1a96,#9b45d6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 36 : 56 }}>♥</div>
        <div>
          <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Playlist</div>
          <div style={{ fontSize: isMobile ? 26 : 40, fontWeight: 800, color: darkMode ? "#fff" : "#111", marginBottom: 6, letterSpacing: -1 }}>Liked Songs</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>{liked.length} songs</div>
          {liked.length > 0 && (
            <button onClick={() => playSong(liked[0])} style={{ background: "#1db954", color: "#000", border: "none", padding: "10px 28px", borderRadius: 100, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>▶ Play</button>
          )}
        </div>
      </div>
      {liked.length === 0
        ? <Empty emoji="♥" text="No liked songs yet" sub="Tap the heart on any song to save it here" darkMode={darkMode} />
        : <SongList songs={liked} isLoading={false} likedSongs={likedSongs} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} toggleLike={toggleLike} isMobile={isMobile} darkMode={darkMode} handleAddToPlaylist={handleAddToPlaylist} />}
    </>
  );
}

function SongList({ songs, isLoading, likedSongs, currentSong, isPlaying, playSong, toggleLike, isMobile, handleAddToPlaylist, darkMode }) {
  if (isLoading) return <LoadingSkeleton darkMode={darkMode} />;
  if (!songs.length) return <Empty emoji="🎵" text="No songs found" sub="Try a different search" darkMode={darkMode} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {songs.map((s, i) => (
        <SongRow key={s.id} song={s} index={i}
          active={currentSong?.id === s.id}
          isPlaying={isPlaying}
          liked={likedSongs.has(s.id)}
          playSong={playSong}
          toggleLike={toggleLike}
          isMobile={isMobile}
          darkMode={darkMode}
          handleAddToPlaylist={handleAddToPlaylist}
        />
      ))}
    </div>
  );
}

function SongRow({ song, index, active, isPlaying, liked, playSong, toggleLike, isMobile, darkMode, handleAddToPlaylist }) {
  return (
    <div className="song-row" onClick={() => playSong(song)}
      style={{
        display: "flex", alignItems: "center",
        gap: isMobile ? 12 : 14,
        padding: isMobile ? "10px 8px" : "8px 10px",
        borderRadius: 12,
        background: active ? "rgba(29,185,84,0.08)" : "transparent",
        cursor: "pointer",
        borderLeft: active ? "3px solid #1db954" : "3px solid transparent",
      }}>

      {!isMobile && (
        <div style={{ width: 20, textAlign: "center", flexShrink: 0, color: active ? "#1db954" : "#6b7280", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
          {active && isPlaying ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 14, justifyContent: "center" }}>
              {[6, 10, 7].map((h, i) => (
                <div key={i} style={{ width: 2, height: h, background: "#1db954", borderRadius: 2, animation: `bar 0.7s ease-in-out ${i * 0.1}s infinite alternate`, transformOrigin: "bottom" }} />
              ))}
            </div>
          ) : index + 1}
        </div>
      )}

      <div style={{ position: "relative", flexShrink: 0 }}>
        <img src={song.thumbnail} alt={song.title}
          style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", display: "block",
            boxShadow: active ? "0 0 0 2px #1db954" : "none",
            transition: "box-shadow 0.2s ease",
          }}
          onError={e => { e.target.style.background = "#1db954"; }} />
        {active && isPlaying && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16 }}>
              {[8, 14, 10, 14, 8].map((h, i) => (
                <div key={i} style={{ width: 3, height: h, background: "#1db954", borderRadius: 2, animation: `bar 0.7s ease-in-out ${i * 0.1}s infinite alternate`, transformOrigin: "bottom" }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#1db954" : (darkMode ? "#f0f0ff" : "#111"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "color 0.2s" }}>{song.title}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artist}</div>
      </div>

      {handleAddToPlaylist && (
        <button className="add-btn" onClick={e => { e.stopPropagation(); handleAddToPlaylist(song); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#3a3a5a", flexShrink: 0, display: "flex", alignItems: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </button>
      )}

      <button onClick={e => { e.stopPropagation(); toggleLike(song.id); }}
        className={liked ? "heart-liked" : ""}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 10, color: liked ? "#1db954" : "#3a3a5a", flexShrink: 0, display: "flex", alignItems: "center", transition: "color 0.2s" }}
        onTouchStart={e => e.currentTarget.style.transform = "scale(1.3)"}
        onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>
  );
}

function LoadingSkeleton({ darkMode }) {
  const shimBg = darkMode ? "#1a1a28" : "#ebebf5";
  const shimHi = darkMode ? "#252540" : "#dcdcf0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px" }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: shimBg, flexShrink: 0, backgroundImage: `linear-gradient(90deg, ${shimBg} 0px, ${shimHi} 80px, ${shimBg} 160px)`, backgroundSize: "200px 100%", animation: "shimmer 1.5s infinite linear" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 13, width: "55%", borderRadius: 6, background: shimBg, marginBottom: 8, backgroundImage: `linear-gradient(90deg, ${shimBg} 0px, ${shimHi} 80px, ${shimBg} 160px)`, backgroundSize: "200px 100%", animation: "shimmer 1.5s infinite linear" }} />
            <div style={{ height: 11, width: "35%", borderRadius: 6, background: shimBg, backgroundImage: `linear-gradient(90deg, ${shimBg} 0px, ${shimHi} 80px, ${shimBg} 160px)`, backgroundSize: "200px 100%", animation: "shimmer 1.5s infinite linear" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ title, noMargin, darkMode }) {
  return (
    <div style={{ fontSize: 19, fontWeight: 700, color: darkMode ? "#fff" : "#111", letterSpacing: -0.5, marginBottom: noMargin ? 0 : 14 }}>{title}</div>
  );
}

function Empty({ emoji, text, sub, darkMode }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>{emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: darkMode ? "#a0a0b8" : "#555", marginBottom: 8 }}>{text}</div>
      <div style={{ fontSize: 14 }}>{sub}</div>
    </div>
  );
}

function ToggleBtn({ active, onClick, title, children, darkMode }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${active ? "#1db954" : (darkMode ? "#2a2a3e" : "#ddd")}`, background: active ? "rgba(29,185,84,0.15)" : (darkMode ? "#1a1a28" : "#fff"), color: active ? "#1db954" : "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
      {children}
    </button>
  );
}

function PauseIcon({ size = 24, color = "currentColor" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>; }
function ShuffleIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>; }
function RepeatIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>; }