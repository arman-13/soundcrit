"use client";

import { getAlbums, getTracks } from "@/lib/api";
import { Album, Track } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import TrackCard from "@/components/TrackCard";

function SearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([getTracks(1, 200), getAlbums()])
      .then(([tracksRes, albumsRes]) => {
        setTracks(tracksRes.data);
        setAlbums(albumsRes);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const updateUrl = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        router.replace(`/search${q ? `?${params}` : ""}`, { scroll: false });
      }, 300);
    },
    [router]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    updateUrl(e.target.value);
  };

  const q = query.trim().toLowerCase();

  const filteredTracks = q
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.genre?.toLowerCase().includes(q) ||
          t.albumTitle?.toLowerCase().includes(q)
      )
    : [];

  const filteredAlbums = q
    ? albums.filter((a) => a.title.toLowerCase().includes(q))
    : [];

  // Derive unique artists from tracks
  const uniqueArtists = Array.from(new Set(tracks.map((t) => t.artist))).sort();
  const filteredArtists = q
    ? uniqueArtists.filter((a) => a.toLowerCase().includes(q))
    : [];

  const hasResults = filteredTracks.length > 0 || filteredAlbums.length > 0 || filteredArtists.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 pt-12 pb-20">
      {/* Search input */}
      <div className="relative mb-12">
        <svg
          className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Tracks, artists, albums…"
          className="w-full bg-transparent border-b border-white/15 focus:border-white/40 outline-none pl-7 pr-4 py-3 text-xl text-white/80 placeholder:text-white/20 transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); updateUrl(""); inputRef.current?.focus(); }}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {loading && (
        <p className="text-sm text-white/25">Loading…</p>
      )}

      {!loading && !q && (
        <p className="text-sm text-white/20">Start typing to search tracks, albums, and artists.</p>
      )}

      {!loading && q && !hasResults && (
        <p className="text-sm text-white/30">No results for &ldquo;{query}&rdquo;</p>
      )}

      {/* Artists */}
      {filteredArtists.length > 0 && (
        <section className="mb-12">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-5">
            Artists <span className="text-white/15">— {filteredArtists.length}</span>
          </p>
          <div className="flex flex-col divide-y divide-white/5">
            {filteredArtists.slice(0, 12).map((artist) => {
              const cover = tracks.find((t) => t.artist === artist)?.coverImageUrl;
              return (
                <Link key={artist} href={`/artists/${encodeURIComponent(artist)}`}
                  className="flex items-center gap-4 py-3 group hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/8 shrink-0">
                    {cover && <Image src={cover} alt={artist} fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity" />}
                  </div>
                  <p className="text-sm text-white/65 group-hover:text-white/90 transition-colors">{artist}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Tracks */}
      {filteredTracks.length > 0 && (
        <section className="mb-12">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-5">
            Tracks <span className="text-white/15">— {filteredTracks.length}</span>
          </p>
          <div className="flex flex-wrap gap-4">
            {filteredTracks.slice(0, 24).map((track) => (
              <div key={track.id} className="w-32">
                <TrackCard track={track} queue={filteredTracks} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Albums */}
      {filteredAlbums.length > 0 && (
        <section>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-5">
            Albums <span className="text-white/15">— {filteredAlbums.length}</span>
          </p>
          <div className="flex flex-wrap gap-4">
            {filteredAlbums.map((album) => (
              <Link key={album.id} href={`/albums/${album.id}`} className="group w-32">
                <div className="relative aspect-square rounded overflow-hidden mb-2 bg-white/5">
                  {album.coverImageUrl && (
                    <Image
                      src={album.coverImageUrl}
                      alt={album.title}
                      fill
                      className="object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                    />
                  )}
                </div>
                <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">
                  {album.title}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  {new Date(album.releasedAt).getFullYear()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
