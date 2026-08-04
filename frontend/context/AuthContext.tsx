import React, { createContext, useContext, useEffect, useState } from "react";
import { resetCsrfToken } from "../src/lib/csrf";

export type Role = "attendee" | "organizer" | "admin" | undefined; // Allow undefined

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
  hydrate: (opts?: { silent?: boolean }) => Promise<AuthUser | undefined>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true); // only for initial boot

  const saveLocal = (u: AuthUser) => {
    if (u) localStorage.setItem("tn_user", JSON.stringify(u));
    else localStorage.removeItem("tn_user");
  };

  // server-first hydrate; support silent mode
  const hydrate = async (opts?: { silent?: boolean }) => {
    // A silent re-hydrate (on window focus, after login) must not flip the
    // whole app back to its loading state.
    const silent = !!opts?.silent;

    if (!silent) setLoading(true);

    let u: AuthUser = null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        u = data?.user
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
      } else {
        // Handle 401 etc.
        setUser(null);
        saveLocal(null);
      }
    } catch {
      // offline fallback
      const raw = localStorage.getItem("tn_user");
      u = raw ? (JSON.parse(raw) as AuthUser) : null;
      setUser(u);
    } finally {
      if (!silent) setLoading(false);
    }
    return u;
  };

  useEffect(() => {
    hydrate();
    const onFocus = () => hydrate({ silent: true });
    window.addEventListener("focus", onFocus);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tn_user")
        setUser(e.newValue ? (JSON.parse(e.newValue) as AuthUser) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Extracts the server's message, whatever shape the response took. */
  const parseError = async (res: Response, fallback: string): Promise<never> => {
    const asJson = res.clone();
    const asText = res.clone();

    let message = fallback;
    try {
      const data = await asJson.json();
      message = data?.message || data?.error || (await asText.text()) || fallback;
    } catch {
      try {
        message = (await asText.text()) || fallback;
      } catch {
        // Keep the fallback.
      }
    }

    throw new Error(message);
  };

  const register: AuthContextType["register"] = async (p) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) await parseError(res, "Registration failed");
  };

  const login: AuthContextType["login"] = async (p) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) await parseError(res, "Login failed");

    // Login issues a fresh session ID, so any CSRF token bound to the previous
    // session is now stale.
    resetCsrfToken();
    await hydrate({ silent: true });
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      resetCsrfToken();
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
