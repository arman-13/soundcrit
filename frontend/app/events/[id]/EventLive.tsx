"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getEventSync, getEventComments, postEventComment, getEvent } from "@/lib/api";
import { useEventHub, HubTrack } from "@/hooks/useEventHub";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { LiveEventDetail, EventComment, EventTrack, Track } from "@/types";
import EventEndingScreen from "./EventEndingScreen";
import EventEnded from "./EventEnded";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const { currentTrack: playerTrack, playTrack, seekTo, setIsLive, setIsCountdown, setLiveEventId, dismiss } = useAudioPlayer();
  const router = useRouter();

  useEffect(() => {
    setIsLive(true);
    setLiveEventId(event.id);
    return () => { setIsCountdown(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approvedTracks = useMemo(
    () => event.tracks.filter((t) => t.status === "Approved").sort((a, b) => a.order - b.order),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event.id]
  );

  const [countdown, setCountdown] = useState<number | null>(null);
  // Hoisted above the preload effect below, which needs to depend on whether a
  // countdown is running without re-firing on every one-second tick.
  const isCountdown = countdown !== null;
  const [trackIndex, setTrackIndex] = useState(event.playbackState.currentTrackIndex);
  // Elapsed time is *derived*, not counted. It used to be a counter incremented
  // by a 1s interval, which loses real time whenever the browser throttles timers
  // (background tabs fire as slowly as once a minute), so the position drifted
  // steadily behind the server — and comment timestamps, taken from this value,
  // drifted with it.
  //
  // Instead we keep an anchor: the elapsed figure the server last reported, and
  // the local clock reading at the moment we received it. Elapsed is then the
  // anchor plus real wall-clock time since, which is immune to throttling
  // because it measures time rather than counting ticks. Each /sync poll
  // re-anchors, so any residual error is bounded by the poll interval.
  // Anchors are set from event handlers and async continuations, never during
  // render — reading the clock while rendering is impure. Both clock fields
  // start at 0 so the first frame derives an elapsed of exactly 0.
  const [anchor, setAnchor] = useState({ index: trackIndex, serverElapsed: 0, localMs: 0 });

  // Drives a re-render each second; the displayed value comes from the anchor.
  const [tickNow, setTickNow] = useState(0);

  // Sets the display clock from the same reading as the anchor, so the new
  // position is shown immediately rather than reading 0 until the next tick.
  const anchorTo = useCallback((index: number, serverElapsed: number) => {
    const now = Date.now();
    setAnchor({ index, serverElapsed, localMs: now });
    setTickNow(now);
  }, []);

  // If the track moved on without a matching anchor, show 0 rather than carrying
  // the previous track's position forward.
  const elapsed = anchor.index !== trackIndex
    ? 0
    : Math.max(0, anchor.serverElapsed + (tickNow - anchor.localMs) / 1000);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [endedEvent, setEndedEvent] = useState<typeof event | null>(null);

  // Current event track (for comments eventTrackId)
  const [currentEventTrackId, setCurrentEventTrackId] = useState<number | null>(
    approvedTracks[event.playbackState.currentTrackIndex]?.id ?? null
  );

  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [comments]);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackIndexRef = useRef(trackIndex);
  useEffect(() => { trackIndexRef.current = trackIndex; }, [trackIndex]);

  const playNextTrack = useCallback((index: number) => {
    const next = approvedTracks[index];
    if (!next) return;
    setTrackIndex(index);
    anchorTo(index, 0);
    setCurrentEventTrackId(next.id);
    setComments([]);
    playTrack(toTrack(next), approvedTracks.map(toTrack));
    getEventComments(event.id, next.id).then(setComments).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedTracks, event.id]);

  const startCountdown = useCallback((seconds: number) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setIsCountdown(true);
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setIsCountdown(false);
          playNextTrack(trackIndexRef.current + 1);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    countdownIntervalRef.current = interval;
  }, [setIsCountdown, playNextTrack]);

  // Warm the browser's HTTP cache for the next track during the countdown, so the
  // player's own <audio> element finds it already local and starts instantly.
  // The element here is deliberately throwaway — it exists only for that cache
  // side effect, since playback goes through AudioPlayerContext's element and
  // cannot be handed a different one.
  useEffect(() => {
    const next = approvedTracks[trackIndex + 1];
    if (!isCountdown || !next?.audioUrl) return;

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = next.audioUrl;

    return () => {
      // Abort a still-running fetch. Previously the cleanup only dropped a
      // reference, leaving the browser to finish downloading a track the
      // listener may have already moved past.
      audio.src = "";
      audio.load();
    };
  }, [isCountdown, trackIndex, approvedTracks]);

  const handleTrackChanged = useCallback((hubTrack: HubTrack) => {
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    setCountdown(null);
    setIsCountdown(false);
    // Skip if countdown expiry already started playing this track
    if (playerTrack?.id === hubTrack.trackId) return;
    setTrackIndex(hubTrack.index);
    anchorTo(hubTrack.index, 0);
    setCurrentEventTrackId(hubTrack.eventTrackId);
    playTrack(hubToTrack(hubTrack), approvedTracks.map(toTrack));
    setComments([]);
    getEventComments(event.id, hubTrack.eventTrackId).then(setComments).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedTracks, event.id, playerTrack?.id]);

  const triggerEnding = useCallback(() => {
    setIsLive(false); setIsCountdown(false); setLiveEventId(null); dismiss();
    setIsEnding(true);
    // Prefetch ended event data so EventEnded renders immediately after animation
    getEvent(event.id).then(setEndedEvent).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  useEventHub(
    event.id, token,
    (comment) => setComments((prev) => {
      const idx = prev.findIndex((c) => c.id < 0 && c.content === comment.content && c.displayName === comment.displayName);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = comment;
        return next;
      }
      return [...prev, comment];
    }),
    startCountdown,
    handleTrackChanged,
    undefined,
    undefined,
    // Handled as a push callback rather than by mirroring hub state into an
    // effect, so ending the session is a direct reaction to the signal.
    triggerEnding,
  );

  // Sync on mount and on tab focus — restores playback position and countdown state
  // Full sync on mount only — restores track, elapsed, countdown
  useEffect(() => {
    getEventSync(event.id).then((sync) => {
      if (sync.status === "Ended") {
        triggerEnding();
        return;
      }
      setTrackIndex(sync.currentTrackIndex);
      if (sync.countdownSeconds > 0) {
        startCountdown(Math.ceil(sync.countdownSeconds));
        return;
      }
      setIsCountdown(false);
      setCountdown(null);
      const track = approvedTracks[sync.currentTrackIndex];
      if (track) {
        setCurrentEventTrackId(track.id);
        anchorTo(sync.currentTrackIndex, sync.elapsedSeconds);
        if (playerTrack?.id !== track.trackId) {
          playTrack(toTrack(track), approvedTracks.map(toTrack));
          setTimeout(() => seekTo(sync.elapsedSeconds), 100);
          getEventComments(event.id, track.id).then(setComments).catch(() => {});
        }
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Poll every 5s and on tab re-focus: catch missed CountdownStarted / EventEnded signals
  useEffect(() => {
    const checkSync = () => {
      getEventSync(event.id).then((sync) => {
        if (sync.status === "Ended") {
          triggerEnding();
        } else if (sync.countdownSeconds > 0 && countdown === null) {
          startCountdown(Math.ceil(sync.countdownSeconds));
        } else if (sync.status === "Live") {
          // Re-anchor on every poll, so drift can never accumulate beyond one
          // poll interval no matter how long the tab sat in the background.
          anchorTo(sync.currentTrackIndex, sync.elapsedSeconds);
        }
      }).catch(() => {});
    };
    const interval = setInterval(checkSync, 5000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Coming back to the tab: refresh the display immediately, then re-anchor
      // against the server rather than trusting the local audio element.
      setTickNow(Date.now());
      checkSync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, countdown]);

  // Pure display tick — advances the clock reading that `elapsed` is computed
  // from. It carries no state of its own, so a throttled or skipped interval
  // costs a stale frame rather than permanently lost time.
  useEffect(() => {
    const id = setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);


  const handleComment = async () => {
    if (!token || !commentText.trim() || !currentEventTrackId) return;
    setSubmitting(true);
    const timestamp = isCountdown ? -1 : Math.max(0, Math.floor(elapsed) - 2);
    const text = commentText.trim();
    setCommentText("");
    const optimisticId = -Date.now();
    setComments((prev) => [...prev, {
      id: optimisticId,
      eventTrackId: currentEventTrackId,
      userId: user?.id ?? "",
      content: text,
      trackTimestamp: timestamp,
      displayName: isAnonymous ? "Anonymous" : (user?.displayName ?? user?.email ?? "You"),
      isAnonymous,
      createdAt: new Date().toISOString(),
    }]);
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


  if (showEnded && endedEvent) return <EventEnded event={endedEvent} />;
  if (isEnding) return (
    <EventEndingScreen
      eventTitle={event.title}
      onDone={() => { if (endedEvent) setShowEnded(true); else router.refresh(); }}
    />
  );

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

{currentTrack ? (
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="relative w-full md:w-56 aspect-square rounded-xl overflow-hidden bg-white/5 shrink-0">
            <Image src={currentTrack.coverImageUrl} alt={currentTrack.title} fill className="object-cover" />
            {isCountdown && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-3xl font-light text-white/60 tabular-nums">
                  {countdown != null ? String(Math.ceil(countdown)).padStart(2, "0") : "00"}s
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-xs tracking-widest uppercase text-white/25 mb-2">{currentTrack.genre}</p>
            <h1 className="text-3xl font-light text-white/90 mb-1">{currentTrack.title}</h1>
            <p className="text-base text-white/45 mb-2">{currentTrack.artist}</p>
            {currentTrack.description && (
              <p className="text-sm text-white/35 leading-relaxed mb-3 max-w-sm">{currentTrack.description}</p>
            )}
            {isCountdown && (
              <p className="text-xs text-white/25 tracking-wide">Up next in {countdown != null ? String(Math.ceil(countdown)).padStart(2, "0") : "00"}s</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-white/30 mb-12">Waiting for tracks…</p>
      )}

      {/* Comments */}
      <div className="mt-8">
        <h2 className="text-xs tracking-widest uppercase text-white/25 mb-6">Live Comments</h2>
        <div className="space-y-3 mb-6 max-h-64 overflow-y-auto flex flex-col">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50 shrink-0">
                {c.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-sm font-medium text-white/70 mr-2">{c.displayName}</span>
                {c.trackTimestamp >= 0 && <span className="text-xs text-white/25 mr-2">{fmtTime(c.trackTimestamp)}</span>}
                <span className="text-sm text-white/50">{c.content}</span>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-white/25">No comments yet.</p>}
          <div ref={commentsEndRef} />
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
