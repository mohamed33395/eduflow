"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AppUser } from "@/app/types";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function storeUserLocal(u: AppUser) {
  if (typeof window === "undefined") return;
  if (u.centerId) localStorage.setItem("centerId", u.centerId);
  else localStorage.removeItem("centerId");
  if (u.courseId) localStorage.setItem("courseId", u.courseId);
  else localStorage.removeItem("courseId");
  localStorage.setItem("role", u.role);
}

function clearUserLocal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("centerId");
  localStorage.removeItem("courseId");
  localStorage.removeItem("role");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // hydrate the session once on mount from the httpOnly cookies
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/user", { credentials: "include", cache: "no-store" })
      .then(async (res) => (res.ok ? ((await res.json()) as AppUser) : null))
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        if (u) storeUserLocal(u);
        else clearUserLocal();
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(
        (data as { error?: string }).error ?? "Login failed"
      ) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const u = (data as { user: AppUser }).user;
    setUser(u);
    storeUserLocal(u);
    return u;
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "include",
    }).catch(() => null);
    setUser(null);
    clearUserLocal();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
