"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { UserDto } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, displayName: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { displayName: string; bio?: string; avatarUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load. Every state update happens in an async continuation
  // so the effect never triggers a synchronous cascading render.
  useEffect(() => {
    let cancelled = false;
    const stored = localStorage.getItem("token");

    const restore = stored
      ? fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })
          .then(async (r) => {
            if (r.ok) return (await r.json()) as UserDto;
            // Only a definitive rejection from the server invalidates the stored
            // token. Network failures must not silently sign the user out.
            if (r.status === 401 || r.status === 403) localStorage.removeItem("token");
            throw new Error(`auth/me failed: ${r.status}`);
          })
          .then((u) => { if (!cancelled) { setToken(stored); setUser(u); } })
          .catch(() => {})
      : Promise.resolve();

    restore.then(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const saveSession = (token: string, user: UserDto) => {
    localStorage.setItem("token", token);
    setToken(token);
    setUser(user);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "Login failed");
    }
    const { token, user } = await res.json();
    saveSession(token, user);
  };

  const register = async (email: string, username: string, displayName: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, displayName, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const msg = Array.isArray(data) ? data.join(", ") : "Registration failed";
      throw new Error(msg);
    }
    const { token, user } = await res.json();
    saveSession(token, user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { displayName: string; bio?: string; avatarUrl?: string }) => {
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Update failed");
    const updated: UserDto = await res.json();
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
