// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type Role = "attendee" | "organizer" | "admin";
type User = { id: string; email: string; role: Role } | null;

type AuthContextType = {
  user: User;
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

const API_BASE = import.meta.env.VITE_API_BASE;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const saveLocal = (u: User) => {
    if (u) localStorage.setItem("cj_user", JSON.stringify(u));
    else localStorage.removeItem("cj_user");
  };

  const hydrate = async () => {
    setLoading(true);
    try {
      // If you expose a session endpoint, use it here:
      // const res = await fetch(`${API_BASE}/api/testAuth/me`, { credentials: "include" });
      // if (res.ok) {
      //   const data = await res.json();
      //   setUser(data?.user ?? null);
      //   saveLocal(data?.user ?? null);
      //   return;
      // }
      // Fallback: use localStorage snapshot
      const raw = localStorage.getItem("cj_user");
      setUser(raw ? (JSON.parse(raw) as User) : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  const register: AuthContextType["register"] = async (p) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Registration failed");
    }
    // After register, user is not logged in; redirect to /login
  };

  const login: AuthContextType["login"] = async (p) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Login failed");
    }
    const data = await res.json(); // { user: { id, email, role } }
    setUser(data.user);
    saveLocal(data.user);
  };

  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    setUser(null);
    saveLocal(null);
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
