import { supabase } from "./supabase";

// ── LIKED SONGS ───────────────────────────────────────────
export async function getLikedSongs(userId) {
  const { data } = await supabase
    .from("liked_songs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function likeSong(userId, song) {
  await supabase.from("liked_songs").insert({
    user_id: userId,
    song_id: song.id,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    youtube_id: song.youtubeId,
  });
}

export async function unlikeSong(userId, songId) {
  await supabase.from("liked_songs")
    .delete()
    .eq("user_id", userId)
    .eq("song_id", songId);
}

// ── PLAYLISTS ─────────────────────────────────────────────
export async function getPlaylists(userId) {
  const { data } = await supabase
    .from("playlists")
    .select("*, playlist_songs(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function createPlaylist(userId, name, emoji = "🎵") {
  const { data } = await supabase
    .from("playlists")
    .insert({ user_id: userId, name, cover_emoji: emoji })
    .select().single();
  return data;
}

export async function deletePlaylist(userId, playlistId) {
  await supabase.from("playlist_songs")
    .delete().eq("playlist_id", playlistId);
  await supabase.from("playlists")
    .delete().eq("id", playlistId).eq("user_id", userId);
}

export async function addSongToPlaylist(playlistId, song) {
  // Check if song already exists in playlist
  const { data: existing } = await supabase
    .from("playlist_songs")
    .select("id")
    .eq("playlist_id", playlistId)
    .eq("song_id", song.id)
    .single();

  if (existing) return { alreadyExists: true };

  await supabase.from("playlist_songs").insert({
    playlist_id: playlistId,
    song_id: song.id,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    youtube_id: song.youtubeId,
  });
  return { success: true };
}

export async function removeSongFromPlaylist(playlistId, songId) {
  await supabase.from("playlist_songs")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("song_id", songId);
}

export async function getPlaylistSongs(playlistId) {
  const { data } = await supabase
    .from("playlist_songs")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("added_at", { ascending: true });
  return (data || []).map(s => ({
    id: s.song_id,
    title: s.title,
    artist: s.artist,
    thumbnail: s.thumbnail,
    youtubeId: s.youtube_id,
  }));
}

// ── HISTORY ───────────────────────────────────────────────
export async function addToHistory(userId, song) {
  await supabase.from("play_history").insert({
    user_id: userId,
    song_id: song.id,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    youtube_id: song.youtubeId,
  });
}

export async function getHistory(userId) {
  const { data } = await supabase
    .from("play_history")
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(50);
  return data || [];
}