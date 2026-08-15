import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import Screen from "@/components/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { getAllTracksAdmin } from "@/lib/api";
import { Track } from "@/types";

export default function MyTracksScreen() {
  const { user, token, loading: authLoading } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getAllTracksAdmin(token);
      setTracks(res.data);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  if (authLoading || loading) {
    return (
      <Screen>
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="px-6 pt-4">
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-2xl font-light text-white/90">My Tracks</Text>
          <Pressable onPress={() => router.push("/studio/track/new")} className="bg-white rounded px-4 py-2">
            <Text className="text-black text-sm font-medium">+ Upload</Text>
          </Pressable>
        </View>

        {tracks.length === 0 ? (
          <Text className="text-white/30 text-sm">No tracks yet.</Text>
        ) : (
          <View className="gap-1">
            {tracks.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/studio/track/${t.id}`)}
                className="flex-row items-center gap-4 py-3 border-b border-white/[0.06]"
              >
                <View className="w-13 h-13 rounded overflow-hidden bg-white/5 shrink-0" style={{ width: 52, height: 52 }}>
                  {t.coverImageUrl ? (
                    <Image source={{ uri: t.coverImageUrl }} style={{ width: 52, height: 52 }} contentFit="cover" />
                  ) : null}
                </View>
                <View className="flex-1 min-w-0">
                  <Text numberOfLines={1} className="text-sm text-white/85">
                    {t.title}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-white/35 mt-0.5">
                    {t.artist} · {t.duration}
                  </Text>
                  {!t.isPublished && <Text className="text-xs text-white/20 mt-1">Draft</Text>}
                </View>
                <Text className="text-xs text-white/25 shrink-0">{t.playCount} plays</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
