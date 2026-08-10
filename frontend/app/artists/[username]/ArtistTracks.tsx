"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { Track } from "@/types";
import Image from "next/image";
import Link from "next/link";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ArtistTracks({ tracks }: { tracks: Track[] }) {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();

  if (tracks.length === 0) return <p className="text-white/25 text-sm">No tracks yet.</p>;

  const handlePlayAll = () => {
    const first = tracks[0];
    const isActive = currentTrack?.id === first.id;
    if (isActive) setIsPlaying(!isPlaying);
    else playTrack(first, tracks);
  };

  const handleShuffle = () => {
    const shuffled = shuffle(tracks);
    playTrack(shuffled[0], shuffled);
  };

  return (
    <div>
      {/* Play / Shuffle buttons */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={handlePlayAll}
          className="flex items-center gap-2 bg-white text-black text-sm font-medium px-5 py-2 rounded-full hover:bg-white/90 transition-colors"
        >
          <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play
        </button>
        <button
          onClick={handleShuffle}
          className="flex items-center gap-2 border border-white/15 text-white/60 text-sm px-5 py-2 rounded-full hover:border-white/35 hover:text-white/90 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20l16-16M16 21h5v-5M4 4l7 7" />
          </svg>
          Shuffle
        </button>
      </div>

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

              <div className="flex-1 min-w-0">
                <Link href={`/tracks/${track.id}`}>
                  <p className={`text-sm truncate transition-colors ${isActive ? "text-white" : "text-white/80 hover:text-white"}`}>
                    {track.title}
                  </p>
                </Link>
                {track.genre && <p className="text-xs text-white/30 mt-0.5">{track.genre}</p>}
              </div>

              {moods.length > 0 && (
                <div className="hidden md:flex gap-1.5 shrink-0">
                  {moods.slice(0, 2).map((m) => (
                    <span key={m} className="text-[10px] text-white/20 border border-white/8 px-2 py-0.5 rounded-full">
                      {m}
                    </span>
                  ))}
                </div>
              )}

              <span className="text-xs text-white/25 tabular-nums shrink-0">{track.duration}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
