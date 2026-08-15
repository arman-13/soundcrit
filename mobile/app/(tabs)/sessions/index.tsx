import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Screen from "@/components/Screen";
import EventRow from "@/components/EventRow";
import { getEvents } from "@/lib/api";
import { LiveEvent } from "@/types";

export default function SessionsScreen() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setEvents(await getEvents());
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

  const live = events.filter((e) => e.status === "Live");
  const upcoming = events.filter((e) => e.status === "Upcoming");
  const past = events.filter((e) => e.status === "Ended");

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View className="px-6 pt-4 pb-8">
        <Text className="text-xs tracking-widest uppercase text-white/30 mb-3">Live Listening</Text>
        <Text className="text-4xl font-light text-white/90">Sessions</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text className="text-white/30 text-sm text-center px-6">
          Couldn&apos;t reach the server. Pull down to try again.
        </Text>
      ) : events.length === 0 ? (
        <Text className="text-white/25 text-sm px-6">No sessions yet.</Text>
      ) : (
        <View className="px-4 gap-8">
          {live.length > 0 && (
            <View>
              <Text className="text-xs tracking-widest uppercase text-white/25 mb-2 px-2">Live Now</Text>
              <View>
                {live.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </View>
            </View>
          )}
          {upcoming.length > 0 && (
            <View>
              <Text className="text-xs tracking-widest uppercase text-white/25 mb-2 px-2">Upcoming</Text>
              <View>
                {upcoming.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </View>
            </View>
          )}
          {past.length > 0 && (
            <View>
              <Text className="text-xs tracking-widest uppercase text-white/25 mb-2 px-2">Past Sessions</Text>
              <View>
                {past.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
