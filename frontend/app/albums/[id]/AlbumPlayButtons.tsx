"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { AlbumTrackDto, Track } from "@/types";

function toTrack(t: AlbumTrackDto): Track {
  return { id: t.trackId, title: t.title, artist: t.artist, duration: t.duration, coverImageUrl: t.coverImageUrl, audioUrl: t.audioUrl, mood: t.mood, playCount: t.playCount, albumTitle: "", genre: "", publishedAt: "", isPublished: true, isFeatured: false };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export default function AlbumPlayButtons({ tracks }: { tracks: AlbumTrackDto[] }) {
  const { playTrack } = useAudioPlayer();
  const queue = tracks.map(toTrack);

  return (
    <div className="flex gap-3">
      <button
        onClick={() => queue.length > 0 && playTrack(queue[0], queue)}
        className="flex items-center gap-2 bg-white text-black text-sm font-medium px-5 py-2 rounded-full hover:bg-white/90 transition-colors"
      >
        <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        Play
      </button>
      <button
        onClick={() => { const s = shuffle(queue); s.length > 0 && playTrack(s[0], s); }}
        className="flex items-center gap-2 border border-white/20 text-white/60 text-sm px-5 py-2 rounded-full hover:border-white/40 hover:text-white/80 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
          <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
        </svg>
        Shuffle
      </button>
    </div>
  );
}
