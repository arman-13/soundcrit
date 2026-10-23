export const dynamic = "force-dynamic";

import { getAlbums } from "@/lib/api";
import BackButton from "@/components/BackButton";
import AlbumCard from "@/components/AlbumCard";

export default async function AlbumsPage() {
  const albums = await getAlbums();

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <BackButton />
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase text-white/30">Albums</p>
      </div>

      {albums.length === 0 ? (
        <p className="text-sm text-white/25">No albums yet.</p>
      ) : (
        <div className="flex flex-wrap gap-6">
          {albums.map((album) => (
            <div key={album.id} className="w-36">
              <AlbumCard album={album} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
