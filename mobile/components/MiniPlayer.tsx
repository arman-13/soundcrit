import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { CloseIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from "@/components/icons";

export default function MiniPlayer() {
  const { currentTrack, isPlaying, isLive, isCountdown, setIsPlaying, playNext, playPrev, queue, dismiss, currentTime, duration } =
    useAudioPlayer();

  if (!currentTrack) return null;

  const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < queue.length - 1;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View className="h-20 border-t border-white/10 overflow-hidden">
      <BlurView intensity={40} tint="dark" className="absolute inset-0 bg-player/90" />

      {!isLive && (
        <View className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
          <View className="h-full bg-white/70" style={{ width: `${progress}%` }} />
        </View>
      )}

      <View className="flex-1 flex-row items-center gap-3 px-4">
        {isLive && isCountdown ? (
          <View className="flex-1 flex-row items-center gap-3 min-w-0">
            <View className="w-10 h-10 rounded bg-white/5" />
            <View>
              <Text className="text-sm font-medium text-white/20">—</Text>
              <Text className="text-xs text-white/15">—</Text>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push(`/tracks/${currentTrack.id}`)}
            className="flex-1 flex-row items-center gap-3 min-w-0"
          >
            <Image source={{ uri: currentTrack.coverImageUrl }} style={{ width: 40, height: 40, borderRadius: 6 }} contentFit="cover" />
            <View className="flex-1 min-w-0">
              <Text numberOfLines={1} className="text-sm font-medium text-white">
                {currentTrack.title}
              </Text>
              <Text numberOfLines={1} className="text-xs text-white/40">
                {currentTrack.artist}
              </Text>
            </View>
          </Pressable>
        )}

        <View className="flex-row items-center gap-4 shrink-0">
          {isLive && (
            <View className="flex-row items-center gap-1.5">
              <View className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <Text className="text-xs text-red-400/80 tracking-widest uppercase">Live</Text>
            </View>
          )}

          <Pressable onPress={playPrev} disabled={!hasPrev || isLive} hitSlop={8}>
            <PrevIcon color={!hasPrev || isLive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)"} />
          </Pressable>

          <Pressable
            onPress={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 rounded-full border border-white/20 items-center justify-center"
            hitSlop={8}
          >
            {isPlaying ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
          </Pressable>

          <Pressable onPress={playNext} disabled={!hasNext || isLive} hitSlop={8}>
            <NextIcon color={!hasNext || isLive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)"} />
          </Pressable>

          <Pressable onPress={dismiss} hitSlop={8}>
            <CloseIcon size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
