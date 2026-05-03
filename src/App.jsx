import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import Player from "./components/Player";
import { PLAYLISTS, GENRES } from "./data/songs";
import { searchSongs, getTrending, prefetchSongs } from "./api";

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

  const playerRef = useRef(null);
  const progressInterval = useRef(null);

  // ── Responsive detection ──────────────────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── YouTube IFrame API ────────────────────────────────
  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("yt-player", {
        height: "0", width: "0",
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0 },
        events: {
          onReady: (e) => { e.target.setVolume(volume * 100); },
          onStateChange: (e) => {
            const YT = window.YT.PlayerState;
            if (e.data === YT.PLAYING) { setIsPlaying(true); setIsBuffering(false); startProgressTracking(); }
            else if (e.data === YT.PAUSED) { setIsPlaying(false); stopProgressTracking(); }
            else if (e.data === YT.BUFFERING) { setIsBuffering(true); }
            else if (e.data === YT.ENDED) {
              stopProgressTracking();
              if (isRepeat) { playerRef.current.seekTo(0); playerRef.current.playVideo(); }
              else { nextSong(); }
            }
          },
          onError: () => { setIsBuffering(false); nextSong(); },
        },
      });
    };
    return () => stopProgressTracking();
  }, []);

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
    if (progressInterval.current) { clearInterval(progressInterval.current); progressInterval.current = null; }
  }

  // ── Volume sync ───────────────────────────────────────
  useEffect(() => {
    if (!playerRef.current?.setVolume) return;
    if (isMuted) { playerRef.current.mute(); }
    else { playerRef.current.unMute(); playerRef.current.setVolume(volume * 100); }
    localStorage.setItem("sw_volume", volume.toString());
  }, [volume, isMuted]);

  // ── Media keys ────────────────────────────────────────
  useEffect(() => {
    if (!currentSong || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title, artist: currentSong.artist,
      artwork: [{ src: currentSong.thumbnail, sizes: "512x512", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", togglePlay);
    navigator.mediaSession.setActionHandler("pause", togglePlay);
    navigator.mediaSession.setActionHandler("nexttrack", nextSong);
    navigator.mediaSession.setActionHandler("previoustrack", prevSong);
    localStorage.setItem("sw_current_song", JSON.stringify(currentSong));
  }, [currentSong]);

  useEffect(() => {
    if (songs.length > 0) prefetchSongs(songs.slice(0, 5));
  }, [songs]);

  // ── On mount ──────────────────────────────────────────
  useEffect(() => {
    loadTrending();
    try {
      const saved = localStorage.getItem("sw_current_song");
      if (saved) setCurrentSong(JSON.parse(saved));
      const savedVol = localStorage.getItem("sw_volume");
      if (savedVol) setVolume(parseFloat(savedVol));
    } catch (e) {}
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  async function loadTrending() {
    setIsLoading(true);
    const trending = await getTrending();
    setSongs(trending);
    setIsLoading(false);
  }

  async function handleSearch(query) {
    setSearchQuery(query);
    if (!query.trim()) { loadTrending(); return; }
    setIsLoading(true);
    setCurrentPage("search");
    const results = await searchSongs(query);
    setSongs(results);
    setIsLoading(false);
  }

  function playSong(song) {
    if (!song) return;
    setCurrentSong(song);
    setProgress(0);
    setIsBuffering(true);
    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(song.youtubeId);
    }
  }

  function togglePlay() {
    if (!currentSong) { if (songs.length > 0) playSong(songs[0]); return; }
    if (!playerRef.current) return;
    if (isPlaying) { playerRef.current.pauseVideo(); }
    else { playerRef.current.playVideo(); }
  }

  function nextSong() {
    if (!songs.length) return;
    if (isShuffle) { playSong(songs[Math.floor(Math.random() * songs.length)]); return; }
    const idx = songs.findIndex((s) => s.id === currentSong?.id);
    playSong(songs[(idx + 1) % songs.length]);
  }

  function prevSong() {
    if (progress > 3) { playerRef.current?.seekTo(0); return; }
    if (!songs.length) return;
    const idx = songs.findIndex((s) => s.id === currentSong?.id);
    playSong(songs[(idx - 1 + songs.length) % songs.length]);
  }

  function seekTo(pct) {
    if (!duration || !playerRef.current) return;
    playerRef.current.seekTo(pct * duration, true);
    setProgress(Math.floor(pct * duration));
  }

  function toggleLike(id) {
    setLikedSongs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const sharedProps = {
    songs, currentSong, isPlaying, isBuffering, isLoading,
    likedSongs, playSong, toggleLike, togglePlay, nextSong, prevSong,
    progress, duration, seekTo, volume, setVolume, isMuted, setIsMuted,
    isShuffle, setIsShuffle, isRepeat, setIsRepeat,
    currentPage, setCurrentPage, searchQuery, handleSearch,
    playlists: PLAYLISTS, genres: GENRES, loadTrending,
    handleGenreSearch: handleSearch, isMobile,
  };

  return (
    <>
      {/* Hidden YouTube Player */}
      <div style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, pointerEvents: "none" }}>
        <div id="yt-player" />
      </div>

      {isMobile ? <MobileLayout {...sharedProps} /> : <DesktopLayout {...sharedProps} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   DESKTOP LAYOUT — exactly like Spotify
   Left sidebar (fixed) + scrollable main + bottom player
════════════════════════════════════════════════════════ */
function DesktopLayout(props) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "#0a0a0f",
      overflow: "hidden",
    }}>
      {/* Top: sidebar + main */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          currentPage={props.currentPage}
          setCurrentPage={props.setCurrentPage}
          playlists={props.playlists}
          likedCount={props.likedSongs.size}
          isMobile={false}
        />
        <MainContent {...props} />
      </div>
      {/* Bottom: player always visible */}
      <Player {...props} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MOBILE LAYOUT — exactly like JioSaavn / Spotify mobile
   Top header + scrollable content + mini player + bottom nav
════════════════════════════════════════════════════════ */
function MobileLayout(props) {
  const { currentPage, setCurrentPage, likedSongs } = props;

  const tabs = [
    { id: "home",    icon: HomeIcon,    label: "Home" },
    { id: "search",  icon: SearchIcon,  label: "Search" },
    { id: "library", icon: LibraryIcon, label: "Library" },
    { id: "liked",   icon: HeartIcon,   label: "Liked" },
  ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      height: "100dvh",   /* dynamic viewport height — fixes iOS safari */
      background: "#0a0a0f",
      overflow: "hidden",
    }}>
      {/* Mobile Top Header */}
      <MobileHeader {...props} />

      {/* Scrollable Content — FULL remaining height */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>
        <MainContent {...props} />
      </div>

      {/* Mini Player — above bottom nav, only when song exists */}
      {props.currentSong && <MiniPlayer {...props} />}

      {/* Bottom Nav */}
      <nav style={{
        display: "flex",
        background: "#111118",
        borderTop: "1px solid #1e1e2e",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        flexShrink: 0,
      }}>
        {tabs.map(tab => {
          const active = currentPage === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setCurrentPage(tab.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 3, padding: "10px 0",
                background: "none", border: "none", cursor: "pointer",
                color: active ? "#1db954" : "#6b7280",
                transition: "color 0.2s",
              }}>
              <Icon size={22} active={active} />
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: "inherit", letterSpacing: 0.2 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ── Mobile Header ───────────────────────────────────── */
function MobileHeader({ currentPage, searchQuery }) {
  const pageTitle = {
    home: "Good vibes 🎵",
    search: "Discover",
    library: "Your Library",
    liked: "Liked Songs",
    downloads: "Downloads",
  }[currentPage] || "SoundWave";

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 20px 12px",
      background: "#0a0a0f",
      flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, letterSpacing: 0.5, marginBottom: 2 }}>
          SOUNDWAVE
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: -0.5 }}>
          {pageTitle}
        </div>
      </div>
      <div style={{
        width: 38, height: 38, borderRadius: "50%",
        background: "linear-gradient(135deg,#1db954,#169c47)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16,
      }}>
        👤
      </div>
    </header>
  );
}

/* ── Mini Player (mobile only, above bottom nav) ─────── */
function MiniPlayer({ currentSong, isPlaying, isBuffering, togglePlay, nextSong, progress, duration }) {
  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <div style={{
      margin: "0 10px 6px",
      background: "#1a1a2e",
      borderRadius: 14,
      overflow: "hidden",
      flexShrink: 0,
      boxShadow: "0 -2px 20px rgba(0,0,0,0.4)",
    }}>
      {/* Thin progress line at top */}
      <div style={{ height: 2, background: "#2a2a3e" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#1db954", transition: "width 1s linear" }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 12 }}>
        {/* Thumbnail */}
        <img
          src={currentSong.thumbnail}
          alt={currentSong.title}
          style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
        />

        {/* Song info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: "#ffffff",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {currentSong.title}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentSong.artist}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button onClick={togglePlay}
            style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "#ffffff", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
            {isBuffering
              ? <div style={{ width: 18, height: 18, border: "2px solid #0a0a0f", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              : isPlaying
                ? <PauseIcon size={18} color="#0a0a0f" />
                : <PlayIcon size={18} color="#0a0a0f" />}
          </button>
          <button onClick={nextSong}
            style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#a0a0b8" }}>
            <NextIcon size={20} />
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── SVG Icons ───────────────────────────────────────── */
function HomeIcon({ size = 24, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function SearchIcon({ size = 24, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function LibraryIcon({ size = 24, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round">
      <path d="M3 3h18v18H3z" /><path d="M3 9h18M9 21V9" />
    </svg>
  );
}
function HeartIcon({ size = 24, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function PlayIcon({ size = 24, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M8 5v14l11-7z" /></svg>;
}
function PauseIcon({ size = 24, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
}
function NextIcon({ size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>;
}
function PrevIcon({ size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>;
}
