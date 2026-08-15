import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import Screen from "@/components/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { getMyAlbums } from "@/lib/api";
import { Album } from "@/types";

export default function MyAlbumsScreen() {
  const { user, token, loading: authLoading } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setAlbums(await getMyAlbums(token));
    } catch {}
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !user) {
        router.push("/login");
        return;
      }
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [authLoading, user, load])
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
          <Text className="text-2xl font-light text-white/90">My Albums</Text>
          <Pressable onPress={() => router.push("/studio/album/new")} className="bg-white rounded px-4 py-2">
            <Text className="text-black text-sm font-medium">+ Create</Text>
          </Pressable>
        </View>

        {albums.length === 0 ? (
          <Text className="text-white/30 text-sm">No albums yet.</Text>
        ) : (
          <View className="gap-5">
            {albums.map((a) => (
              <Pressable key={a.id} onPress={() => router.push(`/studio/album/${a.id}`)} className="flex-row items-center gap-4">
                <View className="w-16 h-16 rounded overflow-hidden bg-white/5 shrink-0">
                  {a.coverImageUrl ? (
                    <Image source={{ uri: a.coverImageUrl }} style={{ width: 64, height: 64 }} contentFit="cover" />
                  ) : null}
                </View>
                <View className="flex-1 min-w-0">
                  <Text numberOfLines={1} className="text-sm text-white/85">
                    {a.title}
                  </Text>
                  <Text className="text-xs text-white/35 mt-0.5">{new Date(a.releasedAt).getFullYear()}</Text>
                  {!a.isPublished && <Text className="text-xs text-white/20 mt-1">Draft</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
