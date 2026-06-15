export const dynamic = "force-dynamic";

import { getTracks } from "@/lib/api";
import MusicGrid from "./MusicGrid";

export default async function MusicPage() {
  const { data: tracks } = await getTracks(1, 20);

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="mb-16">
        <p className="text-xs tracking-widest uppercase text-white/30 mb-4">New Releases</p>
        <h1 className="text-4xl font-light text-white/90">Music</h1>
      </div>
      <MusicGrid tracks={tracks} />
    </div>
  );
}
