import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { PlayIcon } from "@/components/icons";
import EqualizerBars from "@/components/EqualizerBars";

interface Props {
  coverImageUrl: string;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
  size?: number;
}

export default function PlayThumb({ coverImageUrl, isActive, isPlaying, onPress, size = 40 }: Props) {
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size }} className="rounded overflow-hidden bg-white/5">
      <Image source={{ uri: coverImageUrl }} style={{ width: size, height: size }} contentFit="cover" />
      <View className="absolute inset-0 items-center justify-center bg-black/45">
        {isActive && isPlaying ? (
          <EqualizerBars heights={[size * 0.28, size * 0.16, size * 0.35, size * 0.22]} barWidth={2} />
        ) : (
          <PlayIcon size={size * 0.32} />
        )}
      </View>
    </Pressable>
  );
}
