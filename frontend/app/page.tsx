export const dynamic = "force-dynamic";

import { getAlbums, getChartedTracks, getTracks } from "@/lib/api";
import TrackCard from "@/components/TrackCard";
import ChartedRow from "@/components/ChartedRow";
import ScrollButton from "./ScrollButton";
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
      <section className="flex flex-col items-center justify-center text-center px-6 pt-28 pb-24">
        {/* Section 1 — Statement */}
        <h1 className="text-4xl md:text-6xl font-light tracking-tight text-white/90 leading-tight mb-6">
          Music with a story.
        </h1>
        <p className="text-base text-white/40 leading-relaxed mb-16" style={{ maxWidth: 540 }}>
          A space where every track comes with the story behind it —
          and where listening is never a solo experience.
        </p>

        {/* Section 2 — Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-12" style={{ maxWidth: 640 }}>
          <div className="border border-white/8 rounded-xl px-6 py-7 text-left bg-white/[0.02]">
            <p className="text-xs tracking-widest uppercase text-white/25 mb-3">Story Mode</p>
            <p className="text-sm text-white/45 leading-relaxed">
              Every track has its own page. Images, words, and moments
              that appear in sync with the music as it plays.
            </p>
          </div>
          <div className="border border-white/8 rounded-xl px-6 py-7 text-left bg-white/[0.02]">
            <p className="text-xs tracking-widest uppercase text-white/25 mb-3">Live Sessions</p>
            <p className="text-sm text-white/45 leading-relaxed">
              Listen together in real time. Leave reactions tied to exact
              moments in a track. Every session is saved as a record.
            </p>
          </div>
        </div>

        <ScrollButton targetId="new-releases" />
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-32 space-y-24">

        {/* New Releases */}
        <section id="new-releases">
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
