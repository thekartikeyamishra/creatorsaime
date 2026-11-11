"use client";

import { onIdTokenChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { api, ApiClientError } from "./api";
import type { Me } from "./types";

type AuthState = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  me: Me | null;
  meError: string | null;
  refreshMe: () => Promise<Me | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isFirebaseClientConfigured);

  const refreshMe = useCallback(async () => {
    try {
      const data = await api<Me>("/api/me");
      setMe(data);
      setMeError(null);
      return data;
    } catch (e) {
      setMe(null);
      setMeError(e instanceof ApiClientError ? (e.status >= 500 ? `We couldn't load your account right now (${e.code}). Please try again in a minute.` : e.message) : "Could not load your account. Check your connection and try again.");
      return null;
    }
  }, []);

  useEffect(() => {
    const auth = clientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    let lastUid: string | null = null;
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        lastUid = null;
        setMe(null);
        setLoading(false);
        return;
      }
      if (u.uid !== lastUid) {
        lastUid = u.uid;
        setLoading(true);
        await refreshMe();
        setLoading(false);
      }
    });
  }, [refreshMe]);

  const signOut = useCallback(async () => {
    const auth = clientAuth();
    if (auth) await fbSignOut(auth);
    setMe(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ configured: isFirebaseClientConfigured, loading, user, me, meError, refreshMe, signOut }),
    [loading, user, me, meError, refreshMe, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
