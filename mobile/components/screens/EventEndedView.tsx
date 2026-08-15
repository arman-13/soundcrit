import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { getEventComments, postEventComment } from "@/lib/api";
import { EventComment, EventTrack, LiveEventDetail, Track } from "@/types";
import { PauseIcon, PlayIcon } from "@/components/icons";

function fmtDate(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

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

export default function EventEndedView({ event }: { event: LiveEventDetail }) {
  const { width } = useWindowDimensions();
  const { user, token } = useAuth();
  const { currentTrack, isPlaying, setIsPlaying, playTrack, seekTo, setIsLive } = useAudioPlayer();
  const [selectedTrack, setSelectedTrack] = useState<EventTrack | null>(null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loadedTrackId, setLoadedTrackId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const coverSize = width - 48;

  const approvedTracks = event.tracks.filter((t) => t.status === "Approved").sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (approvedTracks[0]) selectTrack(event.id, approvedTracks[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTrack = async (eventId: number, track: EventTrack) => {
    setSelectedTrack(track);
    if (loadedTrackId === track.id) return;
    try {
      const c = await getEventComments(eventId, track.id);
      setComments(c);
      setLoadedTrackId(track.id);
    } catch {}
  };

  const togglePlay = (track: EventTrack, queue: EventTrack[]) => {
    setIsLive(false);
    if (currentTrack?.id === track.trackId) {
      setIsPlaying(!isPlaying);
    } else {
      playTrack(toTrack(track), queue.map(toTrack));
    }
  };

  const jumpTo = (track: EventTrack, queue: EventTrack[], seconds: number) => {
    setIsLive(false);
    if (currentTrack?.id === track.trackId) {
      seekTo(seconds);
    } else {
      playTrack(toTrack(track), queue.map(toTrack));
      setTimeout(() => seekTo(seconds), 400);
    }
  };

  const handleComment = async () => {
    if (!token || !commentText.trim() || !selectedTrack) return;
    setSubmitting(true);
    try {
      const c = await postEventComment(
        event.id,
        { content: commentText.trim(), eventTrackId: selectedTrack.id, trackTimestamp: 0, isAnonymous },
        token
      );
      setComments((prev) => [...prev, c]);
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View className="px-6 pt-4">
        <View style={{ width: coverSize, height: coverSize }} className="rounded-lg overflow-hidden bg-white/5 mb-6">
          {event.coverImageUrl ? (
            <Image source={{ uri: event.coverImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : null}
        </View>

        <Text className="text-xs tracking-widest uppercase text-white/25 mb-3">Past Session</Text>

        <Text className="text-3xl font-light text-white/90 leading-tight mb-3">{event.title}</Text>
        <Text className="text-sm text-white/35 mb-1">Hosted by {event.hostDisplayName}</Text>
        <Text className="text-sm text-white/35 mb-6">{fmtDate(event.scheduledAt)}</Text>

        {event.description ? (
          <Text className="text-sm text-white/45 leading-relaxed mb-8">{event.description}</Text>
        ) : null}

        {approvedTracks.length > 0 && (
          <View className="mb-10">
            <Text className="text-xs tracking-widest uppercase text-white/25 mb-4">Lineup</Text>
            {approvedTracks.map((t, i) => {
              const isSelected = selectedTrack?.id === t.id;
              const isActive = currentTrack?.id === t.trackId && isPlaying;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => selectTrack(event.id, t)}
                  className={`flex-row items-center gap-4 px-2 py-3 rounded-lg ${isSelected ? "bg-white/8" : ""}`}
                >
                  <Text className="w-5 text-center text-xs text-white/25">{i + 1}</Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      togglePlay(t, approvedTracks);
                    }}
                    className="w-10 h-10 rounded overflow-hidden bg-white/5 shrink-0 items-center justify-center"
                  >
                    <Image source={{ uri: t.coverImageUrl }} style={{ width: 40, height: 40, position: "absolute" }} contentFit="cover" />
                    {isActive ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                  </Pressable>
                  <View className="flex-1 min-w-0">
                    <Text numberOfLines={1} className="text-sm text-white/80">
                      {t.title}
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-white/30 mt-0.5">
                      {t.artist}
                    </Text>
                  </View>
                  <Text className="text-xs text-white/25">{t.duration}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {selectedTrack && (
          <View className="mb-8">
            <Text className="text-xs tracking-widest uppercase text-white/25 mb-4">Comments</Text>

            <View className="gap-6 mb-8">
              {comments.length === 0 && <Text className="text-sm text-white/25">No comments for this track.</Text>}
              {comments.map((c) => (
                <View key={c.id} className="flex-row gap-4">
                  <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center mt-0.5">
                    <Text className="text-xs text-white/50">{c.displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-baseline gap-2 mb-1">
                      <Text className="text-sm font-medium text-white/75">{c.displayName}</Text>
                      {c.trackTimestamp > 0 && (
                        <Pressable
                          onPress={() => jumpTo(selectedTrack, approvedTracks, c.trackTimestamp)}
                          className="bg-white/5 rounded px-1.5 py-0.5"
                        >
                          <Text className="text-xs text-white/35">{fmtTime(c.trackTimestamp)}</Text>
                        </Pressable>
                      )}
                    </View>
                    <Text className="text-sm text-white/55 leading-relaxed">{c.content}</Text>
                  </View>
                </View>
              ))}
            </View>

            {user ? (
              <View className="gap-3">
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Leave a comment…"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  numberOfLines={3}
                  className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/75 font-sans"
                  style={{ textAlignVertical: "top", minHeight: 76 }}
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
                    <Text className="text-black text-sm font-medium">{submitting ? "Posting…" : "Post"}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text className="text-sm text-white/30">
                <Text className="underline" onPress={() => router.push("/login")}>
                  Sign in
                </Text>{" "}
                to leave a comment.
              </Text>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
