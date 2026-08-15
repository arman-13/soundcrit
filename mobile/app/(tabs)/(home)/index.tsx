import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import TrackCard from "@/components/TrackCard";
import EventRow from "@/components/EventRow";
import ChartedRow from "@/components/ChartedRow";
import WelcomeSheet from "@/components/WelcomeSheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  getChartedTracks,
  getEvents,
  getEventsForYou,
  getSuggestedArtists,
  getTracks,
  getTracksFollowing,
} from "@/lib/api";
import { getHasSeenWelcome, setHasSeenWelcome } from "@/lib/onboardingStore";
import { LiveEvent, SuggestedArtist, Track } from "@/types";

export default function HomeScreen() {
  const { token, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [eventsPersonalized, setEventsPersonalized] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksPersonalized, setTracksPersonalized] = useState(false);
  const [artists, setArtists] = useState<SuggestedArtist[]>([]);
  const [artistsPersonalized, setArtistsPersonalized] = useState(false);
  const [charted, setCharted] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    getHasSeenWelcome().then((seen) => {
      if (!seen) setShowWelcome(true);
    });
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    setHasSeenWelcome();
  };

  const load = useCallback(async () => {
    const [globalEvents, globalTracksRes, artistsRes, chartedRes, personalizedEvents, personalizedTracksRes] = await Promise.all([
      getEvents(),
      getTracks(1, 6),
      getSuggestedArtists(token, 10),
      getChartedTracks(),
      token ? getEventsForYou(token).catch(() => []) : Promise.resolve([]),
      token ? getTracksFollowing(token, 1, 6).catch(() => ({ data: [] as Track[] })) : Promise.resolve({ data: [] as Track[] }),
    ]);

    if (personalizedEvents.length > 0) {
      setEvents(personalizedEvents);
      setEventsPersonalized(true);
    } else {
      setEvents(globalEvents.filter((e) => e.status === "Live" || e.status === "Upcoming").slice(0, 5));
      setEventsPersonalized(false);
    }

    if (personalizedTracksRes.data.length > 0) {
      setTracks(personalizedTracksRes.data);
      setTracksPersonalized(true);
    } else {
      setTracks(globalTracksRes.data);
      setTracksPersonalized(false);
    }

    // The backend already falls back to non-personalized suggestions on its own —
    // we only need to know which mode it's in to adjust the section title.
    setArtists(artistsRes);
    setArtistsPersonalized(!!token && artistsRes.some((a) => a.mutualFollowerCount > 0));
    setCharted(chartedRes.slice(0, 5));
    setError(false);
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    load()
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [authLoading, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => setError(true));
    setRefreshing(false);
  };

  if (authLoading || loading) {
    return (
      <Screen>
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 56 }} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <WelcomeSheet visible={showWelcome} onDismiss={dismissWelcome} />

      {error ? (
        <Text className="text-white/30 text-sm text-center px-6 pt-14">
          Couldn&apos;t reach the server. Pull down to try again.
        </Text>
      ) : (
        <View className="px-6 pt-6 gap-12">
          {events.length > 0 && (
            <View>
              <Text className="text-xs tracking-widest uppercase text-white/30 mb-6">
                {eventsPersonalized ? "Your Circle" : "Live & Upcoming"}
              </Text>
              <View className="gap-1">
                {events.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </View>
            </View>
          )}

          <View>
            <Text className="text-xs tracking-widest uppercase text-white/30 mb-6">New Releases</Text>
            {tracks.length === 0 ? (
              <Text className="text-white/25 text-sm">No new releases yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {tracks.map((track) => (
                  <TrackCard key={track.id} track={track} queue={tracks} />
                ))}
              </ScrollView>
            )}
          </View>

          <View>
            <Text className="text-xs tracking-widest uppercase text-white/30 mb-6">
              {artistsPersonalized ? "New Artists For You" : "Artists To Discover"}
            </Text>
            {artists.length === 0 ? (
              <Text className="text-white/25 text-sm">No artists to show yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
                {artists.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => router.push(`/artists/${encodeURIComponent(a.username)}`)}
                    style={{ width: 92 }}
                    className="items-center"
                  >
                    <View className="w-16 h-16 rounded-full bg-white/10 overflow-hidden mb-2 items-center justify-center">
                      {a.avatarUrl ? (
                        <Image source={{ uri: a.avatarUrl }} style={{ width: 64, height: 64 }} contentFit="cover" />
                      ) : (
                        <Text className="text-lg text-white/50">{a.displayName[0]?.toUpperCase()}</Text>
                      )}
                    </View>
                    <Text numberOfLines={1} className="text-xs text-white/75 text-center">
                      {a.displayName}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {charted.length > 0 && (
            <View>
              <Pressable onPress={() => router.push("/charted")} className="mb-4">
                <Text className="text-xs tracking-widest uppercase text-white/30">Charted</Text>
              </Pressable>
              <View className="gap-1">
                {charted.map((track, i) => (
                  <ChartedRow key={track.id} track={track} rank={i + 1} queue={charted} />
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
