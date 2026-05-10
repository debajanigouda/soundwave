import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import Player from "./components/Player";
import { PLAYLISTS, GENRES } from "./data/songs";
import { searchSongs, getTrending, prefetchSongs } from "./api";
import { supabase } from "./supabase";
import { getLikedSongs, likeSong, unlikeSong, addToHistory } from "./db";
import Auth from "./components/Auth";

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
  const [authLoading, setAuthLoading] = useState(true);

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

  function autoNext() {
    const list = songsRef.current;
    const cur  = currentSongRef.current;
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
            if (e.data === S.PLAYING)   { setIsPlaying(true);  setIsBuffering(false); startProgressTracking(); }
            else if (e.data === S.PAUSED)    { setIsPlaying(false); stopProgressTracking(); }
            else if (e.data === S.BUFFERING) { setIsBuffering(true); }
            else if (e.data === S.ENDED)     { stopProgressTracking(); autoNext(); }
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
    navigator.mediaSession.setActionHandler("play",          () => togglePlay());
    navigator.mediaSession.setActionHandler("pause",         () => togglePlay());
    navigator.mediaSession.setActionHandler("nexttrack",     () => nextSong());
    navigator.mediaSession.setActionHandler("previoustrack", () => prevSong());
    localStorage.setItem("sw_current_song", JSON.stringify(currentSong));
  }, [currentSong]);

  useEffect(() => { if (songs.length > 0) prefetchSongs(songs.slice(0, 5)); }, [songs]);

  useEffect(() => {
    loadTrending();
    try {
      const s = localStorage.getItem("sw_current_song"); if (s) setCurrentSong(JSON.parse(s));
      const v = localStorage.getItem("sw_volume");       if (v) setVolume(parseFloat(v));
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
}

  async function loadTrending() {
    setIsLoading(true);
    setSongs(await getTrending());
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
  };

if (authLoading) {
    return (
      <div style={{ height: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 60, height: 60, background: "linear-gradient(135deg,#6c63ff,#ff6b9d)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>♪</div>
          <div style={{ color: "#606080", fontSize: 14 }}>Loading SoundWave...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={setUser}/>;
  }
  return ( 
    <>
      <div style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, pointerEvents: "none" }}>
        <div id="yt-player" />
      </div>
      {isMobile ? <MobileLayout {...sharedProps} /> : <DesktopLayout {...sharedProps} />}
    </>
  );
}

function DesktopLayout(props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0f", overflow: "hidden" }}>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          currentPage={props.currentPage}
          setCurrentPage={props.setCurrentPage}
          playlists={props.playlists}
          likedCount={props.likedSongs.size}
          onLogout={props.onLogout}
        />
        <MainContent {...props} />
      </div>
      <Player {...props} />
    </div>
  );
}

function MobileLayout(props) {
  const { currentPage, setCurrentPage, likedSongs } = props;
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [showDrawer,     setShowDrawer]     = useState(false);
  const tabs = [
    { id: "home",    label: "Home",    Icon: HomeIcon },
    { id: "search",  label: "Search",  Icon: SearchIcon },
    { id: "library", label: "Library", Icon: LibraryIcon },
    { id: "liked",   label: "Liked",   Icon: HeartIcon },
  ];
  const pageTitle = { home: "Good vibes 🎵", search: "Discover", library: "Library", liked: "Liked Songs" }[currentPage] || "SoundWave";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", height: "100dvh", background: "#0a0a0f", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 10px", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, letterSpacing: 1 }}>SOUNDWAVE</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>{pageTitle}</div>
        </div>
        <button onClick={() => setShowDrawer(true)}
          style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, cursor: "pointer", padding: "8px 10px", color: "#a0a0b8" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
      

      {props.currentSong && <MiniPlayer {...props} onExpand={() => setShowFullPlayer(true)} />}

      <nav style={{ display: "flex", background: "#111118", borderTop: "1px solid #1e1e2e", paddingBottom: "env(safe-area-inset-bottom,0px)", flexShrink: 0 }}>
        {tabs.map(({ id, label, Icon }) => {
          const active = currentPage === id;
          return (
            <button key={id} onClick={() => setCurrentPage(id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "10px 0", background: "none", border: "none", cursor: "pointer", color: active ? "#1db954" : "#6b7280" }}>
              <Icon size={22} active={active} />
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: "inherit" }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {showFullPlayer && <FullScreenPlayer {...props} onClose={() => setShowFullPlayer(false)} />}
{showDrawer && <MobileDrawer {...props} onClose={() => setShowDrawer(false)} onLogout={props.onLogout} />}    </div>
  );
}

function MiniPlayer({ currentSong, isPlaying, isBuffering, togglePlay, nextSong, prevSong, progress, duration, onExpand }) {
  const pct = duration ? (progress / duration) * 100 : 0;
  return (
    <div style={{ margin: "0 8px 6px", background: "#1c1c2e", borderRadius: 14, overflow: "hidden", flexShrink: 0, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
      <div style={{ height: 2, background: "#2a2a3e" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#1db954", transition: "width 1s linear" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 10 }}>
        <img src={currentSong.thumbnail} alt={currentSong.title} onClick={onExpand}
          style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0, cursor: "pointer" }} />
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onExpand}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentSong.title}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentSong.artist}</div>
        </div>
        <button onClick={prevSong} style={{ background: "none", border: "none", cursor: "pointer", color: "#a0a0b8", display: "flex", padding: 6 }}><PrevIcon size={20}/></button>
        <button onClick={togglePlay} style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isBuffering ? <div style={{ width: 16, height: 16, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            : isPlaying ? <PauseIcon size={16} color="#000"/> : <PlayIcon size={16} color="#000"/>}
        </button>
        <button onClick={nextSong} style={{ background: "none", border: "none", cursor: "pointer", color: "#a0a0b8", display: "flex", padding: 6 }}><NextIcon size={20}/></button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function FullScreenPlayer({ currentSong, isPlaying, isBuffering, togglePlay, nextSong, prevSong, progress, duration, seekTo, isShuffle, setIsShuffle, isRepeat, setIsRepeat, likedSongs, toggleLike, volume, setVolume, isMuted, setIsMuted, onClose }) {
  const pct = duration ? (progress / duration) * 100 : 0;
  const liked = currentSong && likedSongs.has(currentSong.id);
  const fmt = s => !s || isNaN(s) ? "0:00" : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "linear-gradient(180deg,#1a0a2e 0%,#0a0a1a 100%)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 4 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#a0a0b8", letterSpacing: 0.5 }}>NOW PLAYING</span>
        <button onClick={() => currentSong && toggleLike(currentSong.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: liked ? "#1db954" : "#6b7280", display: "flex", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 40px" }}>
        <img src={currentSong?.thumbnail} alt={currentSong?.title}
          style={{ width: "100%", maxWidth: 300, aspectRatio: "1", borderRadius: 20, objectFit: "cover", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }} />
      </div>

      <div style={{ padding: "0 28px 32px", flexShrink: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: -0.5, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentSong?.title}</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>{currentSong?.artist}</div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - r.left) / r.width); }}
            style={{ height: 4, background: "#2a2a3e", borderRadius: 4, cursor: "pointer", marginBottom: 8, position: "relative" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 4 }} />
            <div style={{ position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%,-50%)", width: 14, height: 14, background: "#fff", borderRadius: "50%", pointerEvents: "none" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{fmt(progress)}</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{fmt(duration)}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <button onClick={() => setIsShuffle(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: isShuffle ? "#1db954" : "#6b7280", padding: 8 }}><ShuffleIcon size={22}/></button>
          <button onClick={prevSong}  style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 8 }}><PrevIcon size={32}/></button>
          <button onClick={togglePlay} style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isBuffering ? <div style={{ width: 24, height: 24, border: "3px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin2 0.8s linear infinite" }} />
              : isPlaying ? <PauseIcon size={28} color="#000"/> : <PlayIcon size={28} color="#000"/>}
          </button>
          <button onClick={nextSong}  style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 8 }}><NextIcon size={32}/></button>
          <button onClick={() => setIsRepeat(r => !r)} style={{ background: "none", border: "none", cursor: "pointer", color: isRepeat ? "#1db954" : "#6b7280", padding: 8 }}><RepeatIcon size={22}/></button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#6b7280"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg>
          <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.min(1,Math.max(0,(e.clientX-r.left)/r.width))); setIsMuted(false); }}
            style={{ flex: 1, height: 4, background: "#2a2a3e", borderRadius: 4, cursor: "pointer" }}>
            <div style={{ width: `${isMuted ? 0 : volume * 100}%`, height: "100%", background: "#6b7280", borderRadius: 4 }} />
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#6b7280"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        </div>
      </div>
      <style>{`@keyframes spin2{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function MobileDrawer({ currentPage, setCurrentPage, playlists, likedSongs, onClose, onLogout }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 280, background: "#111118", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1db954" }}>SoundWave</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 22 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 20px" }}>
          {[
            { id: "home",      label: "Home",                       emoji: "🏠" },
            { id: "search",    label: "Discover",                   emoji: "🔍" },
            { id: "library",   label: "Library",                    emoji: "🎵" },
            { id: "liked",     label: `Liked (${likedSongs.size})`, emoji: "❤️" },
            { id: "downloads", label: "Downloads",                  emoji: "⬇️" },
          ].map(item => (
            <button key={item.id} onClick={() => { setCurrentPage(item.id); onClose(); }}
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 14px", borderRadius: 10, background: currentPage === item.id ? "rgba(29,185,84,0.12)" : "none", border: "none", cursor: "pointer", color: currentPage === item.id ? "#1db954" : "#a0a0b8", fontSize: 15, fontWeight: currentPage === item.id ? 600 : 400, fontFamily: "inherit", textAlign: "left", marginBottom: 2 }}>
              <span style={{ fontSize: 18 }}>{item.emoji}</span>{item.label}
            </button>
          ))}
          <div style={{ padding: "16px 14px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#6b7280", textTransform: "uppercase" }}>Playlists</div>
          {playlists.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{p.emoji}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#f0f0ff" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{p.songIds?.length || 0} songs</div>
              </div>
            </div>
          ))}
        </div>

        {/* Logout at bottom of drawer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2a3e", flexShrink: 0 }}>
          <button onClick={() => { onLogout(); onClose(); }}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", borderRadius: 10, background: "none", border: "1px solid #2a2a3e", cursor: "pointer", color: "#6b7280", fontSize: 14, fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#ff6b6b"; e.currentTarget.style.color="#ff6b6b"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#2a2a3e"; e.currentTarget.style.color="#6b7280"; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeIcon({ size=24, active }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={active?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function SearchIcon({ size=24, active }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?"2.5":"2"} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>; }
function LibraryIcon({ size=24, active }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?"2.5":"2"} strokeLinecap="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>; }
function HeartIcon({ size=24, active }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={active?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }
function PlayIcon({ size=24, color="currentColor" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M8 5v14l11-7z"/></svg>; }
function PauseIcon({ size=24, color="currentColor" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>; }
function NextIcon({ size=24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>; }
function PrevIcon({ size=24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>; }
function ShuffleIcon({ size=24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>; }
function RepeatIcon({ size=24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>; }
