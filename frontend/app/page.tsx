export const dynamic = "force-dynamic";

import { getAlbums, getChartedTracks, getTracks } from "@/lib/api";
import TrackCard from "@/components/TrackCard";
import ChartedRow from "@/components/ChartedRow";
import Image from "next/image";
import Link from "next/link";

export default async function HomePage() {
  const [tracksRes, albums, charted] = await Promise.all([
    getTracks(1, 6),
    getAlbums(),
    getChartedTracks(),
  ]);

  const tracks = tracksRes.data;
  const top5 = charted.slice(0, 5);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[60vh] flex flex-col justify-end px-6 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/40 to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 to-transparent" />
        <div className="relative max-w-6xl mx-auto w-full">
          <p className="text-xs tracking-widest uppercase text-white/30 mb-4">Collective</p>
          <h1 className="text-6xl md:text-8xl font-light tracking-tight text-white/95 leading-none mb-4">
            Music for the late hours.
          </h1>
          <p className="text-lg text-white/40 max-w-md">
            Independent. Uncompromised. Press play.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-32 space-y-24">

        {/* New Releases */}
        <section>
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-xs tracking-widest uppercase text-white/30">New Releases</h2>
            <Link href="/music" className="text-xs text-white/35 hover:text-white/70 transition-colors">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} queue={tracks} />
            ))}
          </div>
        </section>

        {/* Albums */}
        {albums.length > 0 && (
          <section>
            <h2 className="text-xs tracking-widest uppercase text-white/30 mb-8">Albums</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {albums.map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`} className="group">
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
          </section>
        )}

        {/* Charted */}
        {top5.length > 0 && (
          <section>
            <h2 className="text-xs tracking-widest uppercase text-white/30 mb-8">Charted</h2>
            <ChartedList tracks={top5} />
          </section>
        )}

      </div>
    </div>
  );
}

// Server-renderable wrapper — actual play interaction is in the client component
function ChartedList({ tracks }: { tracks: Awaited<ReturnType<typeof getChartedTracks>> }) {
  return (
    <div className="space-y-1">
      {tracks.map((track, i) => (
        <ChartedRow key={track.id} track={track} rank={i + 1} queue={tracks} />
      ))}
    </div>
  );
}
