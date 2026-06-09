"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function AudioPlayer() {
  const { currentTrack, isPlaying, setIsPlaying, playNext, playPrev, queue } = useAudioPlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.src = currentTrack.audioUrl;
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [currentTrack, setIsPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  };

  const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < queue.length - 1;

  if (!currentTrack) return null;

  return (
    <>
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={playNext} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#111]/95 backdrop-blur-md border-t border-white/10 h-20">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 h-0.5 bg-white/10 cursor-pointer w-full" onClick={handleSeek}>
          <div className="h-full bg-white/70 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="max-w-6xl mx-auto px-6 h-full flex items-center gap-4">
          {/* Cover + track info */}
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

          {/* Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={playPrev}
              disabled={!hasPrev}
              className="text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
              aria-label="Previous"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:border-white/50 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
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

            <button
              onClick={playNext}
              disabled={!hasNext}
              className="text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
              aria-label="Next"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z" />
              </svg>
            </button>
          </div>

          <span className="text-xs text-white/30 shrink-0 hidden sm:block">{currentTrack.duration}</span>
        </div>
      </div>
    </>
  );
}
