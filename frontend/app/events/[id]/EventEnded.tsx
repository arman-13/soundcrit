"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getEventComments, postEventComment } from "@/lib/api";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { LiveEventDetail, EventComment, EventTrack, Track } from "@/types";
import Image from "next/image";
import { useState, useEffect } from "react";

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function toTrack(et: EventTrack): Track {
  return {
    id: et.trackId, title: et.title, artist: et.artist,
    audioUrl: et.audioUrl, coverImageUrl: et.coverImageUrl,
    duration: et.duration, genre: et.genre ?? "",
    albumTitle: "", publishedAt: "", isPublished: true, playCount: 0, isFeatured: false,
  };
}

export default function EventEnded({ event }: { event: LiveEventDetail }) {
  const { user, token } = useAuth();
  const { playTrack: globalPlay, currentTrack, isPlaying, setIsPlaying, seekTo, setIsLive } = useAudioPlayer();
  const approvedTracks = event.tracks.filter((t) => t.status === "Approved").sort((a, b) => a.order - b.order);
  const [selectedTrack, setSelectedTrack] = useState<EventTrack | null>(approvedTracks[0] ?? null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loadedTrackId, setLoadedTrackId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (approvedTracks[0]) selectTrack(approvedTracks[0]);
  }, []);

  const selectTrack = async (track: EventTrack) => {
    setSelectedTrack(track);
    if (loadedTrackId === track.id) return;
    try {
      const c = await getEventComments(event.id, track.id);
      setComments(c);
      setLoadedTrackId(track.id);
    } catch {}
  };

  const playTrack = (track: EventTrack) => {
    setIsLive(false);
    if (currentTrack?.id === track.trackId) {
      setIsPlaying(!isPlaying);
    } else {
      globalPlay(toTrack(track), approvedTracks.map(toTrack));
    }
  };

  const handleComment = async () => {
    if (!token || !commentText.trim() || !selectedTrack) return;
    setSubmitting(true);
    try {
      const c = await postEventComment(event.id, {
        content: commentText.trim(),
        eventTrackId: selectedTrack.id,
        trackTimestamp: 0,
        isAnonymous,
      }, token);
      setComments((prev) => [...prev, c]);
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 pb-28">
      <div className="mb-8">
        <p className="text-xs tracking-widest uppercase text-white/25 mb-2">Session Ended</p>
        <h1 className="text-3xl font-light text-white/90">{event.title}</h1>
        <p className="text-sm text-white/30 mt-1">
          {new Date(event.scheduledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Track list */}
        <div className="md:w-56 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-widest uppercase text-white/25">Tracks</p>
            {approvedTracks.length > 0 && (
              <button
                onClick={() => playTrack(approvedTracks[0])}
                className="flex items-center gap-1 text-white/40 hover:text-white/80 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                <span className="text-xs">Play all</span>
              </button>
            )}
          </div>
          <div className="space-y-2">
            {approvedTracks.map((t) => {
              const isActive = currentTrack?.id === t.trackId && isPlaying;
              return (
                <button key={t.id} onClick={() => selectTrack(t)}
                  className={`w-full flex gap-3 items-center p-2 rounded-lg text-left transition-colors group ${selectedTrack?.id === t.id ? "bg-white/8" : "hover:bg-white/5"}`}>
                  <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5">
                    <Image src={t.coverImageUrl} alt={t.title} fill className="object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); playTrack(t); }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isActive ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                          <rect x="1" y="1" width="3.5" height="10" rx="1"/>
                          <rect x="7.5" y="1" width="3.5" height="10" rx="1"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                          <path d="M2 1.5l9 4.5-9 4.5z"/>
                        </svg>
                      )}
                    </button>
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center group-hover:hidden">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/75 truncate">{t.title}</p>
                    <p className="text-xs text-white/35 truncate">{t.artist}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 min-w-0">
          {selectedTrack && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => playTrack(selectedTrack)}
                  className="relative w-12 h-12 rounded overflow-hidden shrink-0 bg-white/5 group"
                >
                  <Image src={selectedTrack.coverImageUrl} alt={selectedTrack.title} fill className="object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {currentTrack?.id === selectedTrack.trackId && isPlaying ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                        <rect x="1" y="1" width="3.5" height="10" rx="1"/>
                        <rect x="7.5" y="1" width="3.5" height="10" rx="1"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                        <path d="M2 1.5l9 4.5-9 4.5z"/>
                      </svg>
                    )}
                  </div>
                </button>
                <div>
                  <p className="text-sm font-medium text-white/80">{selectedTrack.title}</p>
                  <p className="text-xs text-white/40">{selectedTrack.artist}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50 shrink-0">
                      {c.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white/70 mr-2">{c.displayName}</span>
                      {c.trackTimestamp > 0 && (
                        <button onClick={() => seekTo(c.trackTimestamp)}
                          className="text-xs text-white/35 hover:text-white/70 transition-colors mr-2 font-mono">
                          {fmtTime(c.trackTimestamp)}
                        </button>
                      )}
                      <p className="text-sm text-white/50 mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-sm text-white/25">No comments for this track.</p>}
              </div>

              {user ? (
                <div className="flex gap-3">
                  <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Leave a comment…"
                    className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors" />
                  <label className="flex items-center gap-1.5 text-xs text-white/30 cursor-pointer">
                    <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-white" />
                    Anon
                  </label>
                  <button onClick={handleComment} disabled={submitting || !commentText.trim()}
                    className="bg-white text-black text-sm font-medium px-4 py-2.5 rounded hover:bg-white/90 transition-colors disabled:opacity-40">Post</button>
                </div>
              ) : (
                <p className="text-sm text-white/30"><a href="/login" className="underline">Sign in</a> to comment.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
