export const dynamic = "force-dynamic";

import { getAlbums, getChartedTracks, getTracks, getEvents } from "@/lib/api";
import TrackCard from "@/components/TrackCard";
import ChartedRow from "@/components/ChartedRow";
import ScrollButton from "./ScrollButton";
import Image from "next/image";
import Link from "next/link";

export default async function HomePage() {
  const [tracksRes, albums, charted, events] = await Promise.all([
    getTracks(1, 6),
    getAlbums(),
    getChartedTracks(),
    getEvents(),
  ]);
  const upcomingEvents = events.filter((e) => e.status === "Upcoming").slice(0, 4);
  const liveEvents = events.filter((e) => e.status === "Live");

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

        {/* Events */}
        {(liveEvents.length > 0 || upcomingEvents.length > 0) && (
          <section>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-xs tracking-widest uppercase text-white/30">Sessions</h2>
              <Link href="/events" className="text-xs text-white/35 hover:text-white/70 transition-colors">
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...liveEvents, ...upcomingEvents].map((ev) => (
                <Link key={ev.id} href={`/events/${ev.id}`} className="group relative rounded-xl overflow-hidden border border-white/8 bg-white/[0.02] hover:border-white/20 transition-colors">
                  {ev.coverImageUrl && (
                    <div className="relative w-full aspect-video">
                      <Image src={ev.coverImageUrl} alt={ev.title} fill className="object-cover opacity-50 group-hover:opacity-65 transition-opacity" />
                    </div>
                  )}
                  <div className={`px-4 py-4 ${!ev.coverImageUrl ? "pt-6" : ""}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {ev.status === "Live" ? (
                        <span className="flex items-center gap-1.5 text-xs text-red-400/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Live
                        </span>
                      ) : (
                        <span className="text-xs text-white/30">Upcoming</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">{ev.title}</p>
                    <p className="text-xs text-white/30 mt-1">
                      {new Date(ev.scheduledAt.endsWith("Z") ? ev.scheduledAt : ev.scheduledAt + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

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
