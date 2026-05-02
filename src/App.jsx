import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Player from "./components/Player";
import MainContent from "./components/MainContent";
import { PLAYLISTS, GENRES } from "./data/songs";
import { searchSongs, getTrending, getStreamUrl, prefetchSongs } from "./api";

export default function App() {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolume] = useState(savedVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentPage, setCurrentPage] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedSongs, setLikedSongs] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  // Load saved state from localStorage
  const savedSong = JSON.parse(localStorage.getItem("sw_current_song") || "null");
  const savedVolume = parseFloat(localStorage.getItem("sw_volume") || "0.8");

  const audioRef = useRef(new Audio());
  const progressInterval = useRef(null);

  // ── Load trending on startup ──────────────────────────
  useEffect(() => {
    loadTrending();
  }, []);

  // ── Register Service Worker ───────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("✅ Service Worker registered!"))
        .catch(err => console.log("SW error:", err));
    }
  }, []);

  // ── Volume control ────────────────────────────────────
  useEffect(() => {
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // ── Audio event listeners ─────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        nextSong();
      }
    };
    const onTimeUpdate = () => {
      setProgress(Math.floor(audio.currentTime));
      setDuration(Math.floor(audio.duration) || 0);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
    };
  }, [isRepeat, songs, isShuffle]);

  // ── Media Session (keyboard & lock screen controls) ───
  useEffect(() => {
    if (!currentSong || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      artwork: [{ src: currentSong.thumbnail, sizes: "512x512", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current.play();
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler("nexttrack", nextSong);
    navigator.mediaSession.setActionHandler("previoustrack", prevSong);
  }, [currentSong]);

  // ── Pre-fetch songs for instant play ─────────────────
  useEffect(() => {
    if (songs.length > 0) prefetchSongs(songs.slice(0, 5));
  }, [songs]);
  
  // ── Save current song to localStorage ────────────────
  useEffect(() => {
    if (currentSong) {
      localStorage.setItem("sw_current_song", JSON.stringify(currentSong));
    }
  }, [currentSong]);

  // ── Save volume to localStorage ───────────────────────
  useEffect(() => {
    localStorage.setItem("sw_volume", volume.toString());
  }, [volume]);

  // ── Restore last played song on startup ───────────────
  useEffect(() => {
    if (savedSong) {
      setCurrentSong(savedSong);
      audioRef.current.src = getStreamUrl(savedSong.youtubeId);
      console.log("🎵 Restored last song:", savedSong.title);
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

  async function playSong(song) {
    if (!song) return;
    const audio = audioRef.current;
    audio.pause();
    setIsBuffering(true);
    setCurrentSong(song);
    setProgress(0);
    const streamUrl = getStreamUrl(song.youtubeId);
    audio.src = streamUrl;
    audio.volume = isMuted ? 0 : volume;
    try {
      await audio.play();
      setIsPlaying(true);
      setIsBuffering(false);
    } catch (err) {
      console.error("Playback error:", err);
      setIsBuffering(false);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!currentSong) {
      if (songs.length > 0) playSong(songs[0]);
      return;
    }
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
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
    const audio = audioRef.current;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (!songs.length) return;
    const idx = songs.findIndex((s) => s.id === currentSong?.id);
    playSong(songs[(idx - 1 + songs.length) % songs.length]);
  }

  function seekTo(pct) {
    const audio = audioRef.current;
    if (!duration) return;
    audio.currentTime = pct * duration;
    setProgress(Math.floor(audio.currentTime));
  }

  function toggleLike(id) {
    setLikedSongs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gridTemplateRows: "1fr 100px", height: "100vh", overflow: "hidden", background: "#0a0a0f" }}>
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