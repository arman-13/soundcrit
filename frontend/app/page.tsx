export const dynamic = "force-dynamic";

import { getAlbums, getChartedTracks, getTracks, getEvents } from "@/lib/api";
import TrackCard from "@/components/TrackCard";
import ChartedRow from "@/components/ChartedRow";
import AutoRefresh from "@/components/AutoRefresh";
import CyclingSubtitle from "@/components/CyclingSubtitle";
import AlbumCard from "@/components/AlbumCard";
import EventCardCover from "@/components/EventCardCover";
import EventTimeLabel from "@/components/EventTimeLabel";
import Image from "next/image";
import Link from "next/link";

export default async function HomePage() {
  const [tracksRes, albums, charted, events] = await Promise.all([
    getTracks(1, 6),
    getAlbums(),
    getChartedTracks(),
    getEvents(),
  ]);
  const upcomingEvents = events.filter((e) => e.status === "Upcoming").sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).slice(0, 4);
  const liveEvents = events.filter((e) => e.status === "Live");

  const tracks = tracksRes.data;
  const top5 = charted.slice(0, 5);

  return (
    <div>
      <AutoRefresh intervalMs={15000} />
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-8">
        <h1 className="text-3xl md:text-5xl font-light tracking-tight text-white/90 leading-tight mb-5">
          Music with a story
        </h1>
        <CyclingSubtitle />
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-20 space-y-14">

        {/* Events */}
        {(liveEvents.length > 0 || upcomingEvents.length > 0) && (
          <section>
            <div className="flex items-baseline justify-between mb-8">
              <Link href="/studio/sessions?from=home" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors">Sessions</Link>
              <Link href="/studio/sessions?from=home" className="text-xs text-white/35 hover:text-white/70 transition-colors">
                See all →
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {[...liveEvents, ...upcomingEvents].map((ev) => (
                <Link key={ev.id} href={`/studio/sessions/${ev.id}`} className={`group relative rounded-xl overflow-hidden border border-white/8 hover:border-white/20 transition-colors shrink-0 w-56 ${ev.status === "Live" ? "bg-black" : "bg-white/[0.02]"}`}>
                  <EventCardCover
                    eventId={ev.id}
                    coverImageUrl={ev.coverImageUrl}
                    alt={ev.title}
                    containerClassName="relative w-full aspect-video"
                    className={`object-cover ${ev.status === "Live" ? "opacity-40 group-hover:opacity-55" : "opacity-50 group-hover:opacity-65"}`}
                  />
                  <div className="px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">{ev.title}</p>
                      <EventTimeLabel scheduledAt={ev.scheduledAt} status={ev.status} className="ml-2" />
                    </div>
                    <p className="text-xs text-white/30">
                      {new Date(ev.scheduledAt.endsWith("Z") ? ev.scheduledAt : ev.scheduledAt + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* New Releases */}
        <section id="new-releases">
          <div className="flex items-baseline justify-between mb-8">
            <Link href="/music?from=home" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors">New Releases</Link>
            <Link href="/music?from=home" className="text-xs text-white/35 hover:text-white/70 transition-colors">
              See all →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {tracks.map((track) => (
              <div key={track.id} className="shrink-0 w-36">
                <TrackCard track={track} queue={tracks} />
              </div>
            ))}
          </div>
        </section>

        {/* Albums */}
        {albums.length > 0 && (
          <section>
            <Link href="/albums?from=home" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors mb-8 inline-block">Albums</Link>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {albums.map((album) => (
                <div key={album.id} className="shrink-0 w-36">
                  <AlbumCard album={album} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Charted */}
        {top5.length > 0 && (
          <section>
            <Link href="/charted?from=home" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors mb-8 inline-block">Charted</Link>
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
