"use client";

import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function uploadImage(file: File, token: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const { url } = await res.json();
  return url;
}

export default function ProfilePage() {
  const { user, token, loading, updateProfile } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", bio: "", avatarUrl: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (file: File) => {
    if (!token) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file, token);
      setForm((p) => ({ ...p, avatarUrl: url }));
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const [seededUserId, setSeededUserId] = useState<string | null>(null);
  if (user && user.id !== seededUserId) {
    setSeededUserId(user.id);
    setForm({ displayName: user.displayName, bio: user.bio ?? "", avatarUrl: user.avatarUrl ?? "" });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-3">Profile</p>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => avatarRef.current?.click()} disabled={uploading}
            className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white/8 flex items-center justify-center text-sm text-white/40 hover:ring-2 hover:ring-white/20 transition-all group disabled:opacity-50">
            {form.avatarUrl ? (
              <Image src={form.avatarUrl} alt={user.displayName} fill className="object-cover" />
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
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">Display Name</label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
            required
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-white/30 transition-colors resize-none"
            placeholder="A few words about yourself"
          />
        </div>

        <input ref={avatarRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }} />

        {error && <p className="text-sm text-red-400/70">{error}</p>}

        <button
          type="submit"
          disabled={saving || uploading}
          className="text-sm px-6 py-3 rounded bg-white text-black font-medium hover:bg-white/90 transition-all disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
