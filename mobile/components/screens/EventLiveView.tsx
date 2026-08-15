import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import PulseDot from "@/components/PulseDot";
import EventEndingView from "@/components/screens/EventEndingView";
import EventEndedView from "@/components/screens/EventEndedView";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { getEvent, getEventComments, getEventSync, postEventComment } from "@/lib/api";
import { EventComment, EventSync, EventTrack, LiveEventDetail, Track } from "@/types";

const SYNC_INTERVAL_MS = 4000;
const COMMENTS_INTERVAL_MS = 4000;

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function toTrack(et: EventTrack): Track {
  return {
    id: et.trackId,
    title: et.title,
    artist: et.artist,
    audioUrl: et.audioUrl,
    coverImageUrl: et.coverImageUrl,
    duration: et.duration,
    genre: et.genre ?? "",
    albumTitle: "",
    publishedAt: "",
    isPublished: true,
    playCount: 0,
    isFeatured: false,
  };
}

export default function EventLiveView({ event }: { event: LiveEventDetail }) {
  const { user, token } = useAuth();
  const { currentTrack: playerTrack, playTrack, seekTo, setIsLive, setIsCountdown, setLiveEventId, dismiss } = useAudioPlayer();

  const approvedTracks = useMemo(
    () => event.tracks.filter((t) => t.status === "Approved").sort((a, b) => a.order - b.order),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event.id]
  );

  const [trackIndex, setTrackIndex] = useState(event.playbackState.currentTrackIndex);
  const [currentEventTrackId, setCurrentEventTrackId] = useState<number | null>(
    approvedTracks[event.playbackState.currentTrackIndex]?.id ?? null
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [endedEvent, setEndedEvent] = useState<LiveEventDetail | null>(null);

  const triggerEnding = useCallback(() => {
    setIsLive(false);
    setIsCountdown(false);
    setLiveEventId(null);
    dismiss();
    setIsEnding(true);
    getEvent(event.id).then(setEndedEvent).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const applySync = useCallback(
    (sync: EventSync) => {
      if (sync.status === "Ended") {
        triggerEnding();
        return;
      }
      if (sync.countdownSeconds > 0) {
        setIsCountdown(true);
        setCountdown(Math.ceil(sync.countdownSeconds));
        return;
      }
      setIsCountdown(false);
      setCountdown(null);
      const track = approvedTracks[sync.currentTrackIndex];
      if (!track) return;
      setTrackIndex(sync.currentTrackIndex);
      setCurrentEventTrackId(track.id);
      setElapsed(sync.elapsedSeconds);
      if (playerTrack?.id !== track.trackId) {
        playTrack(toTrack(track), approvedTracks.map(toTrack));
        setTimeout(() => seekTo(sync.elapsedSeconds), 150);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approvedTracks, playerTrack?.id, triggerEnding]
  );

  useEffect(() => {
    setIsLive(true);
    setLiveEventId(event.id);
    return () => setIsCountdown(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial sync + periodic poll — source of truth for track/countdown state
  useEffect(() => {
    getEventSync(event.id).then(applySync).catch(() => {});
    const id = setInterval(() => {
      getEventSync(event.id).then(applySync).catch(() => {});
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [event.id, applySync]);

  // Local countdown ticker between polls — re-syncs immediately once it hits zero
  useEffect(() => {
    if (countdown === null) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          getEventSync(event.id).then(applySync).catch(() => {});
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown !== null, event.id]);

  // Local elapsed ticker between polls
  useEffect(() => {
    if (countdown !== null) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [trackIndex, countdown !== null]);

  // Load comments when the current track changes
  useEffect(() => {
    if (currentEventTrackId == null) return;
    getEventComments(event.id, currentEventTrackId).then(setComments).catch(() => {});
  }, [event.id, currentEventTrackId]);

  // Poll for new comments while live
  useEffect(() => {
    if (currentEventTrackId == null) return;
    const id = setInterval(() => {
      getEventComments(event.id, currentEventTrackId).then((fetched) => {
        setComments((prev) => {
          const optimistic = prev.filter((c) => c.id < 0);
          const stillPending = optimistic.filter(
            (o) => !fetched.some((r) => r.content === o.content && r.displayName === o.displayName)
          );
          return [...fetched, ...stillPending];
        });
      }).catch(() => {});
    }, COMMENTS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [event.id, currentEventTrackId]);

  const handleComment = async () => {
    if (!token || !commentText.trim() || currentEventTrackId == null) return;
    setSubmitting(true);
    const timestamp = countdown !== null ? -1 : Math.max(0, Math.floor(elapsed) - 2);
    const text = commentText.trim();
    setCommentText("");
    const optimisticId = -Date.now();
    setComments((prev) => [
      ...prev,
      {
        id: optimisticId,
        eventTrackId: currentEventTrackId,
        userId: user?.id ?? "",
        content: text,
        trackTimestamp: timestamp,
        displayName: isAnonymous ? "Anonymous" : user?.displayName ?? "You",
        isAnonymous,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      await postEventComment(event.id, { content: text, eventTrackId: currentEventTrackId, trackTimestamp: timestamp, isAnonymous }, token);
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
    } finally {
      setSubmitting(false);
    }
  };

  if (showEnded && endedEvent) return <EventEndedView event={endedEvent} />;
  if (isEnding) {
    return (
      <EventEndingView
        eventTitle={event.title}
        onDone={() => {
          if (endedEvent) setShowEnded(true);
        }}
      />
    );
  }

  const currentTrack = approvedTracks[trackIndex] ?? null;
  const isCountdown = countdown !== null;

  return (
    <Screen>
      <View className="px-6 pt-4">
        <View className="flex-row items-center gap-2 mb-6">
          <PulseDot size={7} />
          <Text className="text-xs text-red-400/80 tracking-widest uppercase">Live · {event.title}</Text>
        </View>

        {currentTrack ? (
          <View className="mb-10">
            <View className="w-full aspect-square rounded-lg overflow-hidden bg-white/5 mb-5">
              <Image source={{ uri: currentTrack.coverImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              {isCountdown && (
                <View className="absolute inset-0 bg-black/60 items-center justify-center">
                  <Text className="text-3xl font-light text-white/70 tabular-nums">
                    {String(Math.ceil(countdown ?? 0)).padStart(2, "0")}s
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-xs tracking-widest uppercase text-white/25 mb-2">{currentTrack.genre}</Text>
            <Text className="text-2xl font-light text-white/90 mb-1">{currentTrack.title}</Text>
            <Text className="text-base text-white/45">{currentTrack.artist}</Text>
            {isCountdown && (
              <Text className="text-xs text-white/25 tracking-wide mt-3">
                Up next in {String(Math.ceil(countdown ?? 0)).padStart(2, "0")}s
              </Text>
            )}
          </View>
        ) : (
          <Text className="text-white/30 mb-10">Waiting for tracks…</Text>
        )}

        <View className="mb-8">
          <Text className="text-xs tracking-widest uppercase text-white/25 mb-4">Live Comments</Text>
          <View className="gap-4 mb-6">
            {comments.length === 0 && <Text className="text-sm text-white/25">No comments yet.</Text>}
            {comments.map((c) => (
              <View key={c.id} className="flex-row gap-3">
                <View className="w-7 h-7 rounded-full bg-white/10 items-center justify-center mt-0.5">
                  <Text className="text-xs text-white/50">{c.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-baseline gap-2 mb-0.5">
                    <Text className="text-sm font-medium text-white/70">{c.displayName}</Text>
                    {c.trackTimestamp >= 0 && <Text className="text-xs text-white/25">{fmtTime(c.trackTimestamp)}</Text>}
                  </View>
                  <Text className="text-sm text-white/50 leading-relaxed">{c.content}</Text>
                </View>
              </View>
            ))}
          </View>

          {user ? (
            <View className="gap-3">
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Comment…"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 font-sans"
              />
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => setIsAnonymous((v) => !v)}
                  className={`px-3 py-1.5 rounded border ${isAnonymous ? "border-white/40 bg-white/5" : "border-white/15"}`}
                >
                  <Text className={`text-xs ${isAnonymous ? "text-white/70" : "text-white/35"}`}>Anon</Text>
                </Pressable>
                <Pressable
                  onPress={handleComment}
                  disabled={submitting || !commentText.trim()}
                  className="ml-auto bg-white rounded px-5 py-2"
                  style={{ opacity: submitting || !commentText.trim() ? 0.4 : 1 }}
                >
                  <Text className="text-black text-sm font-medium">Send</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text className="text-sm text-white/30">
              <Text className="underline" onPress={() => router.push("/login")}>
                Sign in
              </Text>{" "}
              to comment.
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
