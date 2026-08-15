import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { Track } from "@/types";
import { PauseIcon, PlayIcon } from "@/components/icons";

interface Props {
  track: Track;
  rank: number;
  queue: Track[];
}

export default function ChartedRow({ track, rank, queue }: Props) {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const isActive = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isActive) setIsPlaying(!isPlaying);
    else playTrack(track, queue);
  };

  return (
    <View className={`flex-row items-center gap-4 px-4 py-3 rounded-lg ${isActive ? "bg-white/8" : ""}`}>
      <Text className="w-5 text-center text-sm font-light text-white/25">{rank}</Text>

      <Pressable onPress={handlePlay} className="relative w-10 h-10 rounded overflow-hidden bg-white/5">
        <Image source={{ uri: track.coverImageUrl }} style={{ width: 40, height: 40 }} contentFit="cover" />
        <View className="absolute inset-0 items-center justify-center bg-black/40">
          {isActive && isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        </View>
      </Pressable>

      <Pressable onPress={() => router.push(`/tracks/${track.id}`)} className="flex-1 min-w-0">
        <Text numberOfLines={1} className={`text-sm font-medium ${isActive ? "text-white" : "text-white/70"}`}>
          {track.title}
        </Text>
        <Text numberOfLines={1} className="text-xs text-white/30">
          {track.artist}
        </Text>
      </Pressable>

      {track.mood && (
        <View className="border border-white/8 rounded-full px-2 py-0.5">
          <Text numberOfLines={1} className="text-[10px] text-white/20" style={{ maxWidth: 100 }}>
            {track.mood.split(",")[0].trim()}
          </Text>
        </View>
      )}

      <Text className="text-xs text-white/20 shrink-0">{track.playCount.toLocaleString()} plays</Text>
    </View>
  );
}
