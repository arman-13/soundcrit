import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import PulseDot from "@/components/PulseDot";
import { LiveEvent } from "@/types";

function fmtDate(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EventRow({ event }: { event: LiveEvent }) {
  return (
    <Pressable
      onPress={() => router.push(`/sessions/events/${event.id}`)}
      className="flex-row items-center gap-4 px-2 py-3 rounded-lg"
    >
      {event.coverImageUrl ? (
        <View className="w-12 h-12 rounded overflow-hidden bg-white/5 shrink-0">
          <Image source={{ uri: event.coverImageUrl }} style={{ width: 48, height: 48 }} contentFit="cover" />
        </View>
      ) : (
        <View className="w-12 h-12 rounded bg-white/5 shrink-0" />
      )}
      <View className="flex-1 min-w-0">
        <Text numberOfLines={1} className="text-sm text-white/80">
          {event.title}
        </Text>
        <Text className="text-xs text-white/30 mt-0.5">
          {fmtDate(event.scheduledAt)} · {event.trackCount} tracks
        </Text>
      </View>
      {event.status === "Live" ? (
        <View className="flex-row items-center gap-1.5 shrink-0">
          <PulseDot size={6} />
          <Text className="text-xs text-red-400/80 tracking-widest uppercase">Live</Text>
        </View>
      ) : (
        <Text className={`text-xs shrink-0 ${event.status === "Upcoming" ? "text-white/30" : "text-white/20"}`}>
          {event.status === "Upcoming" ? "Upcoming" : "Ended"}
        </Text>
      )}
    </Pressable>
  );
}
