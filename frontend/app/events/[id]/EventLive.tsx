"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getEventSync, getEventComments, postEventComment } from "@/lib/api";
import { useEventHub, HubTrack } from "@/hooks/useEventHub";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { LiveEventDetail, EventComment, EventTrack, Track } from "@/types";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
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

function hubToTrack(h: HubTrack): Track {
  return {
    id: h.trackId,
    title: h.title,
    artist: h.artist,
    audioUrl: h.audioUrl,
    coverImageUrl: h.coverImageUrl,
    duration: h.duration,
    genre: h.genre ?? "",
    albumTitle: "",
    publishedAt: "",
    isPublished: true,
    playCount: 0,
    isFeatured: false,
  };
}

export default function EventLive({ event }: { event: LiveEventDetail }) {
  const { user, token } = useAuth();
  const { currentTrack: playerTrack, isPlaying, setIsPlaying, playTrack, seekTo, setIsLive, setIsCountdown, setLiveEventId } = useAudioPlayer();
  const router = useRouter();

  useEffect(() => {
    setIsLive(true);
    setLiveEventId(event.id);
    return () => { setIsCountdown(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approvedTracks = event.tracks.filter((t) => t.status === "Approved").sort((a, b) => a.order - b.order);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [trackIndex, setTrackIndex] = useState(event.playbackState.currentTrackIndex);
  const [elapsed, setElapsed] = useState(0);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Current event track (for comments eventTrackId)
  const [currentEventTrackId, setCurrentEventTrackId] = useState<number | null>(
    approvedTracks[event.playbackState.currentTrackIndex]?.id ?? null
  );

  const startCountdown = useCallback((seconds: number) => {
    setIsCountdown(true);
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) { clearInterval(interval); return null; }
        return prev - 1;
      });
    }, 1000);
  }, [setIsCountdown]);

  const handleTrackChanged = useCallback((hubTrack: HubTrack) => {
    setCountdown(null);
    setIsCountdown(false);
    setTrackIndex(hubTrack.index);
    setCurrentEventTrackId(hubTrack.eventTrackId);
    playTrack(hubToTrack(hubTrack), approvedTracks.map(toTrack));
    setTimeout(() => seekTo(0), 100);
    setComments([]);
    getEventComments(event.id, hubTrack.eventTrackId).then(setComments).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedTracks, event.id]);

  const { eventStatus } = useEventHub(
    event.id, token,
    (comment) => setComments((prev) => {
      const idx = prev.findIndex((c) => c.id < 0 && c.content === comment.content && c.displayName === comment.displayName);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = comment;
        return next;
      }
      return [comment, ...prev];
    }),
    startCountdown,
    handleTrackChanged,
  );

  useEffect(() => {
    if (eventStatus === "Ended") {
      setIsLive(false);
      setIsCountdown(false);
      setLiveEventId(null);
      router.refresh();
    }
  }, [eventStatus, setIsLive, setIsCountdown, setLiveEventId, router]);

  // Sync on mount — restore playback position and countdown state
  useEffect(() => {
    getEventSync(event.id).then((sync) => {
      setTrackIndex(sync.currentTrackIndex);

      if (sync.countdownSeconds > 0) {
        startCountdown(Math.ceil(sync.countdownSeconds));
        return;
      }

      setElapsed(sync.elapsedSeconds);
      const track = approvedTracks[sync.currentTrackIndex];
      if (track) {
        setCurrentEventTrackId(track.id);
        if (playerTrack?.id !== track.trackId) {
          playTrack(toTrack(track), approvedTracks.map(toTrack));
          setTimeout(() => seekTo(sync.elapsedSeconds), 100);
        }
        getEventComments(event.id, track.id).then(setComments).catch(() => {});
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Live elapsed timer — resets when track changes
  useEffect(() => {
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [trackIndex]);

  const handleComment = async () => {
    if (!token || !commentText.trim() || !currentEventTrackId) return;
    setSubmitting(true);
    const timestamp = Math.max(0, Math.floor(elapsed) - 2);
    const text = commentText.trim();
    setCommentText("");
    const optimisticId = -Date.now();
    setComments((prev) => [{
      id: optimisticId,
      eventTrackId: currentEventTrackId,
      userId: user?.id ?? "",
      content: text,
      trackTimestamp: timestamp,
      displayName: isAnonymous ? "Anonymous" : (user?.displayName ?? user?.email ?? "You"),
      isAnonymous,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    try {
      await postEventComment(event.id, {
        content: text,
        eventTrackId: currentEventTrackId,
        trackTimestamp: timestamp,
        isAnonymous,
      }, token);
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
    } finally {
      setSubmitting(false);
    }
  };

  const currentTrack = approvedTracks[trackIndex] ?? null;
  const isCountdown = countdown !== null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 pb-28">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <p className="text-xs tracking-widest uppercase text-white/30">Live · {event.title}</p>
      </div>
      {event.description && (
        <p className="text-sm text-white/35 leading-relaxed mb-10 max-w-lg">{event.description}</p>
      )}
      {!event.description && <div className="mb-10" />}

      {playerTrack && !isPlaying && !isCountdown && (
        <button
          onClick={() => { setIsPlaying(true); }}
          className="mb-8 w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        >
          <span className="text-lg">▶</span>
          <span className="text-sm tracking-wide">Tap to listen</span>
        </button>
      )}

      {currentTrack ? (
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="relative w-full md:w-56 aspect-square rounded-xl overflow-hidden bg-white/5 shrink-0">
            {!isCountdown && <Image src={currentTrack.coverImageUrl} alt={currentTrack.title} fill className="object-cover" />}
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-xs tracking-widest uppercase text-white/25 mb-2">{isCountdown ? "—" : currentTrack.genre}</p>
            <h1 className="text-3xl font-light text-white/90 mb-1">
              {isCountdown
                ? <span className="flex items-baseline gap-3">_ <span className="text-xl text-white/40 tabular-nums">{String(Math.ceil(countdown!)).padStart(2, "0")}s</span></span>
                : currentTrack.title}
            </h1>
            <p className="text-base text-white/45 mb-2">{isCountdown ? "—" : currentTrack.artist}</p>
            {!isCountdown && currentTrack.description && (
              <p className="text-sm text-white/35 leading-relaxed mb-3 max-w-sm">{currentTrack.description}</p>
            )}
            {!isCountdown && <p className="text-xs text-white/25 tabular-nums">{fmtTime(elapsed)} / {currentTrack.duration}</p>}
          </div>
        </div>
      ) : (
        <p className="text-white/30 mb-12">Waiting for tracks…</p>
      )}

      {/* Comments */}
      <div className="mt-8">
        <h2 className="text-xs tracking-widest uppercase text-white/25 mb-6">Live Comments</h2>
        <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50 shrink-0">
                {c.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-sm font-medium text-white/70 mr-2">{c.displayName}</span>
                <span className="text-xs text-white/25 mr-2">{fmtTime(c.trackTimestamp)}</span>
                <span className="text-sm text-white/50">{c.content}</span>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-white/25">No comments yet.</p>}
        </div>

        {user ? (
          <div className="flex gap-3">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); }}}
              placeholder="Comment…"
              className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
            />
            <label className="flex items-center gap-1.5 text-xs text-white/30 cursor-pointer">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-white" />
              Anon
            </label>
            <button onClick={handleComment} disabled={submitting || !commentText.trim()}
              className="bg-white text-black text-sm font-medium px-4 py-2.5 rounded hover:bg-white/90 transition-colors disabled:opacity-40">
              Send
            </button>
          </div>
        ) : (
          <p className="text-sm text-white/30"><a href="/login" className="underline underline-offset-2">Sign in</a> to comment.</p>
        )}
      </div>
    </div>
  );
}
