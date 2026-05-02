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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Load YouTube IFrame API ───────────────────────────
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
            else if (e.data === YT.ENDED) { stopProgressTracking(); if (isRepeat) { playerRef.current.seekTo(0); playerRef.current.playVideo(); } else { nextSong(); } }
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

  useEffect(() => {
    if (!playerRef.current?.setVolume) return;
    if (isMuted) { playerRef.current.mute(); }
    else { playerRef.current.unMute(); playerRef.current.setVolume(volume * 100); }
    localStorage.setItem("sw_volume", volume.toString());
  }, [volume, isMuted]);

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

  useEffect(() => {
    loadTrending();
    try {
      const saved = localStorage.getItem("sw_current_song");
      if (saved) setCurrentSong(JSON.parse(saved));
      const savedVol = localStorage.getItem("sw_volume");
      if (savedVol) setVolume(parseFloat(savedVol));
    } catch (e) {}
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("✅ SW registered!"))
        .catch(err => console.log("SW error:", err));
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

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflow: "hidden",
      background: "#0a0a0f"
    }}>
      {/* Hidden YouTube Player */}
      <div style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1 }}>
        <div id="yt-player"></div>
      </div>

      {/* Main Layout */}
      <div style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        flexDirection: "row"
      }}>
        {/* Sidebar — desktop only */}
        {!isMobile && (
          <Sidebar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            playlists={PLAYLISTS}
            likedCount={likedSongs.size}
            isMobile={false}
          />
        )}

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Mobile Header */}
          {isMobile && (
            <MobileHeader
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              playlists={PLAYLISTS}
              likedCount={likedSongs.size}
            />
          )}

          {/* Page Content */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <MainContent
              currentPage={currentPage}
              searchQuery={searchQuery}
              handleSearch={handleSearch}
              songs={songs}
              likedSongs={likedSongs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              isLoading={isLoading}
              playSong={playSong}
              toggleLike={toggleLike}
              isShuffle={isShuffle}
              setIsShuffle={setIsShuffle}
              isRepeat={isRepeat}
              setIsRepeat={setIsRepeat}
              playlists={PLAYLISTS}
              genres={GENRES}
              loadTrending={loadTrending}
              handleGenreSearch={handleSearch}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>

      {/* Player — always at bottom */}
      <Player
        currentSong={currentSong}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        togglePlay={togglePlay}
        nextSong={nextSong}
        prevSong={prevSong}
        progress={progress}
        duration={duration}
        seekTo={seekTo}
        volume={volume}
        setVolume={setVolume}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        isShuffle={isShuffle}
        setIsShuffle={setIsShuffle}
        isRepeat={isRepeat}
        setIsRepeat={setIsRepeat}
        likedSongs={likedSongs}
        toggleLike={toggleLike}
        isMobile={isMobile}
      />

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <div style={{ background: "#12121a", borderTop: "1px solid #2a2a45", display: "flex", justifyContent: "space-around", padding: "8px 0", flexShrink: 0 }}>
          {[
            { id: "home", label: "Home", icon: "🏠" },
            { id: "search", label: "Discover", icon: "🔍" },
            { id: "library", label: "Library", icon: "🎵" },
            { id: "liked", label: "Liked", icon: "❤️" },
          ].map(item => (
            <button key={item.id} onClick={() => setCurrentPage(item.id)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", color: currentPage === item.id ? "#6c63ff" : "#606080", padding: "4px 16px" }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 500, fontFamily: "inherit" }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Mobile Header Component
function MobileHeader({ currentPage, setCurrentPage, playlists, likedCount }) {
  const [showDrawer, setShowDrawer] = useState(false);
  const GRAD = "linear-gradient(135deg,#6c63ff,#ff6b9d)";

  return (
    <>
      <div style={{ background: "#12121a", borderBottom: "1px solid #2a2a45", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: GRAD, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>♪</div>
          <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 700, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SoundWave</span>
        </div>
        <button onClick={() => setShowDrawer(true)}
          style={{ background: "none", border: "none", color: "#a0a0c0", cursor: "pointer", fontSize: 24, lineHeight: 1 }}>☰</button>
      </div>

      {/* Drawer */}
      {showDrawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <div onClick={() => setShowDrawer(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.8)" }}/>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 280, background: "#12121a", padding: 20, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 700, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SoundWave</span>
              <button onClick={() => setShowDrawer(false)} style={{ background: "none", border: "none", color: "#606080", fontSize: 24, cursor: "pointer" }}>✕</button>
            </div>
            {[
              { id: "home", label: "🏠 Home" },
              { id: "search", label: "🔍 Discover" },
              { id: "library", label: "🎵 Library" },
              { id: "liked", label: `❤️ Liked (${likedCount})` },
              { id: "downloads", label: "⬇️ Downloads" },
            ].map(item => (
              <button key={item.id} onClick={() => { setCurrentPage(item.id); setShowDrawer(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 10, background: currentPage === item.id ? "rgba(108,99,255,.15)" : "none", border: "none", color: currentPage === item.id ? "#6c63ff" : "#a0a0c0", fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", marginBottom: 4 }}>
                {item.label}
              </button>
            ))}
            <div style={{ marginTop: 24, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#606080", marginBottom: 12 }}>Playlists</div>
            {playlists.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{p.emoji}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#f0f0ff" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#606080" }}>{p.songIds.length} songs</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}