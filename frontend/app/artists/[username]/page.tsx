export const dynamic = "force-dynamic";

import { getArtistProfile, getArtistTracks, getArtistAlbums, getArtistEvents } from "@/lib/api";
import ArtistTracks from "./ArtistTracks";
import FollowButton from "./FollowButton";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">

      {/* Artist header */}
      <header className="flex flex-col items-center text-center mb-20">
        {/* Avatar */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white/5 mb-6 ring-1 ring-white/10">
          {profile.avatarUrl ? (
            <Image src={profile.avatarUrl} alt={profile.displayName} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20 text-3xl font-light select-none">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-light text-white/90 tracking-tight mb-1">
          {profile.displayName}
        </h1>
        <p className="text-sm text-white/30 mb-5">@{profile.username}</p>

        {profile.bio && (
          <p className="text-sm text-white/45 leading-relaxed max-w-sm mb-6">{profile.bio}</p>
        )}

        <FollowButton artistId={profile.id} />
      </header>

      {/* Sessions */}
      {artistEvents.length > 0 && (
        <section className="mb-20">
          <h2 className="text-xs tracking-widest uppercase text-white/25 mb-8">Sessions</h2>
          <div className="space-y-2">
            {artistEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
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

      {/* Albums */}
      {albums.length > 0 && (
        <section className="mb-20">
          <h2 className="text-xs tracking-widest uppercase text-white/25 mb-8">Albums</h2>
          <div className="flex flex-wrap gap-6">
            {albums.map((album) => (
              <Link key={album.id} href={`/albums/${album.id}`} className="group w-36">
                <div className="relative aspect-square rounded overflow-hidden bg-white/5 mb-3">
                  {album.coverImageUrl && (
                    <Image
                      src={album.coverImageUrl}
                      alt={album.title}
                      fill
                      className="object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                    />
                  )}
                </div>
                <p className="text-sm text-white/75 group-hover:text-white transition-colors truncate">
                  {album.title}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  {new Date(album.releasedAt).getFullYear()}
                  {album.trackCount != null ? ` · ${album.trackCount} tracks` : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tracks */}
      <section>
        <h2 className="text-xs tracking-widest uppercase text-white/25 mb-8">Tracks</h2>
        <ArtistTracks tracks={tracks} />
      </section>

    </div>
  );
}
