import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { getEvent, getMyEventRequest, submitJoinRequest } from "@/lib/api";
import { LiveEventDetail } from "@/types";

function fmtDate(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function useCountdown(scheduledAt: string, onExpire: () => void) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const scheduled = scheduledAt.endsWith("Z") ? scheduledAt : scheduledAt + "Z";
    const tick = () => {
      const diff = Math.max(0, new Date(scheduled).getTime() - Date.now());
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
      if (diff === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  return parts;
}

export default function EventUpcomingView({ event, onLive }: { event: LiveEventDetail; onLive: (event: LiveEventDetail) => void }) {
  const { width } = useWindowDimensions();
  const { user, token } = useAuth();
  const coverSize = width - 48;

  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isHost = user?.id === event.hostId;

  useEffect(() => {
    if (!token || isHost) {
      setRequestLoading(false);
      return;
    }
    getMyEventRequest(event.id, token)
      .then(({ status }) => setRequestStatus(status))
      .catch(() => {})
      .finally(() => setRequestLoading(false));
  }, [event.id, token, isHost]);

  const checkIfLive = () => {
    getEvent(event.id)
      .then((e) => {
        if (e.status !== "Upcoming") onLive(e);
      })
      .catch(() => {});
  };

  const { d, h, m, s } = useCountdown(event.scheduledAt, checkIfLive);

  // Fallback poll in case the countdown fires slightly before the server flips status
  useEffect(() => {
    const id = setInterval(checkIfLive, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const handleRequest = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      await submitJoinRequest(event.id, message || undefined, token);
      setRequestStatus("Pending");
    } catch {
      setRequestStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View className="px-6 pt-4 items-center">
        {event.coverImageUrl && (
          <View style={{ width: coverSize, height: coverSize }} className="rounded-lg overflow-hidden bg-white/5 mb-6">
            <Image source={{ uri: event.coverImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          </View>
        )}

        <Text className="text-xs tracking-widest uppercase text-white/25 mb-3">Upcoming Session</Text>
        <Text className="text-3xl font-light text-white/90 leading-tight mb-3 text-center">{event.title}</Text>
        {event.description ? (
          <Text className="text-sm text-white/45 leading-relaxed mb-4 text-center">{event.description}</Text>
        ) : null}
        <Text className="text-sm text-white/35 mb-8">Hosted by {event.hostDisplayName}</Text>

        <View className="flex-row gap-6 mb-10">
          {[
            ["d", d],
            ["h", h],
            ["m", m],
            ["s", s],
          ].map(([label, val]) => (
            <View key={label as string} className="items-center">
              <Text className="text-4xl font-light text-white/90 tabular-nums">{String(val).padStart(2, "0")}</Text>
              <Text className="text-xs text-white/25 uppercase tracking-widest mt-1">{label}</Text>
            </View>
          ))}
        </View>

        <Text className="text-xs text-white/25 mb-10">{fmtDate(event.scheduledAt)}</Text>

        {requestLoading ? (
          <ActivityIndicator color="rgba(255,255,255,0.4)" />
        ) : isHost ? null : !user ? (
          <Pressable onPress={() => router.push("/login")}>
            <Text className="text-sm text-white/40 underline">Sign in to request access</Text>
          </Pressable>
        ) : !requestStatus ? (
          <View className="w-full gap-3">
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Why do you want to join? (optional)"
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              numberOfLines={2}
              className="bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 font-sans"
              style={{ textAlignVertical: "top", minHeight: 60 }}
            />
            <Pressable
              onPress={handleRequest}
              disabled={submitting}
              className="bg-white rounded py-3 items-center"
              style={{ opacity: submitting ? 0.5 : 1 }}
            >
              <Text className="text-black text-sm font-medium">{submitting ? "Requesting…" : "Request to join"}</Text>
            </Pressable>
          </View>
        ) : requestStatus === "Pending" ? (
          <Text className="text-sm text-white/40">Request sent — waiting for approval.</Text>
        ) : requestStatus === "Rejected" ? (
          <Text className="text-sm text-red-400/60">Your request was not approved.</Text>
        ) : requestStatus === "Approved" ? (
          <Text className="text-sm text-green-400/60">You're in — see you at the session.</Text>
        ) : null}
      </View>
    </Screen>
  );
}
