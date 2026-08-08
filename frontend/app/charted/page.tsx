export const dynamic = "force-dynamic";

import { getChartedTracks } from "@/lib/api";
import ChartedRow from "@/components/ChartedRow";
import BackButton from "@/components/BackButton";

export default async function ChartedPage() {
  const tracks = await getChartedTracks();

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <BackButton />
      <div className="mb-16">
        <p className="text-xs tracking-widest uppercase text-white/30 mb-4">Most Played</p>
        <h1 className="text-4xl font-light text-white/90">Charted</h1>
      </div>

      {tracks.length === 0 ? (
        <p className="text-sm text-white/25">Nothing charted yet.</p>
      ) : (
        <div className="space-y-1">
          {tracks.map((track, i) => (
            <ChartedRow key={track.id} track={track} rank={i + 1} queue={tracks} />
          ))}
        </div>
      )}
    </div>
  );
}
