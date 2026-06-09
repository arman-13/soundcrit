"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { Track } from "@/types";
import Image from "next/image";
import Link from "next/link";

interface Props {
  track: Track;
  rank: number;
  queue: Track[];
}

export default function ChartedRow({ track, rank, queue }: Props) {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const isActive = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isActive) setIsPlaying(!isPlaying);
    else playTrack(track, queue);
  };

  return (
    <div className={`group flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-white/8" : "hover:bg-white/5"}`}>
      <span className="w-5 text-center text-sm font-light text-white/25 shrink-0">{rank}</span>

      <button onClick={handlePlay} className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5">
        <Image src={track.coverImageUrl} alt={track.title} fill className="object-cover opacity-70" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          {isActive && isPlaying ? (
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <Link href={`/tracks/${track.id}`}>
          <p className={`text-sm font-medium truncate transition-colors ${isActive ? "text-white" : "text-white/70 hover:text-white"}`}>
            {track.title}
          </p>
        </Link>
        <p className="text-xs text-white/30 truncate">{track.artist}</p>
      </div>

      {track.mood && (
        <span className="text-[10px] text-white/20 border border-white/8 px-2 py-0.5 rounded-full hidden md:block truncate max-w-[120px]">
          {track.mood.split(",")[0].trim()}
        </span>
      )}

      <span className="text-xs text-white/20 shrink-0 tabular-nums">
        {track.playCount.toLocaleString()} plays
      </span>
    </div>
  );
}
