"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AudioPlayer() {
  const { currentTrack, isPlaying, isLive, isCountdown, setIsPlaying, playNext, playPrev, queue, audioRef, dismiss } = useAudioPlayer();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      e.preventDefault();
      setIsPlaying(!isPlaying);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, setIsPlaying]);

  // Set audio src only when the track ID changes — never on re-renders
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.src = currentTrack.audioUrl;
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Sync play/pause state (from UI or lock screen) to the audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying, audioRef]);

  // Update Media Session metadata and handlers separately — never resets src
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.albumTitle || undefined,
      artwork: [{ src: currentTrack.coverImageUrl, sizes: "512x512", type: "image/jpeg" }],
    });

    const audio = audioRef.current;
    navigator.mediaSession.setActionHandler("play", () => {
      audio?.play().catch(() => {});
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audio?.pause();
      setIsPlaying(false);
    });

    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    navigator.mediaSession.setActionHandler("previoustrack", idx > 0 && !isLive ? playPrev : null);
    navigator.mediaSession.setActionHandler("nexttrack", idx < queue.length - 1 && !isLive ? playNext : null);
    // Disable seek controls during live — null removes them from Control Center
    navigator.mediaSession.setActionHandler("seekto", isLive ? null : (e) => {
      if (audio && e.seekTime != null) { audio.currentTime = e.seekTime; }
    });
    navigator.mediaSession.setActionHandler("seekforward", isLive ? null : (e) => {
      if (audio) audio.currentTime = Math.min(audio.duration, audio.currentTime + (e.seekOffset ?? 10));
    });
    navigator.mediaSession.setActionHandler("seekbackward", isLive ? null : (e) => {
      if (audio) audio.currentTime = Math.max(0, audio.currentTime - (e.seekOffset ?? 10));
    });
  }, [currentTrack, queue, isLive, playPrev, playNext, setIsPlaying, audioRef]);

  // Keep position state updated for lock screen scrubber
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
    if (!isLive && "mediaSession" in navigator && audio.duration) {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  };

  if (!currentTrack) return null;

  const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < queue.length - 1;

  return (
    <>
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={isLive ? undefined : playNext} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#111]/95 backdrop-blur-md border-t border-white/10 h-20">
        {/* Progress bar — hidden during live */}
        {!isLive && (
          <div className="absolute top-0 left-0 h-0.5 bg-white/10 w-full cursor-pointer" onClick={handleSeek}>
            <div className="h-full bg-white/70 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="max-w-6xl mx-auto px-6 h-full flex items-center gap-4">
          {/* Cover + track info */}
          {isLive && isCountdown ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/20">—</p>
                <p className="text-xs text-white/15">—</p>
              </div>
            </div>
          ) : (
            <Link href={`/tracks/${currentTrack.id}`} className="flex items-center gap-3 min-w-0 flex-1 group">
              <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                <Image src={currentTrack.coverImageUrl} alt={currentTrack.title} fill className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate group-hover:text-white/80 transition-colors">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-white/40 truncate">{currentTrack.artist}</p>
              </div>
            </Link>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {isLive && (
              <div className="flex items-center gap-1.5 mr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400/80 tracking-widest uppercase">Live</span>
              </div>
            )}
            <button onClick={playPrev} disabled={!hasPrev || isLive}
              className="text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors" aria-label="Previous">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>

            <button onClick={() => setIsPlaying(!isPlaying)}
              className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:border-white/50 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button onClick={playNext} disabled={!hasNext || isLive}
              className="text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors" aria-label="Next">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z" />
              </svg>
            </button>
          </div>

          <span className="text-xs text-white/30 shrink-0 hidden sm:block">{currentTrack.duration}</span>

          <button onClick={dismiss} className="text-white/25 hover:text-white/60 transition-colors shrink-0 ml-2" aria-label="Close player">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
