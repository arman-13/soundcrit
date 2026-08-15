import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import { getAlbums } from "@/lib/api";
import { Album } from "@/types";

export default function AlbumsScreen() {
  const { width } = useWindowDimensions();
  const gap = 16;
  const cardWidth = (width - 48 - gap) / 2;

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setAlbums(await getAlbums());
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

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View className="px-6 pt-4 pb-6">
        <Text className="text-xs tracking-widest uppercase text-white/30 mb-3">Catalog</Text>
        <Text className="text-4xl font-light text-white/90">Albums</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text className="text-white/30 text-sm text-center px-6">
          Couldn&apos;t reach the server. Pull down to try again.
        </Text>
      ) : albums.length === 0 ? (
        <Text className="text-white/25 text-sm px-6">No albums yet.</Text>
      ) : (
        <View className="px-6 flex-row flex-wrap" style={{ gap }}>
          {albums.map((album) => (
            <Pressable key={album.id} onPress={() => router.push(`/albums/${album.id}`)} style={{ width: cardWidth }}>
              <View style={{ width: cardWidth, height: cardWidth }} className="rounded overflow-hidden bg-white/5 mb-3">
                <Image source={{ uri: album.coverImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              </View>
              <Text numberOfLines={1} className="text-sm font-medium text-white/75">
                {album.title}
              </Text>
              <Text className="text-xs text-white/30 mt-0.5">{new Date(album.releasedAt).getFullYear()}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
