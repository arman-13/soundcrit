"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await register(form.email, form.username, form.displayName, form.password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; type: string; placeholder: string }[] = [
    { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
    { key: "username", label: "Username", type: "text", placeholder: "yourhandle" },
    { key: "displayName", label: "Display Name", type: "text", placeholder: "Your Name" },
    { key: "password", label: "Password", type: "password", placeholder: "Min 6 characters" },
    { key: "confirm", label: "Confirm Password", type: "password", placeholder: "••••••••" },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-2xl font-light text-white/90 mb-2">Create an account</h1>
          <p className="text-sm text-white/40">Join the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs tracking-widest uppercase text-white/35 mb-2">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={set(key)}
                required
                className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
                placeholder={placeholder}
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-400/80">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black text-sm font-medium py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-sm text-white/35 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-white/60 hover:text-white transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
