"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { Track } from "@/types";

export default function TrackDetailPlayer({ track }: { track: Track }) {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const isActive = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isActive) setIsPlaying(!isPlaying);
    else playTrack(track, [track]);
  };

  return (
    <button
      onClick={handlePlay}
      className="flex items-center gap-3 bg-white text-black px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white/90 transition-colors w-fit"
    >
      {isActive && isPlaying ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
          </svg>
          Pause
        </>
      ) : (
        <>
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play
        </>
      )}
    </button>
  );
}
