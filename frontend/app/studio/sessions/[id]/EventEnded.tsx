"use client";

// @ts-expect-error — ViewTransition is in React 19 canary, types lag behind
import { ViewTransition } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getEventComments, postEventComment, getEventSummary, regenerateEventSummary } from "@/lib/api";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { LiveEventDetail, EventComment, EventTrack, Track } from "@/types";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={j} className="font-semibold text-white/80">{part.slice(2, -2)}</strong>
        : part
    );
    return <span key={i}>{parts}{i < text.split("\n").length - 1 && <br />}</span>;
  });
}

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

type Mode = "explore" | "relive" | null;

export default function EventEnded({ event }: { event: LiveEventDetail }) {
  const { user, token } = useAuth();
  const { playTrack: globalPlay, currentTrack, isPlaying, setIsPlaying, seekTo, setIsLive, audioRef } = useAudioPlayer();
  const approvedTracks = event.tracks.filter((t) => t.status === "Approved").sort((a, b) => a.order - b.order);

  const [mode, setMode] = useState<Mode>(null);
  const [imageBlurred, setImageBlurred] = useState(false);

  const transitionTo = (next: Mode, startPlayback?: () => void) => {
    setImageBlurred(next === "explore" || next === "relive");
    if (startPlayback) startPlayback();
    setMode(next);
  };
  const [selectedTrack, setSelectedTrack] = useState<EventTrack | null>(approvedTracks[0] ?? null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loadedTrackId, setLoadedTrackId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [summary, setSummary] = useState<string | null>(null);
  const [hasNewComments, setHasNewComments] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [summaryReadMore, setSummaryReadMore] = useState(false);
  const [summaryReadMoreSettled, setSummaryReadMoreSettled] = useState(true);

  const [playbackTime, setPlaybackTime] = useState(0);
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const commentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const commentsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getEventSummary(event.id)
      .then((s) => { setSummary(s.summary); setHasNewComments(s.hasNewComments); })
      .catch(() => {});
  }, [event.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setPlaybackTime(audio.currentTime);
    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [audioRef]);

  useEffect(() => {
    if (!isPlaying || !selectedTrack || currentTrack?.id !== selectedTrack.trackId) return;
    const timed = comments.filter((c) => c.trackTimestamp > 0).sort((a, b) => a.trackTimestamp - b.trackTimestamp);
    if (!timed.length) return;
    let active: EventComment | null = null;
    for (const c of timed) {
      if (c.trackTimestamp <= playbackTime + 1) active = c;
      else break;
    }
    if (active && active.id !== activeCommentId) {
      setActiveCommentId(active.id);
      const el = commentRefs.current[active.id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [playbackTime, comments, isPlaying, selectedTrack, currentTrack, activeCommentId]);

  useEffect(() => { setActiveCommentId(null); }, [selectedTrack?.id, currentTrack?.id]);



  const handleRegenerate = async () => {
    if (!token) return;
    setRegenerating(true);
    try {
      const s = await regenerateEventSummary(event.id, token);
      setSummary(s.summary);
      setHasNewComments(false);
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (!selectedTrack || loadedTrackId === selectedTrack.id) return;
    let cancelled = false;
    const id = selectedTrack.id;
    setComments([]);
    getEventComments(event.id, id).then((c) => {
      if (cancelled) return;
      setComments(c);
      setLoadedTrackId(id);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [event.id, selectedTrack, loadedTrackId]);

  const playTrack = (track: EventTrack) => {
    setIsLive(false);
    if (currentTrack?.id === track.trackId) setIsPlaying(!isPlaying);
    else globalPlay(toTrack(track), approvedTracks.map(toTrack));
  };

  const seekAndPlay = (track: EventTrack, timestamp: number) => {
    const audio = audioRef.current;
    if (currentTrack?.id === track.trackId) {
      seekTo(timestamp);
    } else {
      setIsLive(false);
      globalPlay(toTrack(track), approvedTracks.map(toTrack));
      const onReady = () => { if (audio) audio.currentTime = timestamp; audio?.removeEventListener("canplay", onReady); };
      audio?.addEventListener("canplay", onReady);
    }
  };

  const handleComment = async () => {
    if (!token || !commentText.trim() || !selectedTrack) return;
    setSubmitting(true);
    try {
      const c = await postEventComment(event.id, { content: commentText.trim(), eventTrackId: selectedTrack.id, trackTimestamp: 0, isAnonymous }, token);
      setComments((prev) => [...prev, c]);
      setCommentText("");
    } finally { setSubmitting(false); }
  };

  const totalSeconds = approvedTracks.reduce((acc, t) => {
    if (!t.duration) return acc;
    const p = t.duration.split(":").map(Number);
    if (p.length === 2) return acc + p[0] * 60 + p[1];
    if (p.length === 3) return acc + p[0] * 3600 + p[1] * 60 + p[2];
    return acc;
  }, 0);
  const durationLabel = totalSeconds >= 3600
    ? `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`
    : `${Math.floor(totalSeconds / 60)} min`;

  const coverUrl = event.coverImageUrl || approvedTracks[0]?.coverImageUrl;

  // ── Shared background image ──────────────────────────────────────────────
  const bgImage = (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div className={`absolute inset-0 duration-500 ${imageBlurred ? "blur-sm" : ""}`} style={{ transition: "filter 500ms ease, transform 500ms ease", transform: imageBlurred ? "scale(1.02)" : "scale(1)", willChange: "filter, transform" }}>
        {coverUrl ? (
          <Image src={coverUrl} alt="" fill className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-[#0a0a0a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
        <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${imageBlurred ? "opacity-60" : "opacity-0"}`} style={{ background: imageBlurred ? "linear-gradient(to top, black 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.55) 100%)" : undefined }} />
      </div>
    </div>
  );

  const isTrackPlaying = selectedTrack && currentTrack?.id === selectedTrack.trackId && isPlaying;
  const allComments = [...comments].sort((a, b) => a.trackTimestamp - b.trackTimestamp);
  const artists = [...new Set(approvedTracks.map(t => t.artist).filter(Boolean))];

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {bgImage}
      <div className="relative min-h-[calc(100vh-4rem)] flex flex-col pt-12 pb-28" style={{ zIndex: 1 }}>

        {/* ── Persistent header ── */}
        <div
          className="max-w-6xl mx-auto px-6 w-full mb-7"
        >
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/35 mb-3">
            {mode === null ? `Hosted by ${event.hostDisplayName}` : (
              <button onClick={() => transitionTo(null)} className="hover:text-white/65 transition-colors" style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}>← Back</button>
            )}
          </p>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* @ts-expect-error — ViewTransition is in React 19 canary */}
            <ViewTransition name={`session-title-${event.id}`}>
              <h1
                onClick={mode !== null ? () => transitionTo(null) : undefined}
                className={`text-3xl md:text-4xl font-semibold tracking-widest uppercase text-white leading-tight transition-colors ${mode !== null ? "cursor-pointer hover:text-white/75" : ""}`}
              >{event.title}</h1>
            </ViewTransition>
            {(mode === null || mode === "relive") && (
              <div className="flex gap-2 items-center">
                <button onClick={() => transitionTo("explore")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/15 hover:border-white/30 backdrop-blur-sm transition-all">
                  <svg className="w-4 h-4 text-white/55" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-sm font-semibold tracking-widest uppercase text-white/72">Explore</span>
                </button>
                {mode === null && (
                  <button onClick={() => transitionTo("relive", () => { if (approvedTracks.length > 0) playTrack(approvedTracks[0]); })}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/15 hover:border-white/30 backdrop-blur-sm transition-all">
                    <svg className="w-4 h-4 text-white/55" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    <span className="text-sm font-semibold tracking-widest uppercase text-white/72">Play</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-white/38 flex-wrap">
            {artists.length > 0 && (
              <>
                <span className="text-white/60">{artists.slice(0, 3).join(", ")}{artists.length > 3 ? ` +${artists.length - 3}` : ""}</span>
                <span className="text-white/18">·</span>
              </>
            )}
            <span>{new Date(event.scheduledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            {approvedTracks.length > 0 && (
              <>
                <span className="text-white/18">·</span>
                <span>{approvedTracks.length} tracks</span>
                <span className="text-white/18">·</span>
                <span>{durationLabel}</span>
              </>
            )}
          </div>
        </div>

        {/* ── Mode body (fades on switch) ── */}
        <div key={mode} className="max-w-6xl mx-auto px-6 w-full" style={{ animation: "listReveal 0.4s ease forwards" }}>

          {/* Landing */}
          {mode === null && (
            <div className="space-y-32">
              {/* Description */}
              {event.description && (
                <p className="text-sm text-white/58 leading-relaxed">{event.description}</p>
              )}

              {/* AI recap */}
              {(summary || regenerating || (!summary && !regenerating && user)) && (
                <div>
                  <p className="text-[11px] tracking-widest uppercase text-white/30 mb-3 flex items-center gap-2">
                    Session recap
                    {hasNewComments && <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 text-white/40 normal-case tracking-normal">New comments</span>}
                  </p>
                  {regenerating ? (
                    <p className="text-sm text-white/35 animate-pulse">Writing recap…</p>
                  ) : summary ? (
                    <>
                      <div className="relative overflow-hidden" style={{
                        maxHeight: summaryReadMore ? "30em" : "6em",
                        transition: "max-height 0.5s cubic-bezier(0.4,0,0.2,1)",
                        maskImage: (!summaryReadMore && summaryReadMoreSettled) ? "linear-gradient(to bottom, black 55%, transparent 100%)" : "none",
                        WebkitMaskImage: (!summaryReadMore && summaryReadMoreSettled) ? "linear-gradient(to bottom, black 55%, transparent 100%)" : "none",
                      }}>
                        <p className="text-sm text-white/58 leading-relaxed">{renderMarkdown(summary)}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => { setSummaryReadMoreSettled(false); setSummaryReadMore(v => !v); setTimeout(() => setSummaryReadMoreSettled(true), 400); }}
                          className="text-xs text-white/35 hover:text-white/65 transition-colors">
                          <span key={String(summaryReadMore)} style={{ animation: "listReveal 0.4s cubic-bezier(0.4,0,0.2,1) forwards", display: "inline-block" }}>
                            {summaryReadMore ? "Show less" : "Read more"}
                          </span>
                        </button>
                        {user && <button onClick={handleRegenerate} className="text-xs text-white/28 hover:text-white/55 transition-colors ml-auto">↻ Regenerate</button>}
                      </div>
                    </>
                  ) : (
                    <button onClick={handleRegenerate} className="text-xs text-white/35 hover:text-white/65 border border-white/12 hover:border-white/25 px-3 py-1.5 rounded-lg transition-colors">
                      Generate recap
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Explore */}
          {mode === "explore" && (
            <div className="flex flex-col md:flex-row gap-20 items-start">
              <div className="md:w-52 shrink-0 space-y-0.5">
                {approvedTracks.map((t) => {
                  const active = currentTrack?.id === t.trackId && isPlaying;
                  const selected = selectedTrack?.id === t.id;
                  return (
                    <button key={t.id} onClick={() => setSelectedTrack(t)}
                      className={`w-full flex gap-2.5 items-center p-2 rounded-lg text-left transition-colors group ${selected ? "bg-white/12" : "hover:bg-white/6"}`}>
                      <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0 bg-white/5">
                        <Image src={t.coverImageUrl} alt={t.title} fill className="object-cover" />
                        <div role="button" onClick={(e) => { e.stopPropagation(); playTrack(t); }}
                          className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          {active ? (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="white"><rect x="1" y="1" width="3.5" height="10" rx="1"/><rect x="7.5" y="1" width="3.5" height="10" rx="1"/></svg>
                          ) : (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="white"><path d="M2 1.5l9 4.5-9 4.5z"/></svg>
                          )}
                        </div>
                        {active && <div className="absolute inset-0 flex items-center justify-center group-hover:hidden"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs truncate ${selected ? "text-white/90" : "text-white/55"}`}>{t.title}</p>
                        <p className="text-[11px] text-white/28 truncate">{t.artist}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 min-w-0" style={{ minHeight: "12rem" }}>
                <div className="space-y-0 mb-6">
                  {allComments.length === 0 && <p className="text-sm text-white/20" style={{ animation: "listReveal 0.4s ease both" }}>No comments for this track yet.</p>}
                  {allComments.map((c, i) => {
                    const isActive = c.id === activeCommentId;
                    return (
                      <div key={c.id} ref={(el) => { commentRefs.current[c.id] = el; }}
                        onClick={c.trackTimestamp > 0 ? () => selectedTrack && seekAndPlay(selectedTrack, c.trackTimestamp) : undefined}
                        className={`px-3 py-1 rounded-xl ${isActive ? "bg-white/10 scale-[1.01]" : "hover:bg-white/[0.04]"} ${c.trackTimestamp > 0 ? "cursor-pointer" : ""}`}
                        style={{ transition: "background-color 500ms ease, transform 500ms ease", animation: "listReveal 0.4s ease both", animationDelay: `${i * 0.07}s` }}>
                        <p className={`text-sm leading-relaxed transition-all duration-500 ${isActive ? "text-white/90" : "text-white/55"}`}>{c.content}</p>
                        <div className="flex items-center gap-1.5 mt-0">
                          {c.trackTimestamp > 0 && (
                            <span className={`text-[11px] font-mono leading-none transition-all ${isActive ? "text-white/45" : "text-white/25"}`}>
                              {fmtTime(c.trackTimestamp)}
                            </span>
                          )}
                          {c.trackTimestamp > 0 && <span className={`text-[11px] leading-none ${isActive ? "text-white/30" : "text-white/15"}`}>·</span>}
                          <p className={`text-[11px] leading-none transition-colors ${isActive ? "text-white/45" : "text-white/25"}`}>{c.displayName}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {user ? (
                  <div className="flex gap-2.5">
                    <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
                      placeholder="Leave a comment…"
                      className="flex-1 bg-white/8 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/75 placeholder:text-white/22 focus:outline-none focus:border-white/25 transition-colors" />
                    <label className="flex items-center gap-1.5 text-xs text-white/25 cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-white" />
                      Anon
                    </label>
                    <button onClick={handleComment} disabled={submitting || !commentText.trim()}
                      className="bg-white text-black text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-40">Post</button>
                  </div>
                ) : (
                  <p className="text-sm text-white/25"><a href="/login" className="underline hover:text-white/50 transition-colors">Sign in</a> to comment.</p>
                )}
              </div>
            </div>
          )}

          {/* Relive */}
          {mode === "relive" && (
            <div className="space-y-1.5">
              {approvedTracks.map((t, i) => {
                const isActive = currentTrack?.id === t.trackId;
                const playing = isActive && isPlaying;
                return (
                  <button key={t.id} onClick={() => playTrack(t)}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all group ${isActive ? "bg-white/12 ring-1 ring-white/15" : "hover:bg-white/8"}`}>
                    <span className="text-xs text-white/22 w-5 text-right shrink-0 font-mono">{i + 1}</span>
                    <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0 bg-white/5">
                      <Image src={t.coverImageUrl} alt={t.title} fill className="object-cover" />
                      <div className={`absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        {playing ? (
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="white"><rect x="1" y="1" width="3.5" height="10" rx="1"/><rect x="7.5" y="1" width="3.5" height="10" rx="1"/></svg>
                        ) : (
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="white"><path d="M2 1.5l9 4.5-9 4.5z"/></svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isActive ? "text-white/92" : "text-white/68"}`}>{t.title}</p>
                      <p className="text-xs text-white/32 truncate">{t.artist}{t.genre ? <span className="text-white/18"> · {t.genre}</span> : ""}</p>
                    </div>
                    {t.duration && <span className="text-xs text-white/22 font-mono shrink-0">{t.duration}</span>}
                  </button>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
