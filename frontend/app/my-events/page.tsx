"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getEvents, createEvent, deleteEvent } from "@/lib/api";
import { LiveEvent } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function uploadImage(file: File, token: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = await res.json();
  return url;
}

export default function MyEventsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [tab, setTab] = useState<"list" | "create">("list");
  const [form, setForm] = useState({ title: "", description: "", coverImageUrl: "", scheduledAt: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (file: File) => {
    if (!token) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, token);
      setForm((p) => ({ ...p, coverImageUrl: url }));
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (token) getEvents().then((all) => setEvents(all.filter((e) => e.hostId === user?.id))).catch(() => {});
  }, [token, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true); setError("");
    try {
      await createEvent({ ...form, scheduledAt: new Date(form.scheduledAt).toISOString() }, token);
      setTab("list");
      const all = await getEvents();
      setEvents(all.filter((ev) => ev.hostId === user?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm("Delete this event?")) return;
    await deleteEvent(id, token);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading || !user) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="mb-10">
        <p className="text-xs tracking-widest uppercase text-white/30 mb-4">Management</p>
        <h1 className="text-3xl font-light text-white/90">My Events</h1>
      </div>

      <div className="flex gap-1 mb-10 border-b border-white/8 pb-0">
        {(["list", "create"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${tab === t ? "border-white/60 text-white/80" : "border-transparent text-white/30 hover:text-white/60"}`}>
            {t === "list" ? "My Events" : "Create Event"}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="space-y-4">
          {events.length === 0 && <p className="text-sm text-white/25">No events yet.</p>}
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
              {ev.coverImageUrl && (
                <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/5">
                  <Image src={ev.coverImageUrl} alt={ev.title} fill className="object-cover opacity-70" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{ev.title}</p>
                <p className="text-xs text-white/30 mt-0.5">{ev.status} · {new Date(ev.scheduledAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/events/${ev.id}`} className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 border border-white/10 rounded">
                  View
                </Link>
                <button onClick={() => handleDelete(ev.id)} className="text-xs text-white/25 hover:text-red-400/70 transition-colors px-3 py-1.5 border border-white/8 rounded">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <form onSubmit={handleCreate} className="space-y-5 max-w-xl">
          {[
            ["Title", "title", "text"],
            ["Description", "description", "text"],
          ].map(([label, field, type]) => (
            <div key={field}>
              <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">{label}</label>
              <input type={type} value={(form as Record<string, string>)[field]}
                onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors" />
            </div>
          ))}
          <div>
            <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Cover Image</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input ref={coverRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
                <button type="button" onClick={() => coverRef.current?.click()} disabled={uploading}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/50 hover:border-white/25 hover:text-white/75 transition-colors text-left disabled:opacity-50">
                  {uploading ? "Uploading…" : "Choose image file…"}
                </button>
              </div>
              {form.coverImageUrl && (
                <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/5">
                  <Image src={form.coverImageUrl} alt="cover preview" fill className="object-cover" />
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-white/30 mb-2">Scheduled At</label>
            <input type="datetime-local" value={form.scheduledAt}
              onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors" />
          </div>
          {error && <p className="text-sm text-red-400/80">{error}</p>}
          <button type="submit" disabled={busy || uploading}
            className="bg-white text-black text-sm font-medium px-6 py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50">
            {busy ? "Creating…" : "Create Event"}
          </button>
        </form>
      )}
    </div>
  );
}
