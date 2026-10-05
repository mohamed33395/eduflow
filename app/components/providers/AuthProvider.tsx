"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import type { AppUser } from "@/app/types";

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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

function buildFallbackUser(fbUser: User): AppUser {
  const role =
    typeof window !== "undefined"
      ? (localStorage.getItem("role") as AppUser["role"] | null)
      : null;
  return {
    uid: fbUser.uid,
    name: fbUser.displayName ?? "",
    email: fbUser.email ?? "",
    role: role ?? "student",
    centerId:
      typeof window !== "undefined"
        ? localStorage.getItem("centerId") ?? undefined
        : undefined,
    courseId:
      typeof window !== "undefined"
        ? localStorage.getItem("courseId") ?? undefined
        : undefined,
    avatarUrl: fbUser.photoURL ?? undefined,
    createdAt: fbUser.metadata.creationTime ?? "",
  };
}

async function loadUserFromApi(): Promise<AppUser | null> {
  try {
    const res = await fetch("/api/auth/user", { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as AppUser;
  } catch (err) {
    console.warn("[AuthProvider] failed to load user from API:", err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const signingInRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (signingInRef.current) return;

    if (!firebaseUser) {
      setUser(null);
      clearUserLocal();
      setLoading(false);
      return;
    }

    setLoading(true);
    loadUserFromApi()
      .then((u) => {
        if (u) {
          setUser(u);
          storeUserLocal(u);
        } else {
          setUser(buildFallbackUser(firebaseUser));
        }
      })
      .catch(() => setUser(buildFallbackUser(firebaseUser)))
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    signingInRef.current = true;
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      setFirebaseUser(cred.user);
      const u = await loadUserFromApi();
      if (u) {
        setUser(u);
        storeUserLocal(u);
      } else {
        setUser(buildFallbackUser(cred.user));
      }
    } finally {
      signingInRef.current = false;
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "include",
    });
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setUser(null);
    clearUserLocal();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
