"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { Track } from "@/types";
import Image from "next/image";
import Link from "next/link";

export default function ArtistTracks({ tracks }: { tracks: Track[] }) {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();

  if (tracks.length === 0) return <p className="text-white/25 text-sm">No tracks yet.</p>;

  return (
    <div className="divide-y divide-white/[0.05]">
      {tracks.map((track) => {
        const isActive = currentTrack?.id === track.id;
        const moods = track.mood?.split(",").map((m) => m.trim()).filter(Boolean) ?? [];

        const handlePlay = (e: React.MouseEvent) => {
          e.preventDefault();
          if (isActive) setIsPlaying(!isPlaying);
          else playTrack(track, tracks);
        };

        return (
          <div
            key={track.id}
            className={`flex items-center gap-4 py-3.5 group transition-opacity ${isActive ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
          >
            {/* Cover + play */}
            <div className="relative w-10 h-10 shrink-0 rounded overflow-hidden bg-white/5">
              {track.coverImageUrl && (
                <Image src={track.coverImageUrl} alt={track.title} fill className="object-cover" />
              )}
              <button
                onClick={handlePlay}
                aria-label={isActive && isPlaying ? "Pause" : "Play"}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  {isActive && isPlaying
                    ? <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                    : <path d="M8 5v14l11-7z" />}
                </svg>
              </button>
              {isActive && isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
                  {[9, 5, 12, 7].map((h, i) => (
                    <span key={i} className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: h, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Title + genre */}
            <div className="flex-1 min-w-0">
              <Link href={`/tracks/${track.id}`}>
                <p className={`text-sm truncate transition-colors ${isActive ? "text-white" : "text-white/80 hover:text-white"}`}>
                  {track.title}
                </p>
              </Link>
              {track.genre && <p className="text-xs text-white/30 mt-0.5">{track.genre}</p>}
            </div>

            {/* Mood tags */}
            {moods.length > 0 && (
              <div className="hidden md:flex gap-1.5 shrink-0">
                {moods.slice(0, 2).map((m) => (
                  <span key={m} className="text-[10px] text-white/20 border border-white/8 px-2 py-0.5 rounded-full">
                    {m}
                  </span>
                ))}
              </div>
            )}

            {/* Duration */}
            <span className="text-xs text-white/25 tabular-nums shrink-0">{track.duration}</span>
          </div>
        );
      })}
    </div>
  );
}
