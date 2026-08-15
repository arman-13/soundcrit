import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import Screen from "@/components/Screen";
import PlayThumb from "@/components/PlayThumb";
import FollowButton from "@/components/FollowButton";
import { PlayIcon, SettingsIcon, ShuffleIcon } from "@/components/icons";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { getArtistAlbums, getArtistProfile, getArtistTracks, getFollowing } from "@/lib/api";
import { Album, PublicUserDto, Track } from "@/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ArtistProfileScreen({ selfMode = false }: { selfMode?: boolean }) {
  const params = useLocalSearchParams<{ username: string }>();
  const { width } = useWindowDimensions();
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<PublicUserDto | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [following, setFollowing] = useState<PublicUserDto[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const albumWidth = (width - 48 - 32) / 3;

  const targetUsername = selfMode ? currentUser?.username : decodeURIComponent(params.username ?? "");

  useEffect(() => {
    if (selfMode && authLoading) return;
    if (!targetUsername) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const p = await getArtistProfile(targetUsername);
        const [tracksRes, albumsRes] = await Promise.all([getArtistTracks(p.id), getArtistAlbums(p.id)]);
        setProfile(p);
        setTracks(tracksRes.data);
        setAlbums(albumsRes);
        if (selfMode) getFollowing(p.id).then(setFollowing).catch(() => {});
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [targetUsername, selfMode, authLoading]);

  if (selfMode && authLoading) {
    return (
      <Screen>
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  if (selfMode && !currentUser) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <Text className="text-xl font-light text-white/90">You&apos;re not signed in</Text>
          <Text className="text-sm text-white/40 text-center mb-2">Sign in to view your profile.</Text>
          <Pressable onPress={() => router.push("/login")} className="bg-white rounded px-6 py-3 w-full items-center">
            <Text className="text-black text-sm font-medium">Sign in</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/register")} className="border border-white/20 rounded px-6 py-3 w-full items-center">
            <Text className="text-white/70 text-sm font-medium">Create an account</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  if (notFound || !profile) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/50 text-sm">Artist not found.</Text>
        </View>
      </Screen>
    );
  }

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    const first = tracks[0];
    if (currentTrack?.id === first.id) setIsPlaying(!isPlaying);
    else playTrack(first, tracks);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = shuffle(tracks);
    playTrack(shuffled[0], shuffled);
  };

  return (
    <Screen>
      <View style={{ height: 240 }} className="relative mb-8">
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <View style={{ backgroundColor: "#161616", flex: 1 }} />
        )}
        <LinearGradient
          colors={["rgba(10,10,10,0.15)", "rgba(10,10,10,0.35)", "#0a0a0a"]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }}
        />
        {selfMode && (
          <Pressable
            onPress={() => router.push("/profile/edit")}
            className="absolute top-4 right-4 bg-black/40 rounded-full p-2.5"
            hitSlop={8}
          >
            <SettingsIcon size={20} />
          </Pressable>
        )}
        <View className="absolute left-0 right-0 bottom-0 px-6 pb-5">
          <Text className="text-3xl font-light text-white/90 tracking-tight mb-1">{profile.displayName}</Text>
          <Text className="text-sm text-white/40">@{profile.username}</Text>
        </View>
      </View>

      <View className="px-6">
        {profile.bio ? <Text className="text-sm text-white/45 leading-relaxed mb-4">{profile.bio}</Text> : null}
        {!selfMode && (
          <View className="mb-10 items-start">
            <FollowButton artistId={profile.id} />
          </View>
        )}

        {tracks.length > 0 && (
          <View className="mb-12">
            <Text className="text-xs tracking-widest uppercase text-white/25 mb-4">Top Songs</Text>
            <View className="flex-row gap-3 mb-5">
              <Pressable onPress={handlePlayAll} className="flex-row items-center gap-2 bg-white rounded-full px-5 py-2">
                <PlayIcon size={13} color="#000" />
                <Text className="text-black text-sm font-medium">Play</Text>
              </Pressable>
              <Pressable onPress={handleShuffle} className="flex-row items-center gap-2 border border-white/15 rounded-full px-5 py-2">
                <ShuffleIcon size={13} color="rgba(255,255,255,0.6)" />
                <Text className="text-white/60 text-sm">Shuffle</Text>
              </Pressable>
            </View>
            {tracks.map((track) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <View key={track.id} className="flex-row items-center gap-4 py-3 border-b border-white/[0.05]">
                  <PlayThumb
                    coverImageUrl={track.coverImageUrl}
                    isActive={isActive}
                    isPlaying={isPlaying}
                    onPress={() => (isActive ? setIsPlaying(!isPlaying) : playTrack(track, tracks))}
                  />
                  <Pressable onPress={() => router.push(`/tracks/${track.id}`)} className="flex-1 min-w-0">
                    <Text numberOfLines={1} className={`text-sm ${isActive ? "text-white" : "text-white/80"}`}>
                      {track.title}
                    </Text>
                    {track.genre ? <Text className="text-xs text-white/30 mt-0.5">{track.genre}</Text> : null}
                  </Pressable>
                  <Text className="text-xs text-white/25">{track.duration}</Text>
                </View>
              );
            })}
          </View>
        )}

        {albums.length > 0 && (
          <View className="mb-12">
            <Text className="text-xs tracking-widest uppercase text-white/25 mb-4">Albums</Text>
            <View className="flex-row flex-wrap gap-4">
              {albums.map((album) => (
                <Pressable key={album.id} onPress={() => router.push(`/albums/${album.id}`)} style={{ width: albumWidth }}>
                  <View style={{ width: albumWidth, height: albumWidth }} className="rounded overflow-hidden bg-white/5 mb-2">
                    {album.coverImageUrl ? (
                      <Image source={{ uri: album.coverImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    ) : null}
                  </View>
                  <Text numberOfLines={1} className="text-sm text-white/75">
                    {album.title}
                  </Text>
                  <Text className="text-xs text-white/30 mt-0.5">{new Date(album.releasedAt).getFullYear()}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {selfMode && following.length > 0 && (
          <View className="mb-12">
            <Text className="text-xs tracking-widest uppercase text-white/25 mb-4">Following</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              {following.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => router.push(`/artists/${encodeURIComponent(f.username)}`)}
                  style={{ width: 64 }}
                  className="items-center"
                >
                  <View className="w-14 h-14 rounded-full bg-white/10 overflow-hidden mb-1.5 items-center justify-center">
                    {f.avatarUrl ? (
                      <Image source={{ uri: f.avatarUrl }} style={{ width: 56, height: 56 }} contentFit="cover" />
                    ) : (
                      <Text className="text-base text-white/50">{f.displayName[0]?.toUpperCase()}</Text>
                    )}
                  </View>
                  <Text numberOfLines={1} className="text-xs text-white/65 text-center">
                    {f.displayName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
