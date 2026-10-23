"use client";

import { getAlbumTracks } from "@/lib/api";
import { Album } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

interface Props {
  album: Album;
}

export default function AlbumCard({ album }: Props) {
  const { playTrack } = useAudioPlayer();
  const [loading, setLoading] = useState(false);

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await getAlbumTracks(album.id);
      const tracks = res.data;
      if (tracks.length > 0) playTrack(tracks[0], tracks);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group w-full">
      <Link href={`/albums/${album.id}`} className="block relative aspect-square rounded overflow-hidden mb-3 bg-white/5">
        {album.coverImageUrl && (
          <Image
            src={album.coverImageUrl}
            alt={album.title}
            fill
            className="object-cover opacity-75 group-hover:opacity-95 transition-opacity"
          />
        )}
        <button
          onClick={handlePlay}
          aria-label="Play album"
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"
        >
          <div className="w-12 h-12 rounded-full border border-white/50 bg-black/50 flex items-center justify-center">
            {loading ? (
              <svg className="w-4 h-4 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>
      </Link>
      <Link href={`/albums/${album.id}`}>
        <p className="text-sm font-medium text-white/75 group-hover:text-white transition-colors truncate">
          {album.title}
        </p>
      </Link>
      <p className="text-xs text-white/30 mt-0.5">
        {new Date(album.releasedAt).getFullYear()}
        {album.trackCount != null ? ` · ${album.trackCount} tracks` : ""}
      </p>
    </div>
  );
}
