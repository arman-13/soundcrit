export const dynamic = "force-dynamic";

import { getAlbum } from "@/lib/api";
import AlbumTrackList from "./AlbumTrackList";
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

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-16">
        <div className="relative w-full md:w-56 aspect-square rounded-lg overflow-hidden bg-white/5 shrink-0">
          <Image src={album.coverImageUrl} alt={album.title} fill className="object-cover" priority />
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-xs tracking-widest uppercase text-white/25 mb-3">Album</p>
          <h1 className="text-3xl md:text-4xl font-light text-white/90 leading-tight mb-3">{album.title}</h1>
          <p className="text-sm text-white/35 mb-4">{new Date(album.releasedAt).getFullYear()} · {album.tracks.length} tracks</p>
          {album.description && (
            <p className="text-sm text-white/45 leading-relaxed">{album.description}</p>
          )}
        </div>
      </div>

      {/* Track list */}
      <AlbumTrackList album={album} />
    </div>
  );
}
