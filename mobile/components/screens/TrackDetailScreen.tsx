import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import Screen from "@/components/Screen";
import Comments from "@/components/Comments";
import StorySection from "@/components/StorySection";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { getTrack } from "@/lib/api";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { StoryBlock, Track } from "@/types";

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const [track, setTrack] = useState<Track | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrack(Number(id))
      .then(setTrack)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  if (notFound || !track) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/50 text-sm">Track not found.</Text>
        </View>
      </Screen>
    );
  }

  const isActive = currentTrack?.id === track.id;
  const moods = track.mood?.split(",").map((m) => m.trim()).filter(Boolean) ?? [];
  const coverSize = width - 48;

  let storyBlocks: StoryBlock[] = [];
  if (track.storyBlocks) {
    try {
      storyBlocks = JSON.parse(track.storyBlocks);
    } catch {}
  }

  return (
    <Screen>
      <View className="px-6 pt-4">
        <View style={{ width: coverSize, height: coverSize }} className="rounded-lg overflow-hidden bg-white/5 mb-6">
          <Image source={{ uri: track.coverImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        </View>

        <Text className="text-xs tracking-widest uppercase text-white/25 mb-3">{track.genre}</Text>
        <Text className="text-3xl font-light text-white/90 leading-tight mb-2">{track.title}</Text>
        <Pressable onPress={() => router.push(`/artists/${encodeURIComponent(track.artist)}`)}>
          <Text className="text-base text-white/45 mb-4">{track.artist}</Text>
        </Pressable>

        {moods.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-6">
            {moods.map((m) => (
              <View key={m} className="border border-white/10 rounded-full px-2.5 py-1">
                <Text className="text-xs text-white/30">{m}</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => (isActive ? setIsPlaying(!isPlaying) : playTrack(track, [track]))}
          className="flex-row items-center gap-3 bg-white px-5 py-3 rounded-full self-start"
        >
          {isActive && isPlaying ? <PauseIcon size={16} color="#000" /> : <PlayIcon size={16} color="#000" />}
          <Text className="text-black text-sm font-medium">{isActive && isPlaying ? "Pause" : "Play"}</Text>
        </Pressable>

        <Text className="text-xs text-white/20 mt-3 mb-10">
          {track.playCount.toLocaleString()} plays · {track.duration}
        </Text>

        {track.description ? (
          <Text className="text-base text-white/50 leading-relaxed mb-10 border-l border-white/10 pl-4">
            {track.description}
          </Text>
        ) : null}

        {storyBlocks.length > 0 && <StorySection blocks={storyBlocks} />}

        <Comments trackId={track.id} track={track} />
      </View>
    </Screen>
  );
}
