export const dynamic = "force-dynamic";

import { getTracks } from "@/lib/api";
import MusicGrid from "./MusicGrid";
import BackButton from "@/components/BackButton";

export default async function MusicPage() {
  const { data: tracks } = await getTracks(1, 20);

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <BackButton />
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase text-white/30">New Releases</p>
      </div>
      <MusicGrid tracks={tracks} />
    </div>
  );
}
