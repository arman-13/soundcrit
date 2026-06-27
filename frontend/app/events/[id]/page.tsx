export const dynamic = "force-dynamic";

import { getEvent } from "@/lib/api";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import EventUpcoming from "./EventUpcoming";
import EventLive from "./EventLive";
import EventEnded from "./EventEnded";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let event;
  try { event = await getEvent(Number(id)); } catch { notFound(); }

  if (event.status === "Upcoming") return <Suspense><EventUpcoming event={event} /></Suspense>;
  if (event.status === "Live") return <EventLive event={event} />;
  return <EventEnded event={event} />;
}
