export const dynamic = "force-dynamic";

import { getArtistProfile, getArtistTracks, getArtistAlbums, getArtistEvents } from "@/lib/api";
import ArtistTracks from "./ArtistTracks";
import FollowButton from "./FollowButton";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AlbumCard from "@/components/AlbumCard";

export default async function ArtistPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const name = decodeURIComponent(username);

  let profile, tracksRes, albums;
  let artistEvents: import("@/types").LiveEvent[] = [];
  try {
    profile = await getArtistProfile(name);
    [tracksRes, albums, artistEvents] = await Promise.all([
      getArtistTracks(profile.id),
      getArtistAlbums(profile.id),
      getArtistEvents(profile.id),
    ]);
  } catch {
    notFound();
  }

  const tracks = tracksRes.data;

  const heroCover = profile.avatarUrl ?? tracks[0]?.coverImageUrl ?? null;

  return (
    <div>

      {/* Artist hero — bleeds behind sticky nav */}
      <header className="relative w-full h-72 md:h-96 mb-10 -mt-16" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)" }}>
        {/* Photo / cover fallback */}
        {heroCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroCover}
            alt={profile.displayName}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <span className="absolute bottom-4 left-4 text-white/[0.04] text-[14rem] font-light leading-none select-none pointer-events-none">
            {profile.displayName.charAt(0).toUpperCase()}
          </span>
        )}

        {/* Gradient overlay — always present */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.1) 35%, rgba(10,10,10,0.2) 50%, rgba(10,10,10,0.85) 78%, #0a0a0a 100%)" }}
        />

        {/* Artist name pinned to the bottom */}
        <div className={`absolute left-0 right-0 pb-6 ${profile.avatarUrl ? "bottom-0" : "bottom-0 pt-24"}`}>
          <div className="max-w-3xl mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-light text-white/90 tracking-tight mb-1">
              {profile.displayName}
            </h1>
            <p className="text-sm text-white/40">@{profile.username}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6">
        {/* Bio + follow below the hero */}
        {(profile.bio) && (
          <p className="text-sm text-white/45 leading-relaxed mb-4 max-w-md">{profile.bio}</p>
        )}
        <div className="mb-10">
          <FollowButton artistId={profile.id} />
        </div>

      {/* Tracks */}
      {tracks.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs tracking-widest uppercase text-white/25 mb-4">Top Songs</h2>
          <ArtistTracks tracks={tracks} />
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs tracking-widest uppercase text-white/25 mb-5">Albums</h2>
          <div className="flex flex-wrap gap-6">
            {albums.map((album) => (
              <div key={album.id} className="w-36">
                <AlbumCard album={album} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sessions */}
      {artistEvents.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs tracking-widest uppercase text-white/25 mb-4">Sessions</h2>
          <div className="space-y-2">
            {artistEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/studio/sessions/${ev.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors group"
              >
                {ev.coverImageUrl ? (
                  <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5">
                    <Image src={ev.coverImageUrl} alt={ev.title} fill className="object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded shrink-0 bg-white/5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/75 group-hover:text-white transition-colors truncate">{ev.title}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {new Date(ev.scheduledAt.endsWith("Z") ? ev.scheduledAt : ev.scheduledAt + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className={`text-xs shrink-0 ${ev.status === "Live" ? "text-red-400/70" : ev.status === "Upcoming" ? "text-white/30" : "text-white/20"}`}>
                  {ev.status === "Live" ? "Live" : ev.status === "Upcoming" ? "Upcoming" : "Ended"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      </div>
    </div>
  );
}
