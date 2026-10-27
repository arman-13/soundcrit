export const dynamic = "force-dynamic";

import { getEvents } from "@/lib/api";
import Link from "next/link";
import EventCountdown from "./EventCountdown";
import EventTimeLabel from "@/components/EventTimeLabel";
import AutoRefresh from "@/components/AutoRefresh";
import EventCardCover from "@/components/EventCardCover";
import BackButton from "@/components/BackButton";
import ParallaxCard from "@/components/ParallaxCard";

export default async function EventsPage() {
  let events: import("@/types").LiveEvent[] = [];
  try { events = await getEvents(); } catch {}

  const live = events.filter((e) => e.status === "Live");
  const upcoming = events.filter((e) => e.status === "Upcoming").sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const ended = events.filter((e) => e.status === "Ended").sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <div className="pt-14 pb-20">
      <AutoRefresh intervalMs={15000} />
      <BackButton />
      {/* LIVE NOW */}
      {live.length === 0 && upcoming.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <p className="text-xs tracking-widest uppercase text-white/30">No live sessions</p>
        </div>
      )}
      {live.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-4 max-w-4xl mx-auto px-6">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-xs tracking-widest uppercase text-red-400/80">Live Sessions</p>
          </div>
          <div>
            {live.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* UPCOMING */}
      {live.length === 0 && upcoming.length === 0 && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <p className="text-xs tracking-widest uppercase text-white/30">No upcoming sessions</p>
        </div>
      )}
      {upcoming.length > 0 && (
        <section className="mb-16">
          <p className="text-xs tracking-widest uppercase text-yellow-400/40 mb-4 max-w-4xl mx-auto px-6">Upcoming Sessions</p>
          <div>
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* PAST */}
      {ended.length > 0 && (
        <section>
          <div className="max-w-4xl mx-auto px-6 mb-4">
            <p className="text-xs tracking-widest uppercase text-white/30">Past Sessions</p>
          </div>
          <div>
            {ended.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {events.length === 0 && (
        <p className="text-sm text-white/25">No events yet.</p>
      )}
    </div>
  );
}

function EventCard({ event }: { event: import("@/types").LiveEvent }) {
  const isLive = event.status === "Live";
  const isEnded = event.status === "Ended";

  return (
    <div className="max-w-4xl mx-auto px-6 mb-2">
      <Link href={`/studio/sessions/${event.id}`} className="group relative block overflow-hidden rounded-lg">
        {/* Background image */}
        <EventCardCover
          eventId={event.id}
          coverImageUrl={event.coverImageUrl}
          alt={event.title}
          containerClassName="absolute inset-0"
          className={`object-cover transition-all duration-700 ${isLive ? "opacity-40 group-hover:opacity-55" : "opacity-25 group-hover:opacity-40"}`}
        />
        {/* Left + right fade */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        {/* Content */}
        <ParallaxCard>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-widest uppercase text-white/85 group-hover:text-white transition-colors leading-tight mb-1">{event.title}</h3>
              {event.description && (
                <p className="text-sm text-white/38 leading-relaxed line-clamp-1 mb-2">{event.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-white/25">
                {event.trackCount > 0 && <span>{event.trackCount} tracks</span>}
                {event.genres.length > 0 && <><span className="text-white/12">·</span><span>{event.genres.slice(0, 2).join(", ")}</span></>}
                {isEnded && <><span className="text-white/12">·</span><span>{new Date(event.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></>}
                {!isLive && !isEnded && <EventCountdown scheduledAt={event.scheduledAt} />}
              </div>
            </div>
            <EventTimeLabel scheduledAt={event.scheduledAt} status={event.status} />
          </div>
        </ParallaxCard>
      </Link>
    </div>
  );
}
