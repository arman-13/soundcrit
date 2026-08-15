import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import Screen from "@/components/Screen";
import PlayThumb from "@/components/PlayThumb";
import AlbumComments from "@/components/AlbumComments";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { getAlbum } from "@/lib/api";
import { AlbumTrackDto, AlbumWithTracks, Track } from "@/types";

function albumTrackToTrack(t: AlbumTrackDto): Track {
  return {
    id: t.trackId,
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    coverImageUrl: t.coverImageUrl,
    audioUrl: t.audioUrl,
    mood: t.mood,
    playCount: t.playCount,
    albumTitle: "",
    genre: "",
    publishedAt: "",
    isPublished: true,
    isFeatured: false,
  };
}

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const [album, setAlbum] = useState<AlbumWithTracks | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const coverSize = width - 48;

  useEffect(() => {
    getAlbum(Number(id))
      .then(setAlbum)
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

  if (notFound || !album) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/50 text-sm">Album not found.</Text>
        </View>
      </Screen>
    );
  }

  const queue = album.tracks.map(albumTrackToTrack);

  return (
    <Screen>
      <View className="px-6 pt-4">
        <View style={{ width: coverSize, height: coverSize }} className="rounded-lg overflow-hidden bg-white/5 mb-6">
          <Image source={{ uri: album.coverImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        </View>

        <Text className="text-xs tracking-widest uppercase text-white/25 mb-3">Album</Text>
        <Text className="text-3xl font-light text-white/90 leading-tight mb-3">{album.title}</Text>
        <Text className="text-sm text-white/35 mb-4">
          {new Date(album.releasedAt).getFullYear()} · {album.tracks.length} tracks
        </Text>
        {album.description ? <Text className="text-sm text-white/45 leading-relaxed mb-8">{album.description}</Text> : null}

        <View>
          {album.tracks.map((t) => {
            const isActive = currentTrack?.id === t.trackId;
            const handlePlay = () => {
              const track = albumTrackToTrack(t);
              if (isActive) setIsPlaying(!isPlaying);
              else playTrack(track, queue);
            };
            return (
              <View key={t.trackId} className={`flex-row items-center gap-4 px-2 py-3 rounded-lg ${isActive ? "bg-white/8" : ""}`}>
                <Text className="w-5 text-center text-xs text-white/25">{t.trackNumber}</Text>
                <PlayThumb coverImageUrl={t.coverImageUrl} isActive={isActive} isPlaying={isPlaying} onPress={handlePlay} size={36} />
                <Pressable onPress={() => router.push(`/tracks/${t.trackId}`)} className="flex-1 min-w-0">
                  <Text numberOfLines={1} className={`text-sm font-medium ${isActive ? "text-white" : "text-white/70"}`}>
                    {t.title}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-white/30">
                    {t.artist}
                  </Text>
                </Pressable>
                <Text className="text-xs text-white/25">{t.duration}</Text>
              </View>
            );
          })}
        </View>

        <AlbumComments albumId={album.id} />
      </View>
    </Screen>
  );
}
