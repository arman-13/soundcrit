import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Screen from "@/components/Screen";
import EventUpcomingView from "@/components/screens/EventUpcomingView";
import EventLiveView from "@/components/screens/EventLiveView";
import EventEndedView from "@/components/screens/EventEndedView";
import { getEvent } from "@/lib/api";
import { LiveEventDetail } from "@/types";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<LiveEventDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvent(Number(id))
      .then(setEvent)
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

  if (notFound || !event) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/50 text-sm">Session not found.</Text>
        </View>
      </Screen>
    );
  }

  if (event.status === "Upcoming") return <EventUpcomingView event={event} onLive={setEvent} />;
  if (event.status === "Live") return <EventLiveView event={event} />;
  return <EventEndedView event={event} />;
}
