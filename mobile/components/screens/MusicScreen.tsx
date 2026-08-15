import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import PlayThumb from "@/components/PlayThumb";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { getTracks } from "@/lib/api";
import { Track } from "@/types";

export default function MusicScreen() {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const res = await getTracks(1, 20);
    setTracks(res.data);
    setError(false);
  }, []);

  useEffect(() => {
    load()
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => setError(true));
    setRefreshing(false);
  };

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) setIsPlaying(!isPlaying);
    else playTrack(track, tracks);
  };

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View className="px-6 pt-4 pb-6">
        <Text className="text-xs tracking-widest uppercase text-white/30 mb-3">New Releases</Text>
        <Text className="text-4xl font-light text-white/90">Music</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text className="text-white/30 text-sm text-center px-6">
          Couldn&apos;t reach the server. Pull down to try again.
        </Text>
      ) : tracks.length === 0 ? (
        <Text className="text-white/25 text-sm px-6">No tracks yet.</Text>
      ) : (
        <View className="px-6">
          {tracks.map((track) => {
            const isActive = currentTrack?.id === track.id;
            const moods = track.mood?.split(",").map((m) => m.trim()).filter(Boolean) ?? [];
            return (
              <View key={track.id} className="flex-row items-center gap-4 py-3 border-b border-white/[0.06]">
                <PlayThumb
                  coverImageUrl={track.coverImageUrl}
                  isActive={isActive}
                  isPlaying={isPlaying}
                  onPress={() => handlePlay(track)}
                  size={44}
                />
                <Pressable onPress={() => router.push(`/tracks/${track.id}`)} className="flex-1 min-w-0">
                  <Text numberOfLines={1} className={`text-sm ${isActive ? "text-white" : "text-white/80"}`}>
                    {track.title}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-white/35 mt-0.5">
                    {track.artist}
                  </Text>
                  {moods.length > 0 && (
                    <Text numberOfLines={1} className="text-[10px] text-white/25 mt-1">
                      {moods.slice(0, 2).join(" · ")}
                    </Text>
                  )}
                </Pressable>
                <Text className="text-xs text-white/30">{track.duration}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
