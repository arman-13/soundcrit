import { createContext, useContext, useEffect, useState } from "react";
import { UserDto } from "@/types";
import { API_URL } from "@/lib/api";
import { getToken, setToken as persistToken, deleteToken } from "@/lib/tokenStore";

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

  useEffect(() => {
    (async () => {
      const stored = await getToken();
      if (!stored) { setLoading(false); return; }
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (!res.ok) throw new Error();
        const u: UserDto = await res.json();
        setToken(stored);
        setUser(u);
      } catch {
        await deleteToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSession = async (newToken: string, newUser: UserDto) => {
    await persistToken(newToken);
    setToken(newToken);
    setUser(newUser);
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
    const { token: newToken, user: newUser } = await res.json();
    await saveSession(newToken, newUser);
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
    const { token: newToken, user: newUser } = await res.json();
    await saveSession(newToken, newUser);
  };

  const logout = () => {
    deleteToken();
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
