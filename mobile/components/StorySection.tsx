import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { StoryBlock } from "@/types";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function StorySection({ blocks }: { blocks: StoryBlock[] }) {
  const { width } = useWindowDimensions();
  const { currentTrack, seekTo } = useAudioPlayer();
  const contentWidth = width - 48;

  return (
    <View className="gap-8">
      <Text className="text-xs tracking-widest uppercase text-white/25">Story</Text>
      {blocks.map((block) => {
        const timestampBadge =
          block.timestamp != null ? (
            <Pressable
              onPress={() => currentTrack && seekTo(block.timestamp!)}
              className="self-start bg-white/5 rounded px-1.5 py-0.5 mb-2"
            >
              <Text className="text-xs text-white/35">{fmtTime(block.timestamp)}</Text>
            </Pressable>
          ) : null;

        if (block.type === "text") {
          return (
            <View key={block.id}>
              {timestampBadge}
              <Text className="text-base text-white/50 leading-relaxed">{block.content}</Text>
            </View>
          );
        }
        if (block.type === "quote") {
          return (
            <View key={block.id} className="border-l border-white/15 pl-4">
              {timestampBadge}
              <Text className="text-base text-white/60 italic leading-relaxed">{block.content}</Text>
            </View>
          );
        }
        if (block.type === "image" && block.url) {
          return (
            <View key={block.id}>
              {timestampBadge}
              <Image source={{ uri: block.url }} style={{ width: contentWidth, height: contentWidth * 0.66, borderRadius: 8 }} contentFit="cover" />
              {block.caption ? <Text className="text-xs text-white/30 mt-2">{block.caption}</Text> : null}
            </View>
          );
        }
        if (block.type === "image_pair" && block.images?.length) {
          const halfWidth = (contentWidth - 8) / 2;
          return (
            <View key={block.id}>
              {timestampBadge}
              <View className="flex-row gap-2">
                {block.images.slice(0, 2).map((img, i) => (
                  <Image key={i} source={{ uri: img.url }} style={{ width: halfWidth, height: halfWidth, borderRadius: 8 }} contentFit="cover" />
                ))}
              </View>
            </View>
          );
        }
        if (block.type === "divider") {
          return <View key={block.id} className="h-px bg-white/10" />;
        }
        if (block.type === "video" && block.url) {
          return (
            <View key={block.id}>
              {timestampBadge}
              <Text className="text-sm text-white/30">Video attached — open on web to view.</Text>
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}
