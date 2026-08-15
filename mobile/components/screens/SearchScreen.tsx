import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import EventRow from "@/components/EventRow";
import PlayThumb from "@/components/PlayThumb";
import { SearchIcon } from "@/components/icons";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { searchAlbums, searchArtists, searchEvents, searchTracks } from "@/lib/api";
import { Album, LiveEvent, PublicUserDto, Track } from "@/types";

type Category = "all" | "tracks" | "albums" | "artists" | "sessions";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tracks", label: "Songs" },
  { key: "albums", label: "Albums" },
  { key: "artists", label: "Artists" },
  { key: "sessions", label: "Sessions" },
];

const PREVIEW_COUNT = 4;

export default function SearchScreen() {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<PublicUserDto[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearched(false);
      setTracks([]);
      setAlbums([]);
      setArtists([]);
      setEvents([]);
      return;
    }
    const id = setTimeout(() => {
      setLoading(true);
      Promise.all([searchTracks(q), searchAlbums(q), searchArtists(q), searchEvents(q)])
        .then(([tracksRes, albumsRes, artistsRes, eventsRes]) => {
          setTracks(tracksRes.data);
          setAlbums(albumsRes);
          setArtists(artistsRes);
          setEvents(eventsRes);
          setSearched(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) setIsPlaying(!isPlaying);
    else playTrack(track, tracks);
  };

  const counts: Record<Category, number> = {
    all: tracks.length + albums.length + artists.length + events.length,
    tracks: tracks.length,
    albums: albums.length,
    artists: artists.length,
    sessions: events.length,
  };

  const TrackRow = ({ track }: { track: Track }) => {
    const isActive = currentTrack?.id === track.id;
    return (
      <View className="flex-row items-center gap-4 py-3 border-b border-white/[0.06]">
        <PlayThumb
          coverImageUrl={track.coverImageUrl}
          isActive={isActive}
          isPlaying={isPlaying}
          onPress={() => handlePlay(track)}
          size={44}
        />
        <Pressable onPress={() => router.push(`/tracks/${track.id}`)} className="flex-1 min-w-0">
          <Text numberOfLines={1} className={`text-sm ${isActive ? "text-white" : "text-white/80"}`}>
            {track.title}
          </Text>
          <Text numberOfLines={1} className="text-xs text-white/35 mt-0.5">
            {track.artist}
          </Text>
        </Pressable>
        <Text className="text-xs text-white/30">{track.duration}</Text>
      </View>
    );
  };

  const AlbumRow = ({ album }: { album: Album }) => (
    <Pressable
      onPress={() => router.push(`/albums/${album.id}`)}
      className="flex-row items-center gap-4 py-3 border-b border-white/[0.06]"
    >
      <View className="w-11 h-11 rounded overflow-hidden bg-white/5 shrink-0">
        {album.coverImageUrl ? (
          <Image source={{ uri: album.coverImageUrl }} style={{ width: 44, height: 44 }} contentFit="cover" />
        ) : null}
      </View>
      <View className="flex-1 min-w-0">
        <Text numberOfLines={1} className="text-sm text-white/80">
          {album.title}
        </Text>
        <Text className="text-xs text-white/35 mt-0.5">{new Date(album.releasedAt).getFullYear()}</Text>
      </View>
    </Pressable>
  );

  const ArtistRow = ({ artist }: { artist: PublicUserDto }) => (
    <Pressable
      onPress={() => router.push(`/artists/${encodeURIComponent(artist.username)}`)}
      className="flex-row items-center gap-4 py-3 border-b border-white/[0.06]"
    >
      <View className="w-11 h-11 rounded-full overflow-hidden bg-white/10 shrink-0 items-center justify-center">
        {artist.avatarUrl ? (
          <Image source={{ uri: artist.avatarUrl }} style={{ width: 44, height: 44 }} contentFit="cover" />
        ) : (
          <Text className="text-sm text-white/50">{artist.displayName[0]?.toUpperCase()}</Text>
        )}
      </View>
      <View className="flex-1 min-w-0">
        <Text numberOfLines={1} className="text-sm text-white/80">
          {artist.displayName}
        </Text>
        <Text numberOfLines={1} className="text-xs text-white/35 mt-0.5">
          @{artist.username}
        </Text>
      </View>
    </Pressable>
  );

  const Section = ({ title, count, cat, children }: { title: string; count: number; cat: Category; children: React.ReactNode }) => {
    if (count === 0) return null;
    return (
      <View className="mb-6">
        <View className="flex-row items-baseline justify-between mb-1">
          <Text className="text-xs tracking-widest uppercase text-white/30">{title}</Text>
          {count > PREVIEW_COUNT && (
            <Pressable onPress={() => setCategory(cat)}>
              <Text className="text-xs text-white/35">See all →</Text>
            </Pressable>
          )}
        </View>
        {children}
      </View>
    );
  };

  return (
    <Screen scroll={false}>
      <View className="px-6 pt-4">
        <View className="flex-row items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 mb-4">
          <SearchIcon size={16} color="rgba(255,255,255,0.35)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Songs, albums, artists, sessions…"
            placeholderTextColor="rgba(255,255,255,0.25)"
            className="flex-1 py-3 text-sm text-white/85 font-sans"
            autoCorrect={false}
          />
        </View>

        {query.trim().length > 0 && (
          <View className="flex-row gap-2 mb-2">
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  className={`px-3 py-1.5 rounded-full border ${active ? "bg-white border-white" : "border-white/15"}`}
                >
                  <Text className={`text-xs font-medium ${active ? "text-black" : "text-white/50"}`}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {!searched && !loading ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-white/25 text-sm text-center">Search for songs, albums, artists, and sessions.</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 40 }} />
      ) : counts[category] === 0 ? (
        <Text className="text-white/25 text-sm px-6">
          No {category === "all" ? "results" : CATEGORIES.find((c) => c.key === category)?.label.toLowerCase()} found.
        </Text>
      ) : (
        <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          {category === "all" ? (
            <>
              <Section title="Songs" count={tracks.length} cat="tracks">
                {tracks.slice(0, PREVIEW_COUNT).map((t) => <TrackRow key={t.id} track={t} />)}
              </Section>
              <Section title="Albums" count={albums.length} cat="albums">
                {albums.slice(0, PREVIEW_COUNT).map((a) => <AlbumRow key={a.id} album={a} />)}
              </Section>
              <Section title="Artists" count={artists.length} cat="artists">
                {artists.slice(0, PREVIEW_COUNT).map((a) => <ArtistRow key={a.id} artist={a} />)}
              </Section>
              <Section title="Sessions" count={events.length} cat="sessions">
                {events.slice(0, PREVIEW_COUNT).map((e) => <EventRow key={e.id} event={e} />)}
              </Section>
            </>
          ) : (
            <>
              {category === "tracks" && tracks.map((t) => <TrackRow key={t.id} track={t} />)}
              {category === "albums" && albums.map((a) => <AlbumRow key={a.id} album={a} />)}
              {category === "artists" && artists.map((a) => <ArtistRow key={a.id} artist={a} />)}
              {category === "sessions" && events.map((e) => <EventRow key={e.id} event={e} />)}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
