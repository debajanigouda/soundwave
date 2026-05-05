import { supabase } from "./supabase";

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

export async function getPlaylists(userId) {
  const { data } = await supabase
    .from("playlists")
    .select("*, playlist_songs(*)")
    .eq("user_id", userId);
  return data || [];
}

export async function createPlaylist(userId, name, emoji = "🎵") {
  const { data } = await supabase
    .from("playlists")
    .insert({ user_id: userId, name, cover_emoji: emoji })
    .select().single();
  return data;
}

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