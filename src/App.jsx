import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import Player from "./components/Player";
import { PLAYLISTS, GENRES } from "./data/songs";
import { searchSongs, getTrending, prefetchSongs } from "./api";
import { supabase } from "./supabase";
import { getLikedSongs, likeSong, unlikeSong, addToHistory, getPlaylists, addSongToPlaylist, removeSongFromPlaylist, createPlaylist } from "./db";
import Auth from "./components/Auth";
import { useContext } from "react";
import { ThemeContext } from "./ThemeContext";
import ThemeToggle from "./components/ThemeToggle";
import useOfflineCache from "./hooks/useOfflineCache";
import Logo from "./components/Logo";
import { MiniPlayer } from "./components/Player";

export default function App() {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentPage, setCurrentPage] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedSongs, setLikedSongs] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [user, setUser] = useState(null);
  const [dbPlaylists, setDbPlaylists] = useState([]);
const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
const [selectedSong, setSelectedSong] = useState(null);
const [toast, setToast] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
const { cachedSongs, isCached, deleteCachedSong } = useOfflineCache(currentSong, isPlaying);

// Sleep timer
  const [sleepMinutes, setSleepMinutes] = useState(null);
  const [sleepRemaining, setSleepRemaining] = useState(null);
  const sleepRef = useRef(null);

  const playerRef = useRef(null);
  const progressInterval = useRef(null);
  const songsRef = useRef(songs);
  const currentSongRef = useRef(currentSong);
  const isRepeatRef = useRef(isRepeat);
  const isShuffleRef = useRef(isShuffle);
  const playSongFn = useRef(null);

  useEffect(() => { songsRef.current = songs; }, [songs]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Sleep timer logic
  useEffect(() => {
    if (sleepMinutes === null) {
      clearInterval(sleepRef.current);
      setSleepRemaining(null);
      return;
    }
    setSleepRemaining(sleepMinutes * 60);
    clearInterval(sleepRef.current);
    sleepRef.current = setInterval(() => {
      setSleepRemaining(prev => {
        if (prev <= 1) {
          clearInterval(sleepRef.current);
          playerRef.current?.pauseVideo();
          setSleepMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(sleepRef.current);
  }, [sleepMinutes]);

  function startProgressTracking() {
    stopProgressTracking();
    progressInterval.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setProgress(Math.floor(playerRef.current.getCurrentTime()));
        setDuration(Math.floor(playerRef.current.getDuration()) || 0);
      }
    }, 1000);
  }

  function stopProgressTracking() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  function autoNext() {
    const list = songsRef.current;
    const cur = currentSongRef.current;
    if (!list.length) return;
    if (isRepeatRef.current) { playerRef.current?.seekTo(0); playerRef.current?.playVideo(); return; }
    if (isShuffleRef.current) { playSongFn.current?.(list[Math.floor(Math.random() * list.length)]); return; }
    const idx = list.findIndex(s => s.id === cur?.id);
    playSongFn.current?.(list[(idx + 1) % list.length]);
  }

  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("yt-player", {
        height: "0", width: "0",
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0 },
        events: {
          onReady: e => { e.target.setVolume(80); },
          onStateChange: e => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) { setIsPlaying(true); setIsBuffering(false); startProgressTracking(); }
            else if (e.data === S.PAUSED) { setIsPlaying(false); stopProgressTracking(); }
            else if (e.data === S.BUFFERING) { setIsBuffering(true); }
            else if (e.data === S.ENDED) { stopProgressTracking(); autoNext(); }
          },
          onError: () => { setIsBuffering(false); autoNext(); },
        },
      });
    };
    return () => stopProgressTracking();
  }, []);

  useEffect(() => {
    if (!playerRef.current?.setVolume) return;
    isMuted ? playerRef.current.mute() : (playerRef.current.unMute(), playerRef.current.setVolume(volume * 100));
    localStorage.setItem("sw_volume", volume.toString());
  }, [volume, isMuted]);

  useEffect(() => {
    if (!currentSong || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title, artist: currentSong.artist,
      artwork: [{ src: currentSong.thumbnail, sizes: "512x512", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", () => togglePlay());
    navigator.mediaSession.setActionHandler("pause", () => togglePlay());
    navigator.mediaSession.setActionHandler("nexttrack", () => nextSong());
    navigator.mediaSession.setActionHandler("previoustrack", () => prevSong());
    localStorage.setItem("sw_current_song", JSON.stringify(currentSong));
  }, [currentSong]);

  useEffect(() => { if (songs.length > 0) prefetchSongs(songs.slice(0, 5)); }, [songs]);

  useEffect(() => {
    loadTrending();
    try {
      const s = localStorage.getItem("sw_current_song"); if (s) setCurrentSong(JSON.parse(s));
      const v = localStorage.getItem("sw_volume"); if (v) setVolume(parseFloat(v));
    } catch (e) {}
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) loadUserData(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else setLikedSongs(new Set());
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId) {
  const liked = await getLikedSongs(userId);
  setLikedSongs(new Set(liked.map(s => s.song_id)));
  const playlists = await getPlaylists(userId);
  setDbPlaylists(playlists);
}

  async function loadTrending() {
    setIsLoading(true);
    setSongs(await getTrending((isWaking) => {
  setToast(isWaking ? "⏳ Server waking up, please wait..." : null);
}));
    setIsLoading(false);
  }

  async function handleSearch(query) {
    setSearchQuery(query);
    if (!query.trim()) { loadTrending(); return; }
    setIsLoading(true);
    setCurrentPage("search");
    setSongs(await searchSongs(query));
    setIsLoading(false);
  }

  function playSong(song) {
    if (!song) return;
    setCurrentSong(song);
    setProgress(0);
    setIsBuffering(true);
    playerRef.current?.loadVideoById(song.youtubeId);
    if (user) addToHistory(user.id, song);
  }
  playSongFn.current = playSong;

  function togglePlay() {
    if (!currentSong) { if (songsRef.current.length > 0) playSong(songsRef.current[0]); return; }
    isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo();
  }

  function nextSong() {
    const list = songsRef.current, cur = currentSongRef.current;
    if (!list.length) return;
    if (isShuffle) { playSong(list[Math.floor(Math.random() * list.length)]); return; }
    const idx = list.findIndex(s => s.id === cur?.id);
    playSong(list[(idx + 1) % list.length]);
  }

  function prevSong() {
    if (progress > 3) { playerRef.current?.seekTo(0); setProgress(0); return; }
    const list = songsRef.current, cur = currentSongRef.current;
    if (!list.length) return;
    const idx = list.findIndex(s => s.id === cur?.id);
    playSong(list[(idx - 1 + list.length) % list.length]);
  }

  function seekTo(pct) {
    if (!duration || !playerRef.current) return;
    playerRef.current.seekTo(pct * duration, true);
    setProgress(Math.floor(pct * duration));
  }

  async function toggleLike(id) {
    const song = songs.find(s => s.id === id);
    setLikedSongs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (user) unlikeSong(user.id, id);
      } else {
        next.add(id);
        if (user && song) likeSong(user.id, song);
      }
      return next;
    });
  }

  function shareSong(song) {
    if (!song) return;
    const text = `🎵 Listening to "${song.title}" by ${song.artist} on SoundWave!\nhttps://soundwave-chi.vercel.app`;
    if (navigator.share) {
      navigator.share({ title: song.title, text, url: "https://soundwave-chi.vercel.app" }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => alert("Link copied to clipboard!"));
    }
  }

  function showToast(msg) {
  setToast(msg);
  setTimeout(() => setToast(null), 2500);
}

function handleAddToPlaylist(song) {
  setSelectedSong(song);
  setShowAddToPlaylist(true);
}

async function handleAddSongToPlaylist(playlistId) {
  if (!selectedSong || !user) return;
  const result = await addSongToPlaylist(playlistId, selectedSong);
  setShowAddToPlaylist(false);
  if (result?.alreadyExists) {
    showToast("Already in playlist!");
  } else {
    showToast("Added to playlist ✅");
    const playlists = await getPlaylists(user.id);
    setDbPlaylists(playlists);
  }
}

async function handleCreatePlaylist(name, emoji) {
  if (!user) return;
  await createPlaylist(user.id, name, emoji);
  const playlists = await getPlaylists(user.id);
  setDbPlaylists(playlists);
}

  const sharedProps = {
    songs, currentSong, isPlaying, isBuffering, isLoading,
    likedSongs, playSong, toggleLike, togglePlay, nextSong, prevSong,
    progress, duration, seekTo, volume, setVolume, isMuted, setIsMuted,
    isShuffle, setIsShuffle, isRepeat, setIsRepeat,
    currentPage, setCurrentPage, searchQuery, handleSearch,
    playlists: PLAYLISTS, genres: GENRES, loadTrending,
    handleGenreSearch: handleSearch, isMobile,
    onLogout: () => supabase.auth.signOut(),
    user,
    dbPlaylists,
    handleAddToPlaylist,
    handleAddSongToPlaylist,
    handleCreatePlaylist,
    showAddToPlaylist,
    setShowAddToPlaylist,
    selectedSong,
    toast,
    cachedSongs,
isCached,
deleteCachedSong,
};

  if (authLoading) {
  return (
    <div style={{
      height: "100vh", background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 0,
    }}>
      <div style={{ textAlign: "center" }}>
        {/* Animated logo */}
        <div style={{
          width: 80, height: 80,
          background: "linear-gradient(135deg, #6c63ff, #ff6b9d)",
          borderRadius: 22, margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 32px rgba(108,99,255,0.5)",
          animation: "logoPulse 2s ease infinite",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "rgba(255,255,255,0.12)", borderRadius: "22px 22px 0 0" }} />
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
            <circle cx="8.5" cy="17.5" r="3.5" fill="white"/>
            <rect x="11.5" y="5" width="2.5" height="13" rx="1.25" fill="white"/>
            <rect x="11.5" y="5" width="9" height="2.5" rx="1.25" fill="white"/>
          </svg>
        </div>
        <div style={{
          fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 6,
          background: "linear-gradient(135deg, #6c63ff, #ff6b9d)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>SoundWave</div>
        <div style={{ color: "#6b7280", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: 32 }}>Every Song. Every World.</div>

        {/* Loading dots */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "linear-gradient(135deg, #6c63ff, #ff6b9d)",
              animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes logoPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(108,99,255,0.5); transform: scale(1); }
          50% { box-shadow: 0 12px 48px rgba(255,107,157,0.6); transform: scale(1.04); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

  if (!user) return <Auth onLogin={setUser} />;

  return ( 
    <>
      <div style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, pointerEvents: "none" }}>
        <div id="yt-player" />
      </div>
      {isMobile ? <MobileLayout {...sharedProps} /> : <DesktopLayout {...sharedProps} />}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
          background: "#1db954", color: "#000", padding: "12px 24px",
          borderRadius: 100, fontSize: 14, fontWeight: 700,
          zIndex: 99999, boxShadow: "0 4px 20px rgba(29,185,84,0.4)",
          whiteSpace: "nowrap",
        }}>{toast}</div>
      )}

      {/* Add to playlist modal */}
      {showAddToPlaylist && (
        <AddToPlaylistModal
          playlists={dbPlaylists}
          song={selectedSong}
          onAdd={handleAddSongToPlaylist}
          onClose={() => setShowAddToPlaylist(false)}
          onCreate={handleCreatePlaylist}
        />
      )}
    </>
  );
}

