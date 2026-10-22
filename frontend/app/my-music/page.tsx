"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import {
  getAllTracksAdmin, deleteTrack, updateTrack,
  getMyAlbums, createAlbum, updateAlbum, deleteAlbum,
  createTrack, addTrackToAlbum, getAlbum, removeTrackFromAlbum, reorderAlbumTracks,
  getEvents, createEvent, deleteEvent, updateEvent,
} from "@/lib/api";
import { Album, AlbumTrackDto, Track, LiveEvent } from "@/types";
import Image from "next/image";
import Link from "next/link";
import StoryBlockEditor from "./StoryBlockEditor";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").trim();

async function uploadFile(file: File, type: "image" | "audio", token: string): Promise<{ url: string; duration?: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/upload/${type}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

type View = "home" | "tracks" | "albums" | "upload" | "edit-track" | "create-album" | "edit-album" | "sessions" | "create-session" | "edit-session" | "profile";

function MyMusicPageInner() {
  const { user, token, loading, updateProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [view, setView] = useState<View>(searchParams.get("upload") === "1" ? "upload" : "home");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<LiveEvent[]>([]);
  const [sessionForm, setSessionForm] = useState({ title: "", description: "", coverImageUrl: "", scheduledAt: "" });
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [sessionUploading, setSessionUploading] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveEvent | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = useState({ displayName: "", bio: "", avatarUrl: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileSeededId, setProfileSeededId] = useState<string | null>(null);
  if (user && user.id !== profileSeededId) {
    setProfileSeededId(user.id);
    setProfileForm({ displayName: user.displayName, bio: user.bio ?? "", avatarUrl: user.avatarUrl ?? "" });
  }

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const loadTracks = useCallback(async () => {
    if (!token) return;
    try { setTracks((await getAllTracksAdmin(token)).data); } catch {}
  }, [token]);

  // Must depend on `token`: with an empty dep array this closed over the initial
  // null token forever, so the albums request always went out unauthenticated
  // and was swallowed by the empty catch — albums never loaded.
  const loadAlbums = useCallback(async () => {
    if (!token) return;
    try { setAlbums(await getMyAlbums(token)); } catch {}
  }, [token]);

  // Initial load runs as one async continuation rather than calling the loaders
  // synchronously from the effect body.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([getAllTracksAdmin(token), getMyAlbums(token)])
      .then(([trackPage, albumList]) => {
        if (cancelled) return;
        setTracks(trackPage.data);
        setAlbums(albumList);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  const loadSessions = useCallback(async () => {
    if (!token || !user) return;
    try {
      const all = await getEvents();
      setSessions(all.filter((e) => e.hostId === user.id).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()));
    } catch {}
  }, [token, user]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleCoverUpload = async (file: File) => {
    if (!token) return;
    setSessionUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/upload/image`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setSessionForm((p) => ({ ...p, coverImageUrl: url }));
    } catch { setSessionError("Image upload failed"); }
    finally { setSessionUploading(false); }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSessionBusy(true); setSessionError("");
    try {
      await createEvent({ ...sessionForm, scheduledAt: new Date(sessionForm.scheduledAt).toISOString() }, token);
      setSessionForm({ title: "", description: "", coverImageUrl: "", scheduledAt: "" });
      setView("sessions");
      await loadSessions();
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Failed to create session");
    } finally { setSessionBusy(false); }
  };

  const handleDeleteSession = async (id: number) => {
    if (!token || !confirm("Delete this session?")) return;
    await deleteEvent(id, token);
    setSessions((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingSession) return;
    setSessionBusy(true); setSessionError("");
    try {
      await updateEvent(editingSession.id, { ...sessionForm, scheduledAt: new Date(sessionForm.scheduledAt).toISOString() }, token);
      setView("sessions");
      setEditingSession(null);
      loadSessions();
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Failed to update session");
    } finally {
      setSessionBusy(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!token) return;
    setProfileUploading(true); setProfileError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/upload/image`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setProfileForm((p) => ({ ...p, avatarUrl: url }));
    } catch { setProfileError("Image upload failed"); }
    finally { setProfileUploading(false); }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setProfileError(""); setProfileSaving(true);
    try {
      await updateProfile(profileForm);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch { setProfileError("Failed to update profile"); }
    finally { setProfileSaving(false); }
  };

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
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 flex">
      {/* Sidebar */}
      <aside className="w-44 shrink-0 pt-12 pr-8 flex flex-col gap-1">
        <p className="text-[10px] tracking-widest uppercase text-white/20 mb-1">Library</p>
        {(["tracks", "albums"] as const).map((v) => {
          const labels: Record<string, string> = { tracks: "Tracks", albums: "Albums" };
          return (
            <button key={v} onClick={() => setView(v)}
              className={`text-left text-sm py-2 rounded transition-colors ${
                view === v ? "text-white" : "text-white/40 hover:text-white/70"
              }`}>
              {labels[v]}
            </button>
          );
        })}
        <p className="text-[10px] tracking-widest uppercase text-white/20 mb-1 mt-6">Sessions</p>
        <button onClick={() => setView("sessions")}
          className={`text-left text-sm py-2 rounded transition-colors ${
            view === "sessions" || view === "create-session" || view === "edit-session" ? "text-white" : "text-white/40 hover:text-white/70"
          }`}>
          Sessions
        </button>
        <p className="text-[10px] tracking-widest uppercase text-white/20 mb-1 mt-6">Account</p>
        <button onClick={() => setView("profile")}
          className={`text-left text-sm py-2 rounded transition-colors ${view === "profile" ? "text-white" : "text-white/40 hover:text-white/70"}`}>
          My Profile
        </button>
      </aside>

      {/* Content */}
      <main className="flex-1 py-12 min-w-0 flex flex-col">
        {view === "home" && <StudioHome tracks={tracks} albums={albums} sessions={sessions} onNavigate={setView} />}
        {(view === "tracks" || view === "upload" || view === "edit-track") && (
          <div className="relative min-h-full">
            <div className={`transition-all duration-500 ${view === "upload" || view === "edit-track" ? "blur-sm pointer-events-none select-none" : ""}`}>
              <TracksView
                tracks={tracks}
                onEdit={(t) => { setEditingTrack(t); setView("edit-track"); }}
                onDelete={handleDeleteTrack}
                onToggle={handleToggle}
                onUpload={() => setView("upload")}
              />
            </div>
            <div className={`absolute inset-0 ${view === "upload" ? "pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              style={view === "upload" ? { animation: "listReveal 0.4s ease forwards" } : undefined}>
              <div className="w-full max-w-xl">
                <TrackForm
                  onSubmit={async (data) => {
                    if (!token) return;
                    setBusy(true);
                    try {
                      const { id } = await createTrack(data, token) as { id: number };
                      if (returnTo) { router.push(`${returnTo}?newTrackId=${id}`); return; }
                      setView("tracks"); loadTracks();
                    }
                    finally { setBusy(false); }
                  }}
                  busy={busy}
                  onCancel={() => { if (returnTo) { router.push(returnTo); return; } setView("tracks"); }}
                  userDisplayName={user.displayName}
                />
              </div>
            </div>
            {editingTrack && (
              <div className={`absolute inset-0 ${view === "edit-track" ? "pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                style={view === "edit-track" ? { animation: "listReveal 0.4s ease forwards" } : undefined}>
                <div className="w-full max-w-xl">
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
                </div>
              </div>
            )}
          </div>
        )}
        {(view === "albums" || view === "create-album" || view === "edit-album") && (
          <div className="relative min-h-full">
            <div className={`transition-all duration-500 ${view === "create-album" || view === "edit-album" ? "blur-sm pointer-events-none select-none" : ""}`}>
              <AlbumsView
                albums={albums}
                onEdit={(a) => { setEditingAlbum(a); setView("edit-album"); }}
                onDelete={handleDeleteAlbum}
                onCreate={() => setView("create-album")}
              />
            </div>
            <div className={`absolute inset-0 ${view === "create-album" ? "pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              style={view === "create-album" ? { animation: "listReveal 0.4s ease forwards" } : undefined}>
                <AlbumForm
                  onSubmit={async (data, selectedTrackIds) => {
                    if (!token) return;
                    setBusy(true);
                    try {
                      const album = await createAlbum(data, token);
                      if (selectedTrackIds?.length) {
                        await Promise.all(selectedTrackIds.map((id, i) => addTrackToAlbum(album.id, id, i + 1, token)));
                      }
                      setView("albums");
                      loadAlbums();
                    } catch (e) {
                      alert(`Failed to create album: ${e instanceof Error ? e.message : e}`);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  busy={busy}
                  onCancel={() => setView("albums")}
                  availableTracks={tracks}
                />
            </div>
            {editingAlbum && (
              <div className={`absolute inset-0 ${view === "edit-album" ? "pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                style={view === "edit-album" ? { animation: "listReveal 0.4s ease forwards" } : undefined}>
                <AlbumForm
                  initial={editingAlbum}
                  onSubmit={async (data) => {
                    if (!token) return;
                    setBusy(true);
                    try {
                      await updateAlbum(editingAlbum.id, data, token);
                      setView("albums");
                      loadAlbums();
                    } catch (e) {
                      alert(`Failed to save album: ${e instanceof Error ? e.message : e}`);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  busy={busy}
                  onCancel={() => setView("albums")}
                />
              </div>
            )}
          </div>
        )}

        {(view === "sessions" || view === "create-session" || view === "edit-session") && (
          <div className="relative min-h-full">
            <div className={`transition-all duration-500 ${view === "create-session" || view === "edit-session" ? "blur-sm pointer-events-none select-none" : ""}`}>
              <div className="space-y-1">
                {sessions.length === 0 && <p className="text-sm text-white/25">No sessions yet.</p>}
                {sessions.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 group">
                    <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5">
                      {ev.coverImageUrl && <Image src={ev.coverImageUrl} alt={ev.title} fill className="object-cover opacity-70" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{ev.title}</p>
                      <p className="text-xs text-white/35">{ev.status} · {new Date(ev.scheduledAt).toLocaleDateString()}{ev.trackCount > 0 ? ` · ${ev.trackCount} tracks` : ""}</p>
                    </div>
                    <div className="flex gap-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/studio/sessions/${ev.id}`} className="text-xs text-white/40 hover:text-white/70 transition-colors">View</Link>
                      <button onClick={() => {
                        setEditingSession(ev);
                        setSessionForm({ title: ev.title, description: ev.description ?? "", coverImageUrl: ev.coverImageUrl ?? "", scheduledAt: ev.scheduledAt.slice(0, 16) });
                        setView("edit-session");
                      }} className="text-xs text-white/40 hover:text-white/70 transition-colors">Edit</button>
                      <button onClick={() => handleDeleteSession(ev.id)} className="text-xs text-white/25 hover:text-red-400/70 transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setView("create-session")}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors mt-4">
                  + Add Session
                </button>
              </div>
            </div>
            <div className={`absolute inset-0 ${view === "create-session" ? "pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              style={view === "create-session" ? { animation: "listReveal 0.4s ease forwards" } : undefined}>
              <form onSubmit={handleCreateSession} className="space-y-5 max-w-xl">
                {(["title", "description"] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">{field}</label>
                    <input type="text" value={sessionForm[field]}
                      onChange={(e) => setSessionForm((p) => ({ ...p, [field]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Cover Image</label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input ref={coverRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
                      <button type="button" onClick={() => coverRef.current?.click()} disabled={sessionUploading}
                        className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/50 hover:border-white/25 hover:text-white/75 transition-colors text-left disabled:opacity-50">
                        {sessionUploading ? "Uploading…" : sessionForm.coverImageUrl ? "Change image…" : "Choose image file…"}
                      </button>
                    </div>
                    {sessionForm.coverImageUrl && (
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/5">
                        <Image src={sessionForm.coverImageUrl} alt="cover preview" fill className="object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Scheduled At</label>
                  <input type="datetime-local" value={sessionForm.scheduledAt}
                    onChange={(e) => setSessionForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors" />
                </div>
                {sessionError && <p className="text-sm text-red-400/80">{sessionError}</p>}
                <div className="flex gap-3">
                  <button type="submit" disabled={sessionBusy || sessionUploading}
                    className="bg-white text-black text-sm font-medium px-6 py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50">
                    {sessionBusy ? "Creating…" : "Create Session"}
                  </button>
                  <button type="button" onClick={() => setView("sessions")}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors px-4 py-3">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
            {editingSession && (
              <div className={`absolute inset-0 ${view === "edit-session" ? "pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                style={view === "edit-session" ? { animation: "listReveal 0.4s ease forwards" } : undefined}>
                <form onSubmit={handleUpdateSession} className="space-y-5 max-w-xl">
                  {(["title", "description"] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">{field}</label>
                      <input type="text" value={sessionForm[field]}
                        onChange={(e) => setSessionForm((p) => ({ ...p, [field]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Cover Image</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <input ref={coverRef} type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
                        <button type="button" onClick={() => coverRef.current?.click()} disabled={sessionUploading}
                          className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/50 hover:border-white/25 hover:text-white/75 transition-colors text-left disabled:opacity-50">
                          {sessionUploading ? "Uploading…" : sessionForm.coverImageUrl ? "Change image…" : "Choose image file…"}
                        </button>
                      </div>
                      {sessionForm.coverImageUrl && (
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/5">
                          <Image src={sessionForm.coverImageUrl} alt="cover preview" fill className="object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Scheduled At</label>
                    <input type="datetime-local" value={sessionForm.scheduledAt}
                      onChange={(e) => setSessionForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                      className="bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors" />
                  </div>
                  {sessionError && <p className="text-sm text-red-400/80">{sessionError}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={sessionBusy || sessionUploading}
                      className="bg-white text-black text-sm font-medium px-6 py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50">
                      {sessionBusy ? "Saving…" : "Save Session"}
                    </button>
                    <button type="button" onClick={() => { setView("sessions"); setEditingSession(null); }}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors px-4 py-3">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
        {view === "profile" && (
          <div style={{ animation: "listReveal 0.4s ease forwards" }}>
            <div className="mb-10">
              <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
              <div className="flex items-center gap-4 mb-10">
                <button type="button" onClick={() => avatarRef.current?.click()} disabled={profileUploading}
                  className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white/8 flex items-center justify-center text-sm text-white/40 hover:ring-2 hover:ring-white/20 transition-all group disabled:opacity-50">
                  {profileForm.avatarUrl ? (
                    <Image src={profileForm.avatarUrl} alt={user.displayName} fill className="object-cover" />
                  ) : (
                    <span>{user.displayName[0]?.toUpperCase()}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.94l-3 1 1-3a4 4 0 01.94-1.414z"/>
                    </svg>
                  </div>
                </button>
                <div>
                  <p className="text-lg font-light text-white/80">{user.displayName}</p>
                  <p className="text-xs text-white/30">@{user.username}</p>
                </div>
              </div>
              <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-sm">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">Display Name</label>
                  <input type="text" value={profileForm.displayName} required
                    onChange={(e) => setProfileForm((p) => ({ ...p, displayName: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-white/30 transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">Bio</label>
                  <textarea value={profileForm.bio} rows={3}
                    onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="A few words about yourself"
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-white/30 transition-colors resize-none" />
                </div>
                {profileError && <p className="text-sm text-red-400/70">{profileError}</p>}
                <button type="submit" disabled={profileSaving || profileUploading}
                  className="text-sm px-6 py-3 rounded bg-white text-black font-medium hover:bg-white/90 transition-all disabled:opacity-50">
                  {profileSaving ? "Saving…" : profileSaved ? "Saved ✓" : "Save changes"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
      </div>
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
      <div className="mt-8">
        <button onClick={onUpload} className="text-sm text-white/40 hover:text-white/70 transition-colors">
          + Upload Track
        </button>
      </div>
    </div>
  );
}

// ── Albums View ──────────────────────────────────────────────────────────────
function AlbumsView({ albums, onEdit, onDelete, onCreate }: {
  albums: Album[];
  onEdit: (a: Album) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
}) {
  return (
    <div>
      {albums.length === 0 ? (
        <p className="text-white/30 text-sm">No albums yet.</p>
      ) : (
        <div className="flex flex-wrap gap-6">
          {albums.map((a) => (
            <div key={a.id} className="group w-36">
              <div className="relative aspect-square rounded overflow-hidden mb-3 bg-white/5">
                {a.coverImageUrl && <Image src={a.coverImageUrl} alt={a.title} fill className="object-cover opacity-70" />}
              </div>
              <p className="text-sm text-white/75 truncate">{a.title}</p>
              <p className="text-xs text-white/30 mt-0.5">{new Date(a.releasedAt).getFullYear()}</p>
              <div className="flex gap-3 mt-2">
                <button onClick={() => onEdit(a)} className="text-xs text-white/35 hover:text-white/70 transition-colors">Edit</button>
                <button onClick={() => onDelete(a.id)} className="text-xs text-red-400/50 hover:text-red-400/80 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8">
        <button onClick={onCreate} className="text-sm text-white/40 hover:text-white/70 transition-colors">
          + Create Album
        </button>
      </div>
    </div>
  );
}

export default function MyMusicPage() {
  return (
    <Suspense>
      <MyMusicPageInner />
    </Suspense>
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
  const { token } = useAuth();
  const [form, setForm] = useState<Partial<Track>>(initial ?? {
    title: "", artist: userDisplayName, genre: "", duration: "", mood: "",
    audioUrl: "", coverImageUrl: "", description: "", story: "",
    storyBlocks: null,
    isFeatured: false, isPublished: false, publishedAt: new Date().toISOString(),
  });
  const [uploading, setUploading] = useState<{ image?: boolean; audio?: boolean }>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [audioDragging, setAudioDragging] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const set = (f: keyof Track) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleFileUpload = async (file: File, type: "image" | "audio") => {
    if (!token) return;
    setUploadError(null);
    setUploading((u) => ({ ...u, [type]: true }));
    try {
      const { url, duration } = await uploadFile(file, type, token);
      if (type === "image") {
        setForm((p) => ({ ...p, coverImageUrl: url }));
      } else {
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
        setForm((p) => ({
          ...p,
          audioUrl: url,
          ...(duration ? { duration } : {}),
          // Auto-fill title from filename only if title is still empty
          ...(p.title === "" ? { title: nameWithoutExt } : {}),
        }));
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading((u) => ({ ...u, [type]: false }));
    }
  };

  const isEditing = !!initial;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-light text-white/90 mb-8">{isEditing ? "Edit Track" : "Upload Track"}</h1>
      <div className="space-y-5">

        {/* Audio + Cover — side by side when uploading */}
        {!isEditing && (
          <div className="flex gap-4">
            {/* Audio drop zone */}
            <div className="flex-1">
              <input ref={audioRef} type="file" accept=".mp3,.wav,.flac,audio/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "audio"); }} />
              {form.audioUrl ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/10 bg-white/5">
                  <svg className="w-4 h-4 text-white/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                  <audio controls src={form.audioUrl as string} className="flex-1 h-8 opacity-70" />
                  <button type="button" onClick={() => audioRef.current?.click()}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors shrink-0">Replace</button>
                </div>
              ) : (
                <button type="button" onClick={() => audioRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setAudioDragging(true); }}
                  onDragLeave={() => setAudioDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setAudioDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f, "audio"); }}
                  disabled={uploading.audio}
                  className={`w-full border-2 border-dashed rounded-xl py-12 flex flex-col items-center gap-3 transition-colors ${audioDragging ? "border-white/40 bg-white/8" : "border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/5"} disabled:opacity-50`}>
                  {uploading.audio ? <span className="text-sm text-white/40">Uploading…</span> : (
                    <>
                      <svg className="w-8 h-8 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                      </svg>
                      <div className="text-center">
                        <p className="text-sm text-white/50">Drop audio file here</p>
                        <p className="text-xs text-white/25 mt-1">or click to browse · mp3, wav, flac</p>
                      </div>
                    </>
                  )}
                </button>
              )}
            </div>
            {/* Cover drop zone */}
            <div className="flex-1">
              <input ref={coverRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "image"); }} />
              {form.coverImageUrl ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="relative w-8 h-8 rounded overflow-hidden shrink-0">
                    <Image src={form.coverImageUrl as string} alt="cover" fill className="object-cover" />
                  </div>
                  <span className="text-sm text-white/50 flex-1">Cover uploaded</span>
                  <button type="button" onClick={() => coverRef.current?.click()}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors shrink-0">Replace</button>
                </div>
              ) : (
                <button type="button" onClick={() => coverRef.current?.click()} disabled={uploading.image}
                  className="w-full border-2 border-dashed rounded-xl py-12 flex flex-col items-center gap-3 transition-colors border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/5 disabled:opacity-50">
                  {uploading.image ? <span className="text-sm text-white/40">Uploading…</span> : (
                    <>
                      <svg className="w-8 h-8 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <div className="text-center">
                        <p className="text-sm text-white/50">Drop cover image here</p>
                        <p className="text-xs text-white/25 mt-1">or click to browse · jpg, png, webp</p>
                      </div>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Audio — edit mode only */}
        {isEditing && (
          <div>
            <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Audio</label>
            <audio controls src={form.audioUrl as string} className="w-full h-8 opacity-50" />
            <p className="text-xs text-white/20 mt-1.5">Audio cannot be changed after upload.</p>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Title</label>
          <input
            type="text"
            value={(form.title as string) ?? ""}
            onChange={set("title")}
            placeholder="Track title"
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors"
          />
        </div>

        {uploadError && (
          <p className="text-red-400/80 text-sm">{uploadError}</p>
        )}

        {/* Collapsible details */}
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${showDetails ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          {showDetails ? "Hide details" : "Add details"}
          <span className="text-white/15">· artist, genre, mood, description</span>
        </button>

        {showDetails && (
          <div className="space-y-4 pl-4 border-l border-white/8">
            {(isEditing ? (
              [
                { key: "artist" as keyof Track, label: "Artist" },
                { key: "genre" as keyof Track, label: "Genre" },
                { key: "mood" as keyof Track, label: "Mood tags", placeholder: "e.g. melancholic,late night" },
                { key: "description" as keyof Track, label: "Short description" },
              ]
            ) : (
              [
                { key: "artist" as keyof Track, label: "Artist" },
                { key: "genre" as keyof Track, label: "Genre" },
                { key: "mood" as keyof Track, label: "Mood tags", placeholder: "e.g. melancholic,late night" },
                { key: "description" as keyof Track, label: "Short description" },
              ]
            )).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs tracking-widest uppercase text-white/25 mb-1.5">{label}</label>
                <input
                  type="text"
                  value={(form[key] as string) ?? ""}
                  onChange={set(key)}
                  placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>
            ))}
            {isEditing && (
              <>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-white/25 mb-1.5">Liner Notes</label>
                  <textarea
                    value={(form.story as string) ?? ""}
                    onChange={set("story")}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors resize-none"
                  />
                </div>
                <div className="border-t border-white/8 pt-4">
                  <StoryBlockEditor
                    value={form.storyBlocks}
                    onChange={(json) => setForm((p) => ({ ...p, storyBlocks: json }))}
                    audioUrl={(form.audioUrl as string) ?? ""}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Published + Featured */}
        <div className="flex gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer">
            <input type="checkbox" checked={!!form.isPublished}
              onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
              className="accent-white" />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm text-white/35 cursor-pointer">
            <input type="checkbox" checked={!!form.isFeatured}
              onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
              className="accent-white" />
            Featured
          </label>
        </div>

        <div className="flex gap-4 pt-2">
          <button disabled={busy || !!uploading.image || !!uploading.audio} onClick={() => onSubmit(form)}
            className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded hover:bg-white/90 transition-colors disabled:opacity-50">
            {busy ? "Saving…" : isEditing ? "Save changes" : "Upload"}
          </button>
          <button onClick={onCancel} className="text-sm text-white/40 hover:text-white/70 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Album Form ────────────────────────────────────────────────────────────────
function AlbumForm({ initial, onSubmit, busy, onCancel, availableTracks }: {
  initial?: Album;
  onSubmit: (data: Partial<Album>, selectedTrackIds?: number[]) => void;
  busy: boolean;
  onCancel: () => void;
  availableTracks?: Track[];
}) {
  const { token } = useAuth();
  const isCreate = !initial;
  const [step, setStep] = useState<"details" | "tracks">(isCreate ? "tracks" : "details");
  const [form, setForm] = useState<Partial<Album>>(initial ?? {
    title: "", coverImageUrl: "", description: "",
    releasedAt: new Date().toISOString().slice(0, 10), isPublished: false,
  });
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [albumTracks, setAlbumTracks] = useState<AlbumTrackDto[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!initial?.id || !token) return;
    getAlbum(initial.id).then((a) => setAlbumTracks([...a.tracks].sort((x, y) => x.trackNumber - y.trackNumber)));
  }, [initial?.id, token]);

  const set = (f: keyof Album) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleCoverUpload = async (file: File) => {
    if (!token) return;
    setUploadError(null); setUploadingCover(true);
    try {
      const { url } = await uploadFile(file, "image", token);
      setForm((p) => ({ ...p, coverImageUrl: url }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploadingCover(false); }
  };

  const handleDrop = async (overIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === overIndex) return;
    const reordered = [...albumTracks];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(overIndex, 0, moved);
    const withNumbers = reordered.map((t, i) => ({ ...t, trackNumber: i + 1 }));
    setAlbumTracks(withNumbers);
    dragIndex.current = null;
    if (!initial?.id || !token) return;
    await reorderAlbumTracks(initial.id, withNumbers.map((t) => ({ trackId: t.trackId, trackNumber: t.trackNumber })), token);
  };

  const handleRemoveTrack = async (trackId: number) => {
    if (!initial?.id || !token) return;
    await removeTrackFromAlbum(initial.id, trackId, token);
    setAlbumTracks((prev) => prev.filter((t) => t.trackId !== trackId).map((t, i) => ({ ...t, trackNumber: i + 1 })));
  };

  const toggleTrack = (id: number) =>
    setSelectedTrackIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="max-w-xl">
      {isCreate && (
        <div className="flex items-center gap-2 mb-8">
          <span className={`text-xs tracking-widest uppercase transition-colors ${step === "tracks" ? "text-white/60" : "text-white/20"}`}>Tracks</span>
          <span className="text-white/15">—</span>
          <span className={`text-xs tracking-widest uppercase transition-colors ${step === "details" ? "text-white/60" : "text-white/20"}`}>Details</span>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-5" style={{ animation: "listReveal 0.35s ease forwards" }}>
          <div>
            <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Title</label>
            <input type="text" value={form.title ?? ""} onChange={set("title")}
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors" />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Cover Image</label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input ref={coverRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
                <button type="button" onClick={() => coverRef.current?.click()} disabled={uploadingCover}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/50 hover:border-white/25 hover:text-white/75 transition-colors text-left disabled:opacity-50">
                  {uploadingCover ? "Uploading…" : "Choose image file…"}
                </button>
              </div>
              {form.coverImageUrl && (
                <div className="relative w-14 h-14 rounded overflow-hidden shrink-0 bg-white/5">
                  <Image src={form.coverImageUrl} alt="cover preview" fill className="object-cover" />
                </div>
              )}
            </div>
            {uploadError && <p className="text-red-400/80 text-sm mt-1">{uploadError}</p>}
          </div>
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
          {/* Selected tracks — create mode */}
          {isCreate && selectedTrackIds.length > 0 && (
            <div className="border-t border-white/8 pt-4">
              <p className="text-xs tracking-widest uppercase text-white/30 mb-3">Selected tracks</p>
              <div className="space-y-1">
                {selectedTrackIds.map((id, i) => {
                  const t = (availableTracks ?? []).find((x) => x.id === id);
                  if (!t) return null;
                  return (
                    <div key={id} draggable
                      onDragStart={() => { dragIndex.current = i; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex.current === null || dragIndex.current === i) return;
                        const next = [...selectedTrackIds];
                        const [moved] = next.splice(dragIndex.current, 1);
                        next.splice(i, 0, moved);
                        setSelectedTrackIds(next);
                        dragIndex.current = null;
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 group cursor-grab active:cursor-grabbing">
                      <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="3" y="3" width="2" height="2" rx="1"/><rect x="3" y="7" width="2" height="2" rx="1"/><rect x="3" y="11" width="2" height="2" rx="1"/>
                        <rect x="7" y="3" width="2" height="2" rx="1"/><rect x="7" y="7" width="2" height="2" rx="1"/><rect x="7" y="11" width="2" height="2" rx="1"/>
                        <rect x="11" y="3" width="2" height="2" rx="1"/><rect x="11" y="7" width="2" height="2" rx="1"/><rect x="11" y="11" width="2" height="2" rx="1"/>
                      </svg>
                      <span className="w-5 text-xs text-white/25 text-right shrink-0">{i + 1}</span>
                      <div className="relative w-8 h-8 rounded overflow-hidden shrink-0 bg-white/5">
                        {t.coverImageUrl && <Image src={t.coverImageUrl} alt={t.title} fill className="object-cover opacity-70" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/75 truncate">{t.title}</p>
                        <p className="text-xs text-white/30">{t.artist}</p>
                      </div>
                      <button onClick={() => setSelectedTrackIds((prev) => prev.filter((x) => x !== id))}
                        className="text-xs text-red-400/40 hover:text-red-400/80 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Track list — edit mode */}
          {initial && albumTracks.length > 0 && (
            <div className="pt-2 pb-2 border-t border-white/8">
              <p className="text-xs tracking-widest uppercase text-white/30 mb-4 pt-4">Tracks</p>
              <div className="space-y-1">
                {albumTracks.map((t, i) => (
                  <div key={t.trackId} draggable
                    onDragStart={() => { dragIndex.current = i; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(i)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 group cursor-grab active:cursor-grabbing">
                    <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="3" y="3" width="2" height="2" rx="1"/><rect x="3" y="7" width="2" height="2" rx="1"/><rect x="3" y="11" width="2" height="2" rx="1"/>
                      <rect x="7" y="3" width="2" height="2" rx="1"/><rect x="7" y="7" width="2" height="2" rx="1"/><rect x="7" y="11" width="2" height="2" rx="1"/>
                      <rect x="11" y="3" width="2" height="2" rx="1"/><rect x="11" y="7" width="2" height="2" rx="1"/><rect x="11" y="11" width="2" height="2" rx="1"/>
                    </svg>
                    <span className="w-5 text-xs text-white/25 text-right shrink-0">{t.trackNumber}</span>
                    <div className="relative w-8 h-8 rounded overflow-hidden shrink-0 bg-white/5">
                      {t.coverImageUrl && <Image src={t.coverImageUrl} alt={t.title} fill className="object-cover opacity-70" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/75 truncate">{t.title}</p>
                      <p className="text-xs text-white/30">{t.artist}</p>
                    </div>
                    <button onClick={() => handleRemoveTrack(t.trackId)}
                      className="text-xs text-red-400/40 hover:text-red-400/80 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-4 pt-2">
            {isCreate ? (
              <button disabled={!form.title || uploadingCover || busy} onClick={() => onSubmit(form, selectedTrackIds)}
                className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded hover:bg-white/90 transition-colors disabled:opacity-50">
                {busy ? "Creating…" : "Create Album"}
              </button>
            ) : (
              <button disabled={busy || uploadingCover} onClick={() => onSubmit(form)}
                className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded hover:bg-white/90 transition-colors disabled:opacity-50">
                {busy ? "Saving…" : "Save changes"}
              </button>
            )}
            {isCreate
              ? <button onClick={() => setStep("tracks")} className="text-sm text-white/40 hover:text-white/70 transition-colors">← Back</button>
              : <button onClick={onCancel} className="text-sm text-white/40 hover:text-white/70 transition-colors">Cancel</button>
            }
          </div>
        </div>
      )}

      {step === "tracks" && isCreate && (
        <div style={{ animation: "listReveal 0.35s ease forwards" }}>
          <p className="text-xs tracking-widest uppercase text-white/30 mb-5">Select tracks</p>
          <div className="space-y-1 mb-8">
            {(availableTracks ?? []).length === 0 && (
              <p className="text-sm text-white/25">No tracks uploaded yet.</p>
            )}
            {(availableTracks ?? []).map((t) => {
              const selected = selectedTrackIds.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => toggleTrack(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${selected ? "bg-white/8" : "hover:bg-white/5"}`}>
                  <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${selected ? "border-white/60 bg-white/20" : "border-white/15"}`}>
                    {selected && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 6 5 9 10 3"/></svg>}
                  </div>
                  <div className="relative w-8 h-8 rounded overflow-hidden shrink-0 bg-white/5">
                    {t.coverImageUrl && <Image src={t.coverImageUrl} alt={t.title} fill className="object-cover opacity-70" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/75 truncate">{t.title}</p>
                    <p className="text-xs text-white/30">{t.artist}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-4">
            <button onClick={() => setStep("details")}
              className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded hover:bg-white/90 transition-colors">
              Next →
            </button>
            <button onClick={onCancel} className="text-sm text-white/40 hover:text-white/70 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Studio home ──────────────────────────────────────────────────────────────
const TIME_SAYINGS: { from: number; to: number; saying: string }[] = [
  { from: 0,  to: 4,  saying: "the dead hours" },
  { from: 4,  to: 6,  saying: "before the light" },
  { from: 6,  to: 9,  saying: "early light" },
  { from: 9,  to: 11, saying: "the working hours" },
  { from: 11, to: 13, saying: "the still point" },
  { from: 13, to: 15, saying: "the long afternoon" },
  { from: 15, to: 17, saying: "the slow burn" },
  { from: 17, to: 19, saying: "when the light goes sideways" },
  { from: 19, to: 21, saying: "when the city exhales" },
  { from: 21, to: 23, saying: "the night shift" },
  { from: 23, to: 24, saying: "on the edge of tomorrow" },
];

function getTimeSaying(h: number) {
  return TIME_SAYINGS.find((s) => h >= s.from && h < s.to)?.saying ?? "";
}

function StudioHome({ tracks, albums, sessions, onNavigate }: {
  tracks: Track[]; albums: Album[]; sessions: LiveEvent[];
  onNavigate: (v: "tracks" | "albums" | "sessions") => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const saying = getTimeSaying(h);
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="pt-0 select-none">
      <p className="text-[10px] tracking-[0.3em] uppercase text-white/35 mb-1">{dateStr}</p>
      <p className="font-mono text-3xl text-white/50 mb-1 tracking-tight">{timeStr}</p>
      <p className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-20">{saying}</p>
      <div className="space-y-px">
        {([
          { num: String(tracks.length).padStart(2, "0"), label: "tracks", action: () => onNavigate("tracks") },
          { num: String(albums.length).padStart(2, "0"), label: "albums", action: () => onNavigate("albums") },
          { num: String(sessions.length).padStart(2, "0"), label: "sessions", action: () => onNavigate("sessions") },
        ] as const).map(({ num, label, action }) => (
          <button key={label} onClick={action}
            className="flex items-baseline gap-5 w-full group py-2 text-left">
            <span className="text-xs font-mono text-white/30 group-hover:text-white/60 transition-colors duration-300 w-6 shrink-0">{num}</span>
            <span className="text-sm tracking-widest uppercase text-white/40 group-hover:text-white/80 transition-colors duration-300">{label}</span>
          </button>
        ))}
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
