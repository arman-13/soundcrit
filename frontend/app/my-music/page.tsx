"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  getAllTracksAdmin, deleteTrack, updateTrack,
  getAlbums, createAlbum, updateAlbum, deleteAlbum,
  createTrack, addTrackToAlbum,
} from "@/lib/api";
import { Album, Track } from "@/types";
import Image from "next/image";
import Link from "next/link";

type View = "tracks" | "albums" | "upload" | "edit-track" | "create-album" | "edit-album";

export default function MyMusicPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<View>("tracks");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const loadTracks = useCallback(async () => {
    if (!token) return;
    try { setTracks((await getAllTracksAdmin(token)).data); } catch {}
  }, [token]);

  const loadAlbums = useCallback(async () => {
    try { setAlbums(await getAlbums()); } catch {}
  }, []);

  useEffect(() => {
    if (token) { loadTracks(); loadAlbums(); }
  }, [token, loadTracks, loadAlbums]);

  const handleDeleteTrack = async (id: number) => {
    if (!token || !confirm("Delete this track?")) return;
    await deleteTrack(id, token);
    loadTracks();
  };

  const handleDeleteAlbum = async (id: number) => {
    if (!token || !confirm("Delete this album?")) return;
    await deleteAlbum(id, token);
    loadAlbums();
  };

  const handleToggle = async (track: Track, field: "isFeatured" | "isPublished") => {
    if (!token) return;
    await updateTrack(track.id, { ...track, [field]: !track[field] }, token);
    loadTracks();
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-white/8 pt-12 px-4 flex flex-col gap-1">
        {(["tracks", "albums", "upload", "create-album"] as const).map((v) => {
          const labels: Record<string, string> = {
            tracks: "My Tracks", albums: "My Albums",
            upload: "Upload Track", "create-album": "Create Album",
          };
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-left text-sm px-3 py-2 rounded transition-colors ${
                view === v ? "bg-white/8 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              {labels[v]}
            </button>
          );
        })}
        <div className="mt-auto mb-8">
          <Link href="/profile" className="text-sm px-3 py-2 text-white/30 hover:text-white/60 transition-colors block">
            My Profile
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 px-8 py-12 min-w-0">
        {view === "tracks" && (
          <TracksView
            tracks={tracks}
            onEdit={(t) => { setEditingTrack(t); setView("edit-track"); }}
            onDelete={handleDeleteTrack}
            onToggle={handleToggle}
            onUpload={() => setView("upload")}
          />
        )}
        {view === "albums" && (
          <AlbumsView
            albums={albums}
            tracks={tracks}
            token={token!}
            onEdit={(a) => { setEditingAlbum(a); setView("edit-album"); }}
            onDelete={handleDeleteAlbum}
            onCreate={() => setView("create-album")}
            onRefresh={loadAlbums}
          />
        )}
        {view === "upload" && (
          <TrackForm
            onSubmit={async (data) => {
              if (!token) return;
              setBusy(true);
              try { await createTrack(data, token); setView("tracks"); loadTracks(); }
              finally { setBusy(false); }
            }}
            busy={busy}
            onCancel={() => setView("tracks")}
            userDisplayName={user.displayName}
          />
        )}
        {view === "edit-track" && editingTrack && (
          <TrackForm
            initial={editingTrack}
            onSubmit={async (data) => {
              if (!token) return;
              setBusy(true);
              try { await updateTrack(editingTrack.id, data, token); setView("tracks"); loadTracks(); }
              finally { setBusy(false); }
            }}
            busy={busy}
            onCancel={() => setView("tracks")}
            userDisplayName={user.displayName}
          />
        )}
        {view === "create-album" && (
          <AlbumForm
            onSubmit={async (data) => {
              if (!token) return;
              setBusy(true);
              try { await createAlbum(data, token); setView("albums"); loadAlbums(); }
              finally { setBusy(false); }
            }}
            busy={busy}
            onCancel={() => setView("albums")}
          />
        )}
        {view === "edit-album" && editingAlbum && (
          <AlbumForm
            initial={editingAlbum}
            onSubmit={async (data) => {
              if (!token) return;
              setBusy(true);
              try { await updateAlbum(editingAlbum.id, data, token); setView("albums"); loadAlbums(); }
              finally { setBusy(false); }
            }}
            busy={busy}
            onCancel={() => setView("albums")}
          />
        )}
      </main>
    </div>
  );
}

