import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGet, apiPost, isApiError, resetCsrfToken } from "@/lib/api";

export type Role = "attendee" | "organizer" | "admin" | undefined; // Allow undefined

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  isApproved?: boolean;
  username?: string;
  mustChangePassword?: boolean;
} | null;

type MeResponse = { user: NonNullable<AuthUser> | null };

/**
 * What signup should do next.
 *
 * When the server has email switched off it verifies the account immediately,
 * so there is no inbox to send the user to.
 */
export type RegisterResult = { verificationEmailSent: boolean };

type AuthContextType = {
  user: AuthUser;
  loading: boolean;
  register: (p: {
    username: string;
    email: string;
    password: string;
    role: "attendee" | "organizer";
  }) => Promise<RegisterResult>;
  login: (p: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: (opts?: { silent?: boolean }) => Promise<AuthUser | undefined>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "tn_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true); // only for initial boot

  const saveLocal = (u: AuthUser) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  // server-first hydrate; support silent mode
  const hydrate = async (opts?: { silent?: boolean }) => {
    // A silent re-hydrate (on window focus, after login) must not flip the
    // whole app back to its loading state.
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);

    let u: AuthUser = null;
    try {
      const data = await apiGet<MeResponse>("/api/auth/me");
      u = data?.user ?? null;
      setUser(u);
      saveLocal(u);
    } catch (err) {
      if (isApiError(err)) {
        // A 401 is the normal answer for a signed-out visitor.
        setUser(null);
        saveLocal(null);
      } else {
        // Network failure — fall back to the last known user rather than
        // bouncing someone out of the app because their wifi dropped.
        const raw = localStorage.getItem(STORAGE_KEY);
        u = raw ? (JSON.parse(raw) as AuthUser) : null;
        setUser(u);
      }
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
      if (e.key === STORAGE_KEY)
        setUser(e.newValue ? (JSON.parse(e.newValue) as AuthUser) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register: AuthContextType["register"] = async (p) => {
    const res = await apiPost<{ user?: { verificationEmailSent?: boolean } }>(
      "/api/auth/register",
      p
    );
    return {
      verificationEmailSent: res?.user?.verificationEmailSent === true,
    };
  };

  const login: AuthContextType["login"] = async (p) => {
    await apiPost("/api/auth/login", p);

    // Login issues a fresh session ID, so any CSRF token bound to the previous
    // session is now stale.
    resetCsrfToken();
    await hydrate({ silent: true });
  };

  const logout = async () => {
    try {
      await apiPost("/api/auth/logout");
    } catch {
      // Sign out locally even if the server call fails.
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
