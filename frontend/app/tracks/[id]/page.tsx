export const dynamic = "force-dynamic";

import { getTrack } from "@/lib/api";
import TrackDetailPlayer from "./TrackDetailPlayer";
import { notFound } from "next/navigation";
import Image from "next/image";

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let track;
  try {
    track = await getTrack(Number(id));
  } catch {
    notFound();
  }

  const moods = track.mood?.split(",").map((m) => m.trim()).filter(Boolean) ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      {/* Cover + player */}
      <div className="flex flex-col md:flex-row gap-8 mb-16">
        <div className="relative w-full md:w-56 aspect-square rounded-lg overflow-hidden bg-white/5 shrink-0">
          <Image src={track.coverImageUrl} alt={track.title} fill className="object-cover" priority />
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-xs tracking-widest uppercase text-white/25 mb-3">{track.genre}</p>
          <h1 className="text-3xl md:text-4xl font-light text-white/90 leading-tight mb-2">{track.title}</h1>
          <p className="text-base text-white/45 mb-4">{track.artist}</p>
          {moods.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {moods.map((m) => (
                <span key={m} className="text-xs text-white/30 border border-white/10 px-2.5 py-1 rounded-full">
                  {m}
                </span>
              ))}
            </div>
          )}
          <TrackDetailPlayer track={track} />
          <p className="text-xs text-white/20 mt-3">{track.playCount.toLocaleString()} plays · {track.duration}</p>
        </div>
      </div>

      {/* Description */}
      {track.description && (
        <p className="text-base text-white/50 leading-relaxed mb-12 border-l border-white/10 pl-5">
          {track.description}
        </p>
      )}

      {/* Story / liner notes */}
      {track.story && (
        <div>
          <h2 className="text-xs tracking-widest uppercase text-white/25 mb-6">Liner Notes</h2>
          <div
            className="prose prose-invert prose-sm max-w-none
              prose-headings:font-light prose-headings:text-white/70
              prose-p:text-white/45 prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: track.story }}
          />
        </div>
      )}
    </div>
  );
}
