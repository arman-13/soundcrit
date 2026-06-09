"use client";

import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, loading, updateProfile } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", bio: "", avatarUrl: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) setForm({ displayName: user.displayName, bio: user.bio ?? "", avatarUrl: user.avatarUrl ?? "" });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <div className="mb-12">
        <p className="text-xs tracking-widest uppercase text-white/30 mb-4">Account</p>
        <h1 className="text-3xl font-light text-white/90">Your Profile</h1>
      </div>

      {/* Current info */}
      <div className="flex items-center gap-5 mb-12 p-6 rounded-lg border border-white/8 bg-white/[0.02]">
        {user.avatarUrl ? (
          <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0">
            <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl text-white/50 shrink-0">
            {user.displayName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-base font-medium text-white/90">{user.displayName}</p>
          <p className="text-sm text-white/40">@{user.username}</p>
          <p className="text-xs text-white/25 mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs tracking-widest uppercase text-white/35 mb-2">Display Name</label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
            required
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-white/35 mb-2">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-white/30 transition-colors resize-none"
            placeholder="Tell us a bit about yourself"
          />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-white/35 mb-2">Avatar URL</label>
          <input
            type="url"
            value={form.avatarUrl}
            onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-white/30 transition-colors"
            placeholder="https://..."
          />
        </div>

        {error && <p className="text-sm text-red-400/80">{error}</p>}
        {saved && <p className="text-sm text-green-400/80">Profile updated.</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-white text-black text-sm font-medium px-6 py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
