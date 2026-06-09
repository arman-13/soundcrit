"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { AlbumTrackDto, AlbumWithTracks, Track } from "@/types";
import Image from "next/image";
import Link from "next/link";

function albumTrackToTrack(t: AlbumTrackDto): Track {
  return {
    id: t.trackId,
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    coverImageUrl: t.coverImageUrl,
    audioUrl: t.audioUrl,
    mood: t.mood,
    playCount: t.playCount,
    albumTitle: "",
    genre: "",
    publishedAt: "",
    isPublished: true,
    isFeatured: false,
  };
}

export default function AlbumTrackList({ album }: { album: AlbumWithTracks }) {
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();
  const queue = album.tracks.map(albumTrackToTrack);

  const handlePlay = (t: AlbumTrackDto) => {
    const track = albumTrackToTrack(t);
    if (currentTrack?.id === track.id) setIsPlaying(!isPlaying);
    else playTrack(track, queue);
  };

  return (
    <div className="space-y-1">
      {album.tracks.map((t) => {
        const isActive = currentTrack?.id === t.trackId;
        return (
          <div
            key={t.trackId}
            className={`group flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-white/8" : "hover:bg-white/5"}`}
          >
            <span className="w-5 text-center text-xs text-white/25 shrink-0">{t.trackNumber}</span>

            <button onClick={() => handlePlay(t)} className="relative w-9 h-9 rounded overflow-hidden shrink-0 bg-white/5">
              <Image src={t.coverImageUrl} alt={t.title} fill className="object-cover opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                {isActive && isPlaying ? (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <Link href={`/tracks/${t.trackId}`}>
                <p className={`text-sm font-medium truncate transition-colors ${isActive ? "text-white" : "text-white/70 hover:text-white"}`}>
                  {t.title}
                </p>
              </Link>
              <p className="text-xs text-white/30">{t.artist}</p>
            </div>

            {t.mood && (
              <span className="text-[10px] text-white/20 border border-white/8 px-2 py-0.5 rounded-full hidden md:block">
                {t.mood.split(",")[0].trim()}
              </span>
            )}
            <span className="text-xs text-white/25 shrink-0 tabular-nums">{t.duration}</span>
          </div>
        );
      })}
    </div>
  );
}
