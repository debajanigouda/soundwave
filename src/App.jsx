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
  const [showPlayer, setShowPlayer] = useState(false);

  const playerRef = useRef(null);
  const progressInterval = useRef(null);

  // ── Load YouTube IFrame API ───────────────────────────
  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("yt-player", {
        height: "0",
        width: "0",
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(volume * 100);
            console.log("✅ YouTube Player ready!");
          },
          onStateChange: (e) => {
            const YT = window.YT.PlayerState;
            if (e.data === YT.PLAYING) {
              setIsPlaying(true);
              setIsBuffering(false);
              startProgressTracking();
            } else if (e.data === YT.PAUSED) {
              setIsPlaying(false);
              stopProgressTracking();
            } else if (e.data === YT.BUFFERING) {
              setIsBuffering(true);
            } else if (e.data === YT.ENDED) {
              stopProgressTracking();
              if (isRepeat) {
                playerRef.current.seekTo(0);
                playerRef.current.playVideo();
              } else {
                nextSong();
              }
            }
          },
          onError: (e) => {
            console.error("YT Error:", e.data);
            setIsBuffering(false);
            nextSong();
          },
        },
      });
    };

    return () => stopProgressTracking();
  }, []);

  // ── Progress tracking ─────────────────────────────────
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

  // ── Volume ────────────────────────────────────────────
  useEffect(() => {
    if (!playerRef.current?.setVolume) return;
    if (isMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume * 100);
    }
    localStorage.setItem("sw_volume", volume.toString());
  }, [volume, isMuted]);

  // ── Media Session ─────────────────────────────────────
  useEffect(() => {
    if (!currentSong || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      artwork: [{ src: currentSong.thumbnail, sizes: "512x512", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", togglePlay);
    navigator.mediaSession.setActionHandler("pause", togglePlay);
    navigator.mediaSession.setActionHandler("nexttrack", nextSong);
    navigator.mediaSession.setActionHandler("previoustrack", prevSong);
    localStorage.setItem("sw_current_song", JSON.stringify(currentSong));
  }, [currentSong]);

  // ── Prefetch ──────────────────────────────────────────
  useEffect(() => {
    if (songs.length > 0) prefetchSongs(songs.slice(0, 5));
  }, [songs]);

  // ── Load trending on startup ──────────────────────────
  useEffect(() => {
    loadTrending();
    try {
      const saved = localStorage.getItem("sw_current_song");
      if (saved) setCurrentSong(JSON.parse(saved));
      const savedVol = localStorage.getItem("sw_volume");
      if (savedVol) setVolume(parseFloat(savedVol));
    } catch (e) {}
  }, []);

  // ── Service Worker ────────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("✅ SW registered!"))
        .catch(err => console.log("SW error:", err));
    }
  }, []);

  // ── Functions ─────────────────────────────────────────
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
    setShowPlayer(true);

    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(song.youtubeId);
    }
  }

  function togglePlay() {
    if (!currentSong) {
      if (songs.length > 0) playSong(songs[0]);
      return;
    }
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }

  function nextSong() {
    if (!songs.length) return;
    if (isShuffle) {
      playSong(songs[Math.floor(Math.random() * songs.length)]);
      return;
    }
    const idx = songs.findIndex((s) => s.id === currentSong?.id);
    playSong(songs[(idx + 1) % songs.length]);
  }

  function prevSong() {
    if (progress > 3) {
      playerRef.current?.seekTo(0);
      return;
    }
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

 const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "260px 1fr", gridTemplateRows: isMobile ? "60px 1fr 80px" : "1fr 100px", height: "100vh", overflow: "hidden", background: "#0a0a0f" }}>
      {/* Hidden YouTube Player */}
      <div style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, overflow: "hidden" }}>
        <div id="yt-player"></div>
      </div>

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        playlists={PLAYLISTS}
        likedCount={likedSongs.size}
      />
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
      />
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
      />
    </div>
  );
}