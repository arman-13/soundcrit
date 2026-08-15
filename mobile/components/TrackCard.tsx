import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { Track } from "@/types";
import { PauseIcon, PlayIcon } from "@/components/icons";
import EqualizerBars from "@/components/EqualizerBars";

interface Props {
  track: Track;
  queue?: Track[];
  width?: number;
}

export default function TrackCard({ track, queue, width = 144 }: Props) {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const isActive = currentTrack?.id === track.id;
  const moods = track.mood?.split(",").map((m) => m.trim()).filter(Boolean) ?? [];

  const handlePlay = () => {
    if (isActive) setIsPlaying(!isPlaying);
    else playTrack(track, queue);
  };

  return (
    <View style={{ width }} className="rounded-lg overflow-hidden bg-white/[0.03] border border-white/5">
      <Pressable onPress={() => router.push(`/tracks/${track.id}`)}>
        <View style={{ width, height: width }} className="bg-white/5">
          <Image source={{ uri: track.coverImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          <Pressable
            onPress={handlePlay}
            className="absolute inset-0 items-center justify-center bg-black/20"
            hitSlop={4}
          >
            <View className="w-11 h-11 rounded-full border border-white/50 bg-black/50 items-center justify-center">
              {isActive && isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            </View>
          </Pressable>
          {isActive && isPlaying && (
            <View className="absolute bottom-2 left-2">
              <EqualizerBars />
            </View>
          )}
        </View>
      </Pressable>
      <View className="p-3">
        <Pressable onPress={() => router.push(`/tracks/${track.id}`)}>
          <Text numberOfLines={1} className={`text-sm font-medium ${isActive ? "text-white" : "text-white/75"}`}>
            {track.title}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/artists/${encodeURIComponent(track.artist)}`)}>
          <Text numberOfLines={1} className="text-xs text-white/35 mt-0.5">
            {track.artist}
          </Text>
        </Pressable>
        {moods.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-2">
            {moods.slice(0, 2).map((m) => (
              <View key={m} className="border border-white/8 rounded-full px-1.5 py-0.5">
                <Text className="text-[10px] text-white/25">{m}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
