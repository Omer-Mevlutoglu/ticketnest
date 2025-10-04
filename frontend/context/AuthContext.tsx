import React, { createContext, useContext, useEffect, useState } from "react";

/** Reuse this type in RoleRoute etc. */
export type Role = "attendee" | "organizer" | "admin";

/** What we store in context/localStorage */
export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  /** Organizer-only gate; backend now returns this */
  isApproved?: boolean;
  /** Optional if your backend includes it */
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

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  const saveLocal = (u: AuthUser) => {
    if (u) localStorage.setItem("cj_user", JSON.stringify(u));
    else localStorage.removeItem("cj_user");
  };

  const hydrate = async () => {
    setLoading(true);
    try {
      // If you expose a session endpoint, prefer it:
      // const res = await fetch(`${API_BASE}/api/testAuth/me`, { credentials: "include" });
      // if (res.ok) {
      //   const data = await res.json();
      //   const u: AuthUser = data?.user
      //     ? {
      //         id: data.user.id,
      //         email: data.user.email,
      //         role: data.user.role,
      //         isApproved: data.user.isApproved,
      //         username: data.user.username,
      //       }
      //     : null;
      //   setUser(u);
      //   saveLocal(u);
      //   return;
      // }

      // Fallback: use last known snapshot
      const raw = localStorage.getItem("cj_user");
      setUser(raw ? (JSON.parse(raw) as AuthUser) : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // After register, user is not auto-logged-in; keep as-is
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
    const data = await res.json();
    // Normalize to AuthUser shape
    const u: AuthUser = data?.user
      ? {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          isApproved: data.user.isApproved, // ✅ now captured
          username: data.user.username, // if present
        }
      : null;

    setUser(u);
    saveLocal(u);
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
