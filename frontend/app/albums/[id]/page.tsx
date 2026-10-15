export const dynamic = "force-dynamic";

import { getAlbum } from "@/lib/api";
import AlbumTrackList from "./AlbumTrackList";
import AlbumComments from "./AlbumComments";
import { notFound } from "next/navigation";
import Image from "next/image";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let album;
  try {
    album = await getAlbum(Number(id));
  } catch {
    notFound();
  }

  // Compute total duration from track durations (format: "m:ss" or "h:mm:ss")
  const totalSeconds = album.tracks.reduce((sum, t) => {
    if (!t.duration) return sum;
    const parts = t.duration.split(":").map(Number);
    if (parts.length === 2) return sum + parts[0] * 60 + parts[1];
    if (parts.length === 3) return sum + parts[0] * 3600 + parts[1] * 60 + parts[2];
    return sum;
  }, 0);
  const totalMins = Math.floor(totalSeconds / 60);
  const totalLength = totalMins >= 60
    ? `${Math.floor(totalMins / 60)} hr ${totalMins % 60} min`
    : `${totalMins} min`;

  const artist = album.tracks[0]?.artist ?? "";

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-16">
        <div className="relative w-full md:w-56 aspect-square rounded-lg overflow-hidden bg-white/5 shrink-0">
          <Image src={album.coverImageUrl} alt={album.title} fill className="object-cover" priority />
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-xs tracking-widest uppercase text-white/25 mb-3">Album</p>
          <h1 className="text-3xl md:text-4xl font-light text-white/90 leading-tight mb-2">{album.title}</h1>
          {artist && <p className="text-sm text-white/60 mb-3">{artist}</p>}
          <p className="text-sm text-white/30 mb-4">
            {new Date(album.releasedAt).getFullYear()}
            {" · "}
            {album.tracks.length} {album.tracks.length === 1 ? "track" : "tracks"}
            {totalSeconds > 0 && ` · ${totalLength}`}
          </p>
          {album.description && (
            <p className="text-sm text-white/45 leading-relaxed">{album.description}</p>
          )}
        </div>
      </div>

      {/* Track list */}
      <AlbumTrackList album={album} />

      <AlbumComments albumId={album.id} />
    </div>
  );
}
