"use client";

import { useEffect, useState } from "react";

type Tone = { label: string; className: string };

// Relative-time buckets. Computed on the client so "Today"/"Tomorrow" reflect the
// viewer's own clock and timezone — computing them during a server render used the
// server's timezone and also made the component impure.
function bucket(scheduledAt: string, now: number): Tone {
  const date = new Date(scheduledAt.endsWith("Z") ? scheduledAt : scheduledAt + "Z");
  const diffDays = (date.getTime() - now) / 86400000;
  if (diffDays < 1 / 48) return { label: "Starting Soon", className: "text-yellow-400/60 animate-pulse" };
  if (diffDays < 1) return { label: "Today", className: "text-yellow-400/40" };
  if (diffDays < 2) return { label: "Tomorrow", className: "text-amber-400/40" };
  if (diffDays < 7) return { label: "This Week", className: "text-orange-400/35" };
  if (diffDays < 31) return { label: "This Month", className: "text-orange-600/35" };
  return { label: "Upcoming", className: "text-white/40" };
}

export default function EventTimeLabel({
  scheduledAt,
  status,
  className = "",
}: {
  scheduledAt: string;
  status: string;
  className?: string;
}) {
  const [tone, setTone] = useState<Tone | null>(null);

  useEffect(() => {
    if (status === "Live" || status === "Ended") return;
    const tick = () => setTone(bucket(scheduledAt, Date.now()));
    tick();
    // Buckets change slowly; a minute is plenty and keeps a long-lived tab honest.
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [scheduledAt, status]);

  const base = `text-xs font-medium shrink-0 ${className}`;

  // Status-driven labels don't depend on the clock, so they render on the server too.
  if (status === "Live") {
    return (
      <span className={`flex items-center gap-1.5 text-red-400/80 ${base}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Live
      </span>
    );
  }
  if (status === "Ended") return <span className={`text-white/15 ${base}`}>Ended</span>;

  // Until the client has ticked, reserve the space without asserting a time.
  if (!tone) return <span className={base} />;
  return <span className={`${tone.className} ${base}`}>{tone.label}</span>;
}
