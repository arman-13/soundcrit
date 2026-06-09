"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { Track } from "@/types";
import Image from "next/image";
import Link from "next/link";

interface Props {
  track: Track;
  queue?: Track[];
}

export default function TrackCard({ track, queue }: Props) {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const isActive = currentTrack?.id === track.id;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActive) {
      setIsPlaying(!isPlaying);
    } else {
      playTrack(track, queue);
    }
  };

  const moods = track.mood?.split(",").map((m) => m.trim()).filter(Boolean) ?? [];

  return (
    <div className={`group relative rounded-lg overflow-hidden bg-white/[0.03] border transition-colors ${isActive ? "border-white/20" : "border-white/5 hover:border-white/15"}`}>
      {/* Cover */}
      <Link href={`/tracks/${track.id}`} className="block relative aspect-square">
        <Image
          src={track.coverImageUrl}
          alt={track.title}
          fill
          className={`object-cover transition-opacity ${isActive ? "opacity-90" : "opacity-60 group-hover:opacity-80"}`}
        />
        {/* Play overlay */}
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30"
          aria-label={isActive && isPlaying ? "Pause" : "Play"}
        >
          <div className="w-12 h-12 rounded-full border border-white/50 bg-black/50 flex items-center justify-center">
            {isActive && isPlaying ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>
        {/* Now playing bars */}
        {isActive && isPlaying && (
          <div className="absolute bottom-2 left-2 flex gap-0.5 items-end pointer-events-none">
            {[12, 7, 14, 9].map((h, i) => (
              <span key={i} className="w-1 bg-white rounded-full animate-pulse" style={{ height: h, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}
      </Link>
      {/* Info */}
      <div className="p-3">
        <Link href={`/tracks/${track.id}`}>
          <h3 className={`text-sm font-medium leading-snug truncate transition-colors ${isActive ? "text-white" : "text-white/75 hover:text-white"}`}>
            {track.title}
          </h3>
        </Link>
        <p className="text-xs text-white/35 truncate mt-0.5">{track.artist}</p>
        {moods.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {moods.slice(0, 2).map((m) => (
              <span key={m} className="text-[10px] text-white/25 border border-white/8 px-1.5 py-0.5 rounded-full">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
