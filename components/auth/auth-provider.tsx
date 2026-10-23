"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AuthUserSummary, LoginRequest } from "@/types/api";
import { login as loginRequest } from "@/services/auth";
import { refreshSession } from "@/services/api";
import {
  clearSession,
  getActiveBusinessSnapshot,
  getSessionSnapshot,
  loadActiveBusiness,
  loadSession,
  parseActiveBusiness,
  parseStoredSession,
  saveActiveBusiness,
  saveSession,
  subscribeAuthStore,
  toStoredSession,
  updateStoredUser,
  type ActiveBusiness,
  type StoredSession,
} from "@/lib/auth/storage";

interface AuthContextValue {
  session: StoredSession | null;
  user: AuthUserSummary | null;
  role: AuthUserSummary["role"] | null;
  activeBusiness: ActiveBusiness | null;
  businessId: string | null;
  isHydrating: boolean;
  isAuthenticated: boolean;
  /** LINE User ID bound to the business, `null` while not linked (or for admins). */
  lineUserId: string | null;
  isLineLinked: boolean;
  setLineUserId: (lineUserId: string | null) => void;
  login: (credentials: LoginRequest) => Promise<AuthUserSummary>;
  logout: () => void;
  setActiveBusiness: (business: ActiveBusiness | null) => void;
  setBusinessDisplayName: (name: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionRaw = useSyncExternalStore(
    subscribeAuthStore,
    getSessionSnapshot,
    () => null,
  );
  const activeBusinessRaw = useSyncExternalStore(
    subscribeAuthStore,
    getActiveBusinessSnapshot,
    () => null,
  );
  const hydrated = useSyncExternalStore(
    subscribeAuthStore,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  const session = useMemo(() => parseStoredSession(sessionRaw), [sessionRaw]);
  const storedBusiness = useMemo(
    () => parseActiveBusiness(activeBusinessRaw),
    [activeBusinessRaw],
  );

  const activeBusiness = useMemo<ActiveBusiness | null>(() => {
    if (session?.user.role === "business") {
      return session.user.business_id
        ? { id: session.user.business_id, name: session.user.username }
        : null;
    }
    return storedBusiness;
  }, [session, storedBusiness]);

  // Refresh shortly before expiry and rotate tokens. If the network is down,
  // retry until the tab closes or the session is cleared.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let timer: number | undefined;

    const run = async () => {
      if (cancelled) return;
      const next = await refreshSession();
      if (cancelled) return;
      if (!next && loadSession()) {
        timer = window.setTimeout(run, 30_000);
      }
    };

    const delay = Math.max(session.expiresAt - Date.now(), 1_000);
    timer = window.setTimeout(run, delay);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [session]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const data = await loginRequest(credentials);
    const next = toStoredSession(data, data.user);
    saveSession(next);
    const nextBusiness =
      data.user.role === "business" && data.user.business_id
        ? { id: data.user.business_id, name: data.user.username }
        : null;
    saveActiveBusiness(nextBusiness);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  const setActiveBusiness = useCallback(
    (business: ActiveBusiness | null) => {
      if (loadSession()?.user.role !== "admin") return;
      saveActiveBusiness(business);
    },
    [],
  );

  const setBusinessDisplayName = useCallback((name: string) => {
    const current = loadActiveBusiness();
    if (!current || !name || current.name === name) return;
    saveActiveBusiness({ ...current, name });
  }, []);

  const setLineUserId = useCallback((lineUserId: string | null) => {
    updateStoredUser({ line_user_id: lineUserId });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = session?.user.role ?? null;
    const businessId =
      role === "business"
        ? (session?.user.business_id ?? null)
        : role === "admin"
          ? (activeBusiness?.id ?? null)
          : null;
    // Sessions created before LINE linking shipped have no `line_user_id` key.
    const lineUserId = session?.user.line_user_id ?? null;

    return {
      session,
      user: session?.user ?? null,
      role,
      activeBusiness,
      businessId,
      isHydrating: !hydrated,
      isAuthenticated: Boolean(session),
      lineUserId,
      isLineLinked: Boolean(lineUserId),
      setLineUserId,
      login,
      logout,
      setActiveBusiness,
      setBusinessDisplayName,
    };
  }, [
    session,
    activeBusiness,
    hydrated,
    login,
    logout,
    setActiveBusiness,
    setBusinessDisplayName,
    setLineUserId,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
