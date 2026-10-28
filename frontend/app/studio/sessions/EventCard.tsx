"use client";

// @ts-expect-error — ViewTransition is in React 19 canary, types lag behind
import { ViewTransition } from "react";
import Link from "next/link";
import EventCardCover from "@/components/EventCardCover";
import EventTimeLabel from "@/components/EventTimeLabel";
import EventCountdown from "./EventCountdown";
import ParallaxCard from "@/components/ParallaxCard";
import type { LiveEvent } from "@/types";

export default function EventCard({ event }: { event: LiveEvent }) {
  const isLive = event.status === "Live";
  const isEnded = event.status === "Ended";

  return (
    <div className="max-w-4xl mx-auto px-6 mb-2">
      <Link href={`/studio/sessions/${event.id}`} className="group relative block overflow-hidden rounded-lg">
        {/* Background image */}
        <div className="absolute inset-0">
          <EventCardCover
            eventId={event.id}
            coverImageUrl={event.coverImageUrl}
            alt={event.title}
            containerClassName="absolute inset-0"
            className={`object-cover transition-all duration-700 ${isLive ? "opacity-40 group-hover:opacity-55" : "opacity-25 group-hover:opacity-40"}`}
          />
        </div>
        {/* Left + right fade */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        {/* Content */}
        <ParallaxCard>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <ViewTransition name={`session-title-${event.id}`}>
                <h3 className="text-lg font-semibold tracking-widest uppercase text-white/85 group-hover:text-white transition-colors leading-tight mb-1">
                  {event.title}
                </h3>
              </ViewTransition>
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