function DesktopLayout(props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0f", overflow: "hidden" }}>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar currentPage={props.currentPage} setCurrentPage={props.setCurrentPage} playlists={props.playlists} likedCount={props.likedSongs.size} onLogout={props.onLogout} />
        <MainContent {...props} />
      </div>
      <Player {...props} />
    </div>
  );
}

function MobileLayout(props) {
  const { currentPage, setCurrentPage, likedSongs } = props;
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const tabs = [
    { id: "home",    label: "Home",    Icon: HomeIcon },
    { id: "search",  label: "Search",  Icon: SearchIcon },
    { id: "library", label: "Library", Icon: LibraryIcon },
    { id: "liked",   label: "Liked",   Icon: HeartIcon },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0a0a0f", overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px 10px", flexShrink: 0,
        background: "linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0) 100%)",
      }}>
        <Logo size={34} textSize={18} />
        <button onClick={() => setShowDrawer(true)}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, cursor: "pointer",
            padding: "8px 10px", color: "#a0a0b8",
            transition: "all 0.2s ease",
          }}
          onTouchStart={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
          onTouchEnd={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Main scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>
        <MainContent {...props} />
      </div>

      {/* Mini player */}
      {props.currentSong && <MiniPlayer {...props} onExpand={() => setShowFullPlayer(true)} />}

      {/* Bottom nav */}
      <nav style={{ display: "flex", background: "#0d0d18", borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: "env(safe-area-inset-bottom, 8px)", flexShrink: 0 }}>
        {tabs.map(({ id, label, Icon }) => {
          const active = currentPage === id;
          return (
            <button key={id} onClick={() => setCurrentPage(id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 4, padding: "10px 0",
                background: "none", border: "none", cursor: "pointer",
                color: active ? "#1db954" : "#6b7280",
                position: "relative", transition: "color 0.2s ease",
              }}>
              {active && (
                <div style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                  width: 32, height: 2, background: "#1db954", borderRadius: "0 0 4px 4px",
                  boxShadow: "0 0 8px rgba(29,185,84,0.6)",
                }} />
              )}
              <div style={{ transform: active ? "scale(1.1)" : "scale(1)", transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
                <Icon size={22} active={active} />
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, fontFamily: "inherit", letterSpacing: active ? 0.3 : 0 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {showFullPlayer && <FullScreenPlayer {...props} onClose={() => setShowFullPlayer(false)} />}
      {showDrawer && <MobileDrawer {...props} onClose={() => setShowDrawer(false)} onLogout={props.onLogout} />}
    </div>
  );
}

function FullScreenPlayer({
  currentSong, isPlaying, isBuffering, togglePlay, nextSong, prevSong,
  progress, duration, seekTo, isShuffle, setIsShuffle, isRepeat, setIsRepeat,
  likedSongs, toggleLike, volume, setVolume, isMuted, setIsMuted, onClose,
  shareSong, songs, playSong, sleepMinutes, setSleepMinutes, sleepRemaining,
}) {
  const [showQueue, setShowQueue] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const pct = duration ? (progress / duration) * 100 : 0;
  const liked = currentSong && likedSongs.has(currentSong.id);
  const fmt = s => !s || isNaN(s) ? "0:00" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const fmtSleep = s => s ? `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}` : "";
  const currentIdx = songs.findIndex(s => s.id === currentSong?.id);
  const upNext = songs.slice(currentIdx + 1, currentIdx + 8);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0a0a14", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Blurred bg */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `url(${currentSong?.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(40px) brightness(0.25)", transform: "scale(1.1)" }} />

      {/* Queue panel overlay */}
      {showQueue && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 12px", flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Up Next</div>
            <button onClick={() => setShowQueue(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          {/* Now playing */}
          {currentSong && (
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1db954", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Now Playing</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                <img src={currentSong.thumbnail} alt={currentSong.title} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "2px solid #1db954" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1db954", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentSong.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{currentSong.artist}</div>
                </div>
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 32px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Up Next</div>
            {upNext.length === 0 && <div style={{ color: "#6b7280", fontSize: 14, padding: "20px 0" }}>No more songs in queue</div>}
            {upNext.map(s => (
              <div key={s.id} onClick={() => { playSong(s); setShowQueue(false); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <img src={s.thumbnail} alt={s.title} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.artist}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sleep timer picker */}
      {showSleepPicker && (
        <div style={{ position: "absolute", inset: 0, zIndex: 11, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Sleep Timer</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 28 }}>Music will stop after selected time</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
            {[5, 10, 15, 20, 30, 45, 60].map(m => (
              <button key={m} onClick={() => { setSleepMinutes(m); setShowSleepPicker(false); }}
                style={{ padding: "14px 0", borderRadius: 14, border: sleepMinutes === m ? "2px solid #1db954" : "1px solid rgba(255,255,255,0.12)", background: sleepMinutes === m ? "rgba(29,185,84,0.15)" : "rgba(255,255,255,0.06)", color: sleepMinutes === m ? "#1db954" : "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {m} minutes
              </button>
            ))}
            {sleepMinutes && (
              <button onClick={() => { setSleepMinutes(null); setShowSleepPicker(false); }}
                style={{ padding: "14px 0", borderRadius: 14, border: "1px solid #ff6b6b", background: "rgba(255,107,107,0.1)", color: "#ff6b6b", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel Timer
              </button>
            )}
          </div>
          <button onClick={() => setShowSleepPicker(false)} style={{ marginTop: 20, background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Close</button>
        </div>
      )}

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "0 0 env(safe-area-inset-bottom, 16px)" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px", flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 2 }}>NOW PLAYING</div>
            {sleepRemaining && (
              <div style={{ fontSize: 11, color: "#1db954", marginTop: 2 }}>😴 {fmtSleep(sleepRemaining)}</div>
            )}
          </div>
          <button onClick={() => currentSong && toggleLike(currentSong.id)}
            style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: liked ? "#1db954" : "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* Album art */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 32px" }}>
          <div style={{ width: "100%", maxWidth: 320, aspectRatio: "1/1", borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
            <img src={currentSong?.thumbnail} alt={currentSong?.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
{/* Lyrics */}
<LyricsPanel currentSong={currentSong} progress={progress} />
        {/* Controls */}
        <div style={{ flexShrink: 0, padding: "0 28px 16px" }}>
          {/* Title + share */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentSong?.title}</div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{currentSong?.artist}</div>
            </div>
            <button onClick={() => shareSong(currentSong)}
              style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 20 }}>
            <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - r.left) / r.width); }}
              style={{ height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 4, cursor: "pointer", marginBottom: 10, position: "relative" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 4, transition: "width 1s linear" }} />
              <div style={{ position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%,-50%)", width: 14, height: 14, background: "#fff", borderRadius: "50%", boxShadow: "0 0 8px rgba(255,255,255,0.5)", pointerEvents: "none" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{fmt(progress)}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{fmt(duration)}</span>
            </div>
          </div>

          {/* Playback controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => setIsShuffle(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: isShuffle ? "#1db954" : "rgba(255,255,255,0.4)", padding: 8 }}><ShuffleIcon size={22} /></button>
            <button onClick={prevSong} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 8 }}><PrevIcon size={34} /></button>
            <button onClick={togglePlay}
              style={{ width: 68, height: 68, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 24px rgba(255,255,255,0.2)" }}>
              {isBuffering
                ? <div style={{ width: 26, height: 26, border: "3px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin2 0.8s linear infinite" }} />
                : isPlaying ? <PauseIcon size={30} color="#000" /> : <PlayIcon size={30} color="#000" />}
            </button>
            <button onClick={nextSong} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 8 }}><NextIcon size={34} /></button>
            <button onClick={() => setIsRepeat(r => !r)} style={{ background: "none", border: "none", cursor: "pointer", color: isRepeat ? "#1db954" : "rgba(255,255,255,0.4)", padding: 8 }}><RepeatIcon size={22} /></button>
          </div>

          {/* Bottom row: volume + queue + sleep */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setIsMuted(m => !m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                {isMuted
                  ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>}
              </svg>
            </button>
            <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); setIsMuted(false); }}
              style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 4, cursor: "pointer" }}>
              <div style={{ width: `${isMuted ? 0 : volume * 100}%`, height: "100%", background: "rgba(255,255,255,0.7)", borderRadius: 4 }} />
            </div>
            {/* Queue btn */}
            <button onClick={() => setShowQueue(true)}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, cursor: "pointer", padding: "8px 10px", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "inherit" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            {/* Sleep btn */}
            <button onClick={() => setShowSleepPicker(true)}
              style={{ background: sleepMinutes ? "rgba(29,185,84,0.2)" : "rgba(255,255,255,0.1)", border: sleepMinutes ? "1px solid #1db954" : "none", borderRadius: 10, cursor: "pointer", padding: "8px 10px", color: sleepMinutes ? "#1db954" : "rgba(255,255,255,0.7)", fontSize: 16, display: "flex", alignItems: "center" }}>
              😴
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin2 { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
function LyricsPanel({ currentSong, progress }) {
  const [lyrics, setLyrics] = useState([]);
  const [plainLyrics, setPlainLyrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [synced, setSynced] = useState(false);
  const activeRef = useRef(null);

  useEffect(() => {
    if (!currentSong) return;
    setLyrics([]); setPlainLyrics(null); setSynced(false);
    setLoading(true);
    const artist = encodeURIComponent((currentSong.artist || "").split(" official")[0]);
    const title = encodeURIComponent((currentSong.title || "").replace(/\(.*?\)/g, "").trim());

    fetch(`https://lrclib.net/api/get?artist_name=${artist}&track_name=${title}`)
      .then(r => r.json())
      .then(data => {
        if (data.syncedLyrics) {
          // Parse synced lyrics "[mm:ss.xx] line"
          const lines = data.syncedLyrics.split("\n").map(line => {
            const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
            if (!match) return null;
            const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
            return { time, text: match[3].trim() };
          }).filter(Boolean);
          setLyrics(lines);
          setSynced(true);
          setLoading(false);
        } else if (data.plainLyrics) {
          setPlainLyrics(data.plainLyrics);
          setLoading(false);
        } else {
          // Fallback to lyrics.ovh for Hindi songs
          return fetch(`https://api.lyrics.ovh/v1/${artist}/${title}`)
            .then(r => r.json())
            .then(d => {
              if (d.lyrics) setPlainLyrics(d.lyrics);
              setLoading(false);
            });
        }
      })
      .catch(() => setLoading(false));
  }, [currentSong?.id]);

  // Auto-scroll active line into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [progress]);

  // Find active line index
  const activeIdx = synced ? lyrics.reduce((acc, line, i) => line.time <= progress ? i : acc, -1) : -1;

  if (!show) return (
    <div style={{ textAlign: "center", padding: "0 28px 8px" }}>
      <button onClick={() => setShow(true)}
        style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 20, padding: "8px 24px", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        🎵 Show Lyrics
      </button>
    </div>
  );

  return (
    <div style={{ margin: "0 20px 12px", background: "rgba(0,0,0,0.5)", borderRadius: 16, padding: "16px", maxHeight: 200, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1db954", letterSpacing: 1, textTransform: "uppercase" }}>
          {synced ? "⚡ Live Lyrics" : "Lyrics"}
        </div>
        <button onClick={() => setShow(false)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18 }}>×</button>
      </div>

      {loading && <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Loading lyrics...</div>}

      {!loading && !synced && !plainLyrics && (
        <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No lyrics found</div>
      )}

      {!loading && synced && lyrics.map((line, i) => (
        <div key={i}
          ref={i === activeIdx ? activeRef : null}
          style={{
            fontSize: i === activeIdx ? 16 : 13,
            fontWeight: i === activeIdx ? 700 : 400,
            color: i === activeIdx ? "#fff" : "rgba(255,255,255,0.3)",
            lineHeight: 1.8,
            padding: "2px 0",
            transition: "all 0.3s ease",
            transform: i === activeIdx ? "scale(1.03)" : "scale(1)",
            transformOrigin: "left",
          }}>
          {line.text || "♪"}
        </div>
      ))}

      {!loading && !synced && plainLyrics && (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
          {plainLyrics}
        </div>
      )}
    </div>
  );
}
function MobileDrawer({ currentPage, setCurrentPage, playlists, likedSongs, onClose, onLogout }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 300, background: "#111118", display: "flex", flexDirection: "column", boxShadow: "4px 0 32px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px" }}>
<Logo size={32} textSize={17} />          
<button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
          {[
            { id: "home",      label: "Home",                       emoji: "🏠" },
            { id: "search",    label: "Discover",                   emoji: "🔍" },
            { id: "library",   label: "Library",                    emoji: "🎵" },
            { id: "liked",     label: `Liked (${likedSongs.size})`, emoji: "❤️" },
            { id: "downloads", label: "Downloads",                  emoji: "⬇️" },
          ].map(item => (
            <button key={item.id} onClick={() => { setCurrentPage(item.id); onClose(); }}
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 14px", borderRadius: 12, background: currentPage === item.id ? "rgba(29,185,84,0.12)" : "none", border: "none", cursor: "pointer", color: currentPage === item.id ? "#1db954" : "#a0a0b8", fontSize: 15, fontWeight: currentPage === item.id ? 600 : 400, fontFamily: "inherit", textAlign: "left", marginBottom: 2 }}>
              <span style={{ fontSize: 20 }}>{item.emoji}</span>{item.label}
            </button>
          ))}
          <div style={{ padding: "16px 14px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#6b7280", textTransform: "uppercase" }}>Playlists</div>
          {playlists.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{p.emoji}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#f0f0ff" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#606080" }}>{p.songIds?.length || 0} songs</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 16px 0" }}><ThemeToggle /></div>
        <div style={{ padding: "12px 16px 20px", flexShrink: 0 }}>
          <button onClick={() => { onLogout(); onClose(); }}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", borderRadius: 12, background: "none", border: "1px solid #2a2a3e", cursor: "pointer", color: "#6b7280", fontSize: 14, fontFamily: "inherit" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function AddToPlaylistModal({ playlists, song, onAdd, onClose, onCreate }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const emojis = ["🎵", "🎸", "🎤", "🎧", "🎹", "🔥", "💫", "🌙"];
  const [selectedEmoji, setSelectedEmoji] = useState("🎵");

  async function handleCreate() {
    if (!newName.trim()) return;
    await onCreate(newName.trim(), selectedEmoji);
    setShowCreate(false);
    setNewName("");
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 500,
        background: "#1a1a2e", borderRadius: "20px 20px 0 0",
        padding: "20px 20px 40px", zIndex: 1,
        maxHeight: "70vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Add to playlist</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        {/* Song info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 12, marginBottom: 16 }}>
          <img src={song?.thumbnail} alt={song?.title} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song?.title}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{song?.artist}</div>
          </div>
        </div>

        {/* Create new playlist */}
        {showCreate ? (
          <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 13, color: "#a0a0b8", marginBottom: 10 }}>Choose emoji</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {emojis.map(e => (
                <button key={e} onClick={() => setSelectedEmoji(e)}
                  style={{ fontSize: 22, background: selectedEmoji === e ? "rgba(29,185,84,0.2)" : "rgba(255,255,255,0.06)", border: selectedEmoji === e ? "1px solid #1db954" : "1px solid transparent", borderRadius: 8, width: 40, height: 40, cursor: "pointer" }}>
                  {e}
                </button>
              ))}
            </div>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Playlist name..."
              autoFocus
              style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid #2a2a3e", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowCreate(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", color: "#a0a0b8", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={handleCreate}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#1db954", border: "none", color: "#000", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
                Create
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)}
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", borderRadius: 12, background: "rgba(29,185,84,0.1)", border: "1px dashed #1db954", cursor: "pointer", color: "#1db954", fontSize: 14, fontWeight: 600, fontFamily: "inherit", marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>+</span> Create new playlist
          </button>
        )}

        {/* Existing playlists */}
        {playlists.length === 0 && !showCreate && (
          <div style={{ textAlign: "center", padding: "20px", color: "#6b7280", fontSize: 14 }}>
            No playlists yet — create one above!
          </div>
        )}
        {playlists.map(p => (
          <button key={p.id} onClick={() => onAdd(p.id)}
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontFamily: "inherit", marginBottom: 8, transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(29,185,84,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: p.color || "#1db954", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {p.cover_emoji || "🎵"}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{p.playlist_songs?.length || 0} songs</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeIcon({ size = 24, active }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>; }
function SearchIcon({ size = 24, active }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>; }
function LibraryIcon({ size = 24, active }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round"><path d="M3 3h18v18H3z" /><path d="M3 9h18M9 21V9" /></svg>; }
function HeartIcon({ size = 24, active }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>; }
function PlayIcon({ size = 24, color = "currentColor" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M8 5v14l11-7z" /></svg>; }
function PauseIcon({ size = 24, color = "currentColor" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>; }
function NextIcon({ size = 24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>; }
function PrevIcon({ size = 24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>; }
function ShuffleIcon({ size = 24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /></svg>; }
function RepeatIcon({ size = 24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>; }