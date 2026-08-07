export const dynamic = "force-dynamic";

import { getAlbums, getChartedTracks, getTracks, getEvents } from "@/lib/api";
import TrackCard from "@/components/TrackCard";
import ChartedRow from "@/components/ChartedRow";
import AutoRefresh from "@/components/AutoRefresh";
import EventCardCover from "@/components/EventCardCover";
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
      <section className="flex flex-col items-center justify-center text-center px-6 pt-14 pb-8">
        <h1 className="text-3xl md:text-5xl font-light tracking-tight text-white/90 leading-tight mb-5">
          Music with a story
        </h1>
        <p className="text-base text-white/40 leading-relaxed" style={{ maxWidth: 480 }}>
          Listen live with others — every session is saved as a record
        </p>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-20 space-y-14">

        {/* Events */}
        {(liveEvents.length > 0 || upcomingEvents.length > 0) && (
          <section>
            <div className="flex items-baseline justify-between mb-8">
              <Link href="/events" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors">Sessions</Link>
              <Link href="/events" className="text-xs text-white/35 hover:text-white/70 transition-colors">
                See all →
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {[...liveEvents, ...upcomingEvents].map((ev) => (
                <Link key={ev.id} href={`/events/${ev.id}`} className={`group relative rounded-xl overflow-hidden border border-white/8 hover:border-white/20 transition-colors shrink-0 w-56 ${ev.status === "Live" ? "bg-black" : "bg-white/[0.02]"}`}>
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
                      <EventTimeLabel scheduledAt={ev.scheduledAt} status={ev.status} />
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
            <Link href="/music" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors">New Releases</Link>
            <Link href="/music" className="text-xs text-white/35 hover:text-white/70 transition-colors">
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
            <Link href="/music" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors mb-8 inline-block">Albums</Link>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {albums.map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`} className="group shrink-0 w-36">
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
            <Link href="/music" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors mb-8 inline-block">Charted</Link>
            <ChartedList tracks={top5} />
          </section>
        )}


      </div>
    </div>
  );
}

function EventTimeLabel({ scheduledAt, status }: { scheduledAt: string; status: string }) {
  if (status === "Live") return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-red-400/80 shrink-0 ml-2">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Live
    </span>
  );
  if (status === "Ended") return <span className="text-xs font-medium text-white/15 shrink-0 ml-2">Ended</span>;
  const date = new Date(scheduledAt.endsWith("Z") ? scheduledAt : scheduledAt + "Z");
  const diffDays = (date.getTime() - Date.now()) / 86400000;
  if (diffDays < 1/48) return <span className="text-xs font-medium text-yellow-400/60 shrink-0 ml-2 animate-pulse">Starting Soon</span>;
  if (diffDays < 1)  return <span className="text-xs font-medium text-yellow-400/40 shrink-0 ml-2">Today</span>;
  if (diffDays < 2)  return <span className="text-xs font-medium text-amber-400/40 shrink-0 ml-2">Tomorrow</span>;
  if (diffDays < 7)  return <span className="text-xs font-medium text-orange-400/35 shrink-0 ml-2">This Week</span>;
  if (diffDays < 31) return <span className="text-xs font-medium text-orange-600/35 shrink-0 ml-2">This Month</span>;
  return <span className="text-xs font-medium text-white/40 shrink-0 ml-2">Upcoming</span>;
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
