"use client";

import TrackCard from "@/components/TrackCard";
import { Track } from "@/types";

export default function MusicGrid({ tracks }: { tracks: Track[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {tracks.map((track) => (
        <TrackCard key={track.id} track={track} queue={tracks} />
      ))}
    </div>
  );
}
