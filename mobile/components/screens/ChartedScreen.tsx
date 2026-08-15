import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Screen from "@/components/Screen";
import ChartedRow from "@/components/ChartedRow";
import { getChartedTracks } from "@/lib/api";
import { Track } from "@/types";

export default function ChartedScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getChartedTracks()
      .then(setTracks)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen>
      <View className="px-6 pt-4 pb-8">
        <Text className="text-xs tracking-widest uppercase text-white/30 mb-3">Most Played</Text>
        <Text className="text-4xl font-light text-white/90">Charted</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text className="text-white/30 text-sm text-center px-6">Couldn&apos;t reach the server.</Text>
      ) : tracks.length === 0 ? (
        <Text className="text-white/25 text-sm px-6">Nothing charted yet.</Text>
      ) : (
        <View className="px-4 gap-1">
          {tracks.map((track, i) => (
            <ChartedRow key={track.id} track={track} rank={i + 1} queue={tracks} />
          ))}
        </View>
      )}
    </Screen>
  );
}