// ── Tracks View ──────────────────────────────────────────────────────────────
function TracksView({ tracks, onEdit, onDelete, onToggle, onUpload }: {
  tracks: Track[];
  onEdit: (t: Track) => void;
  onDelete: (id: number) => void;
  onToggle: (t: Track, f: "isFeatured" | "isPublished") => void;
  onUpload: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-light text-white/90">My Tracks</h1>
        <button onClick={onUpload} className="bg-white text-black text-sm font-medium px-4 py-2 rounded hover:bg-white/90 transition-colors">
          + Upload Track
        </button>
      </div>
      {tracks.length === 0 ? (
        <p className="text-white/30 text-sm">No tracks yet.</p>
      ) : (
        <div className="space-y-1">
          {tracks.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 group">
              <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5">
                {t.coverImageUrl && <Image src={t.coverImageUrl} alt={t.title} fill className="object-cover opacity-70" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">{t.title}</p>
                <p className="text-xs text-white/35">{t.artist} · {t.duration}</p>
              </div>
              <span className="text-xs text-white/25 tabular-nums hidden md:block">{t.playCount} plays</span>
              <Toggle label="Featured" on={t.isFeatured} onChange={() => onToggle(t, "isFeatured")} />
              <Toggle label="Published" on={t.isPublished} onChange={() => onToggle(t, "isPublished")} />
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onEdit(t)} className="text-xs text-white/35 hover:text-white/70 transition-colors">Edit</button>
                <button onClick={() => onDelete(t.id)} className="text-xs text-red-400/50 hover:text-red-400/80 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Albums View ──────────────────────────────────────────────────────────────
function AlbumsView({ albums, tracks, token, onEdit, onDelete, onCreate, onRefresh }: {
  albums: Album[];
  tracks: Track[];
  token: string;
  onEdit: (a: Album) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  const [adding, setAdding] = useState<{ albumId: number; trackId: string; num: string } | null>(null);

  const handleAddTrack = async () => {
    if (!adding) return;
    await addTrackToAlbum(adding.albumId, Number(adding.trackId), Number(adding.num), token);
    setAdding(null);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-light text-white/90">My Albums</h1>
        <button onClick={onCreate} className="bg-white text-black text-sm font-medium px-4 py-2 rounded hover:bg-white/90 transition-colors">
          + Create Album
        </button>
      </div>
      {albums.length === 0 ? (
        <p className="text-white/30 text-sm">No albums yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {albums.map((a) => (
            <div key={a.id} className="group">
              <div className="relative aspect-square rounded overflow-hidden mb-3 bg-white/5">
                {a.coverImageUrl && <Image src={a.coverImageUrl} alt={a.title} fill className="object-cover opacity-70" />}
              </div>
              <p className="text-sm text-white/75 truncate">{a.title}</p>
              <p className="text-xs text-white/30 mt-0.5">{new Date(a.releasedAt).getFullYear()}</p>
              <div className="flex gap-3 mt-2">
                <button onClick={() => onEdit(a)} className="text-xs text-white/35 hover:text-white/70 transition-colors">Edit</button>
                <button onClick={() => setAdding({ albumId: a.id, trackId: "", num: "1" })} className="text-xs text-white/35 hover:text-white/70 transition-colors">+ Track</button>
                <button onClick={() => onDelete(a.id)} className="text-xs text-red-400/50 hover:text-red-400/80 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add track to album inline */}
      {adding && (
        <div className="mt-8 p-5 border border-white/10 rounded-lg max-w-sm">
          <p className="text-sm text-white/60 mb-4">Add track to album</p>
          <select
            value={adding.trackId}
            onChange={(e) => setAdding({ ...adding, trackId: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white/70 mb-3"
          >
            <option value="">Select track…</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <input
            type="number" min={1} placeholder="Track number"
            value={adding.num}
            onChange={(e) => setAdding({ ...adding, num: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white/70 mb-3"
          />
          <div className="flex gap-3">
            <button onClick={handleAddTrack} className="bg-white text-black text-sm px-4 py-2 rounded hover:bg-white/90 transition-colors">Add</button>
            <button onClick={() => setAdding(null)} className="text-sm text-white/40 hover:text-white/70 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Track Form ────────────────────────────────────────────────────────────────
function TrackForm({ initial, onSubmit, busy, onCancel, userDisplayName }: {
  initial?: Track;
  onSubmit: (data: Partial<Track>) => void;
  busy: boolean;
  onCancel: () => void;
  userDisplayName: string;
}) {
  const [form, setForm] = useState<Partial<Track>>(initial ?? {
    title: "", artist: userDisplayName, genre: "", duration: "", mood: "",
    audioUrl: "", coverImageUrl: "", description: "", story: "",
    isFeatured: false, isPublished: false, publishedAt: new Date().toISOString(),
  });

  const set = (f: keyof Track) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const textFields: { key: keyof Track; label: string; placeholder?: string }[] = [
    { key: "title", label: "Title" },
    { key: "artist", label: "Artist" },
    { key: "genre", label: "Genre" },
    { key: "duration", label: "Duration", placeholder: "e.g. 3:42" },
    { key: "mood", label: "Mood tags", placeholder: "e.g. melancholic,late night" },
    { key: "audioUrl", label: "Audio URL" },
    { key: "coverImageUrl", label: "Cover Image URL" },
    { key: "description", label: "Short description" },
  ];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-light text-white/90 mb-8">{initial ? "Edit Track" : "Upload Track"}</h1>
      <div className="space-y-5">
        {textFields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">{label}</label>
            <input
              type="text"
              value={(form[key] as string) ?? ""}
              onChange={set(key)}
              placeholder={placeholder}
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Liner Notes (markdown)</label>
          <textarea
            value={(form.story as string) ?? ""}
            onChange={set("story")}
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors resize-none"
          />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer">
            <input type="checkbox" checked={!!form.isFeatured}
              onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
              className="accent-white" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer">
            <input type="checkbox" checked={!!form.isPublished}
              onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
              className="accent-white" />
            Published
          </label>
        </div>
        <div className="flex gap-4 pt-2">
          <button disabled={busy} onClick={() => onSubmit(form)}
            className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded hover:bg-white/90 transition-colors disabled:opacity-50">
            {busy ? "Saving…" : initial ? "Save changes" : "Upload"}
          </button>
          <button onClick={onCancel} className="text-sm text-white/40 hover:text-white/70 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Album Form ────────────────────────────────────────────────────────────────
function AlbumForm({ initial, onSubmit, busy, onCancel }: {
  initial?: Album;
  onSubmit: (data: Partial<Album>) => void;
  busy: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Album>>(initial ?? {
    title: "", coverImageUrl: "", description: "",
    releasedAt: new Date().toISOString().slice(0, 10), isPublished: false,
  });

  const set = (f: keyof Album) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-light text-white/90 mb-8">{initial ? "Edit Album" : "Create Album"}</h1>
      <div className="space-y-5">
        {(["title", "coverImageUrl"] as const).map((k) => (
          <div key={k}>
            <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">{k === "coverImageUrl" ? "Cover Image URL" : "Title"}</label>
            <input type="text" value={(form[k] as string) ?? ""} onChange={set(k)}
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors" />
          </div>
        ))}
        <div>
          <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Description</label>
          <textarea value={form.description ?? ""} onChange={set("description")} rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors resize-none" />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Release Date</label>
          <input type="date" value={(form.releasedAt as string ?? "").slice(0, 10)}
            onChange={(e) => setForm((p) => ({ ...p, releasedAt: new Date(e.target.value).toISOString() }))}
            className="bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors" />
        </div>
        <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer">
          <input type="checkbox" checked={!!form.isPublished}
            onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
            className="accent-white" />
          Published
        </label>
        <div className="flex gap-4 pt-2">
          <button disabled={busy} onClick={() => onSubmit(form)}
            className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded hover:bg-white/90 transition-colors disabled:opacity-50">
            {busy ? "Saving…" : initial ? "Save changes" : "Create"}
          </button>
          <button onClick={onCancel} className="text-sm text-white/40 hover:text-white/70 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle pill ───────────────────────────────────────────────────────────────
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
        on ? "border-white/30 text-white/70 bg-white/5" : "border-white/8 text-white/25 hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}
