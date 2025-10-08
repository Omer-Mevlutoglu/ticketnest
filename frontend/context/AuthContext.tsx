import React, { createContext, useContext, useEffect, useState } from "react";

export type Role = "attendee" | "organizer" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  isApproved?: boolean;
  username?: string;
} | null;

type AuthContextType = {
  user: AuthUser;
  loading: boolean;
  register: (p: {
    username: string;
    email: string;
    password: string;
    role: "attendee" | "organizer";
  }) => Promise<void>;
  login: (p: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";
const LS_KEY = "cj_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  const saveLocal = (u: AuthUser) =>
    u
      ? localStorage.setItem(LS_KEY, JSON.stringify(u))
      : localStorage.removeItem(LS_KEY);

  // Server-first hydrate; fallback to local only on network errors
  const hydrate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/testAuth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const u: AuthUser = data?.user
          ? {
              id: data.user.id,
              email: data.user.email,
              role: data.user.role,
              isApproved: data.user.isApproved,
              username: data.user.username,
            }
          : null;
        setUser(u);
        saveLocal(u);
      } else if (res.status === 401) {
        setUser(null);
        saveLocal(null);
      } else {
        // Non-401 error: treat as unauth
        setUser(null);
        saveLocal(null);
      }
    } catch {
      // Network error → offline fallback
      const raw = localStorage.getItem(LS_KEY);
      setUser(raw ? (JSON.parse(raw) as AuthUser) : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
    // Optional niceties:
    const onFocus = () => hydrate(); // refresh on tab focus
    window.addEventListener("focus", onFocus);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY)
        setUser(e.newValue ? (JSON.parse(e.newValue) as AuthUser) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      throw new Error(data?.message || fallback);
    } catch {
      const text = await res.text();
      throw new Error(text || fallback);
    }
  };

  const register: AuthContextType["register"] = async (p) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) await parseError(res, "Registration failed");
    // no auto-login by design
  };

  const login: AuthContextType["login"] = async (p) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) await parseError(res, "Login failed");

    // After login, hydrate from server to ensure truth
    await hydrate();
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      saveLocal(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, register, login, logout, hydrate }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
