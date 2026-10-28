export const dynamic = "force-dynamic";

import { getEvents } from "@/lib/api";
import AutoRefresh from "@/components/AutoRefresh";
import BackButton from "@/components/BackButton";
import EventCard from "./EventCard";

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

