export const dynamic = "force-dynamic";

import { getEvents } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import EventCountdown from "./EventCountdown";
import AutoRefresh from "@/components/AutoRefresh";
import EventCardCover from "@/components/EventCardCover";
import BackButton from "@/components/BackButton";

export default async function EventsPage() {
  let events: import("@/types").LiveEvent[] = [];
  try { events = await getEvents(); } catch {}

  const live = events.filter((e) => e.status === "Live");
  const upcoming = events.filter((e) => e.status === "Upcoming").sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const ended = events.filter((e) => e.status === "Ended").sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <AutoRefresh intervalMs={15000} />
      <BackButton />
      <div className="mb-12">
        <p className="text-xs tracking-widest uppercase text-white/30 mb-4">Sessions</p>
        <h1 className="text-3xl font-light text-white/90">Events</h1>
      </div>

      {/* LIVE NOW */}
      {live.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-xs tracking-widest uppercase text-white/30">Live Now</p>
          </div>
          <div className="space-y-4">
            {live.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <section className="mb-16">
          <p className="text-xs tracking-widest uppercase text-white/30 mb-6">Upcoming</p>
          <div className="space-y-4">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* PAST */}
      {ended.length > 0 && (
        <section>
          <p className="text-xs tracking-widest uppercase text-white/30 mb-6">Past Sessions</p>
          <div className="space-y-4">
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

function EventTimeLabel({ scheduledAt, status }: { scheduledAt: string; status: string }) {
  if (status === "Live") return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-red-400/70 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Live
    </span>
  );
  const date = new Date(scheduledAt.endsWith("Z") ? scheduledAt : scheduledAt + "Z");
  const diffDays = (date.getTime() - Date.now()) / 86400000;
  if (status === "Ended") return <span className="text-xs font-medium text-white/15 shrink-0">Ended</span>;
  if (diffDays < 1/48) return <span className="text-xs font-medium text-yellow-400/60 shrink-0 animate-pulse">Starting Soon</span>;
  if (diffDays < 1)  return <span className="text-xs font-medium text-yellow-400/40 shrink-0">Today</span>;
  if (diffDays < 2)  return <span className="text-xs font-medium text-amber-400/40 shrink-0">Tomorrow</span>;
  if (diffDays < 7)  return <span className="text-xs font-medium text-orange-400/35 shrink-0">This Week</span>;
  if (diffDays < 31) return <span className="text-xs font-medium text-orange-600/35 shrink-0">This Month</span>;
  return <span className="text-xs font-medium text-white/40 shrink-0">Upcoming</span>;
}

function EventCard({ event }: { event: import("@/types").LiveEvent }) {
  const isLive = event.status === "Live";
  const isEnded = event.status === "Ended";

  return (
    <Link href={`/events/${event.id}`} className={`group flex gap-5 p-5 rounded-xl border border-white/8 hover:border-white/20 transition-colors ${isLive ? "bg-black" : "bg-white/[0.02]"}`}>
      <EventCardCover
        eventId={event.id}
        coverImageUrl={event.coverImageUrl}
        alt={event.title}
        containerClassName={`relative w-20 h-20 rounded-lg overflow-hidden shrink-0 ${isLive ? "bg-black" : "bg-white/5"}`}
        className={`object-cover ${isLive ? "opacity-60 group-hover:opacity-80" : "opacity-70 group-hover:opacity-90"}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-base font-medium text-white/85 group-hover:text-white transition-colors truncate">{event.title}</h3>
          <EventTimeLabel scheduledAt={event.scheduledAt} status={event.status} />
        </div>
        {event.description && (
          <p className="text-sm text-white/40 leading-relaxed mb-2 line-clamp-2">{event.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-white/25">
          <span>{event.trackCount} tracks</span>
          {event.genres.length > 0 && <span>{event.genres.slice(0, 3).join(" · ")}</span>}
          {!isLive && !isEnded && <EventCountdown scheduledAt={event.scheduledAt} />}
          {isEnded && <span>{new Date(event.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
        </div>
      </div>
    </Link>
  );
}
