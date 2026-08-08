export const dynamic = "force-dynamic";

import { getAlbums } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import BackButton from "@/components/BackButton";

export default async function AlbumsPage() {
  const albums = await getAlbums();

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <BackButton />
      <div className="mb-16">
        <p className="text-xs tracking-widest uppercase text-white/30 mb-4">Catalog</p>
        <h1 className="text-4xl font-light text-white/90">Albums</h1>
      </div>

      {albums.length === 0 ? (
        <p className="text-sm text-white/25">No albums yet.</p>
      ) : (
        <div className="flex flex-wrap gap-6">
          {albums.map((album) => (
            <Link key={album.id} href={`/albums/${album.id}`} className="group w-36">
              <div className="relative aspect-square rounded overflow-hidden mb-3 bg-white/5">
                <Image
                  src={album.coverImageUrl}
                  alt={album.title}
                  fill
                  className="object-cover opacity-75 group-hover:opacity-95 transition-opacity"
                />
              </div>
              <h3 className="text-sm font-medium text-white/75 group-hover:text-white transition-colors truncate">
                {album.title}
              </h3>
              <p className="text-xs text-white/30 mt-0.5">
                {new Date(album.releasedAt).getFullYear()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
