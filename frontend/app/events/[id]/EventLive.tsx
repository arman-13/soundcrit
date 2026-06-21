"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getEventSync, getEventComments, postEventComment } from "@/lib/api";
import { useEventHub } from "@/hooks/useEventHub";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { LiveEventDetail, EventComment, EventTrack, Track } from "@/types";
import Image from "next/image";
import { useEffect, useState } from "react";

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

export default function EventLive({ event }: { event: LiveEventDetail }) {
  const { user, token } = useAuth();
  const { currentTrack: playerTrack, playTrack, seekTo, setIsLive } = useAudioPlayer();

  useEffect(() => {
    setIsLive(true);
    return () => setIsLive(false);
  }, [setIsLive]);
  const { currentTrackIndex: hubTrackIndex, countdown } = useEventHub(
    event.id, token,
    (comment) => setComments((prev) => [comment, ...prev]),
  );
  const [trackIndex, setTrackIndex] = useState(event.playbackState.currentTrackIndex);
  const [elapsed, setElapsed] = useState(0);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const approvedTracks = event.tracks.filter((t) => t.status === "Approved").sort((a, b) => a.order - b.order);
  const currentTrack = approvedTracks[trackIndex] ?? null;

  // Sync on mount — load audio at correct position and fetch existing comments
  useEffect(() => {
    getEventSync(event.id).then((sync) => {
      setTrackIndex(sync.currentTrackIndex);
      setElapsed(sync.elapsedSeconds);
      const sorted = event.tracks.filter((t) => t.status === "Approved").sort((a, b) => a.order - b.order);
      const track = sorted[sync.currentTrackIndex];
      if (track) {
        if (playerTrack?.id !== track.trackId) {
          playTrack(toTrack(track), sorted.map(toTrack));
          setTimeout(() => seekTo(sync.elapsedSeconds), 100);
        }
        getEventComments(event.id, track.id).then(setComments).catch(() => {});
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Track changes from hub — switch to new track from beginning and load its comments
  useEffect(() => {
    if (hubTrackIndex === null) return;
    setTrackIndex(hubTrackIndex);
    const sorted = event.tracks.filter((t) => t.status === "Approved").sort((a, b) => a.order - b.order);
    const track = sorted[hubTrackIndex];
    if (track) {
      playTrack(toTrack(track), sorted.map(toTrack));
      setTimeout(() => seekTo(0), 100);
      setComments([]);
      getEventComments(event.id, track.id).then(setComments).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubTrackIndex]);

  // Live elapsed timer
  useEffect(() => {
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [trackIndex]);

  const handleComment = async () => {
    if (!token || !commentText.trim() || !currentTrack) return;
    setSubmitting(true);
    try {
      await postEventComment(event.id, {
        content: commentText.trim(),
        eventTrackId: currentTrack.id,
        trackTimestamp: Math.floor(elapsed),
        isAnonymous,
      }, token);
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  };

  if (countdown !== null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center pb-20">
        <p className="text-xs tracking-widest uppercase text-white/30 mb-8">Next track in</p>
        <p className="text-8xl font-light text-white/90 tabular-nums">{String(Math.ceil(countdown)).padStart(2, "0")}</p>
        <p className="text-xs text-white/25 mt-3">seconds</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 pb-28">
      <div className="flex items-center gap-2 mb-10">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <p className="text-xs tracking-widest uppercase text-white/30">Live · {event.title}</p>
      </div>

      {currentTrack ? (
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="relative w-full md:w-56 aspect-square rounded-xl overflow-hidden bg-white/5 shrink-0">
            <Image src={currentTrack.coverImageUrl} alt={currentTrack.title} fill className="object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-xs tracking-widest uppercase text-white/25 mb-2">{currentTrack.genre}</p>
            <h1 className="text-3xl font-light text-white/90 mb-1">{currentTrack.title}</h1>
            <p className="text-base text-white/45 mb-4">{currentTrack.artist}</p>
            <p className="text-xs text-white/25 tabular-nums">{fmtTime(elapsed)} / {currentTrack.duration}</p>
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
