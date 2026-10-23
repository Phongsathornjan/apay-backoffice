import type { AuthUserSummary, TokenBundle } from "@/types/api";

const SESSION_KEY = "apay.session.v1";
const ACTIVE_BUSINESS_KEY = "apay.active-business.v1";

export const SESSION_EVENT = "apay:session-change";
export const UNAUTHORIZED_EVENT = "apay:unauthorized";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresAt: number;
  user: AuthUserSummary;
}

export interface ActiveBusiness {
  id: string;
  name: string;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function toStoredSession(bundle: TokenBundle, user: AuthUserSummary): StoredSession {
  return {
    accessToken: bundle.access_token,
    refreshToken: bundle.refresh_token,
    tokenType: bundle.token_type,
    // Refresh slightly early to avoid a request racing token expiry.
    expiresAt: Date.now() + Math.max(bundle.expires_in - 30, 30) * 1000,
    user,
  };
}

export function parseStoredSession(raw: string | null): StoredSession | null {
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as StoredSession;
    if (
      !session?.accessToken ||
      !session?.refreshToken ||
      !session?.user?.user_id ||
      !session?.user?.role
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function parseActiveBusiness(raw: string | null): ActiveBusiness | null {
  if (!raw) return null;

  try {
    const business = JSON.parse(raw) as ActiveBusiness;
    if (!business?.id) return null;
    return business;
  } catch {
    return null;
  }
}

export function getSessionSnapshot(): string | null {
  return canUseStorage() ? window.localStorage.getItem(SESSION_KEY) : null;
}

export function getActiveBusinessSnapshot(): string | null {
  return canUseStorage() ? window.localStorage.getItem(ACTIVE_BUSINESS_KEY) : null;
}

/**
 * External-store subscription used by useSyncExternalStore so the session is
 * always sourced from localStorage without copying it into render state.
 */
export function subscribeAuthStore(listener: () => void) {
  if (!canUseStorage()) return () => undefined;

  const onStorage = () => listener();
  window.addEventListener(SESSION_EVENT, onStorage);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SESSION_EVENT, onStorage);
    window.removeEventListener("storage", onStorage);
  };
}

export function loadSession(): StoredSession | null {
  return parseStoredSession(getSessionSnapshot());
}

export function saveSession(session: StoredSession) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
}

export function updateTokens(tokens: Pick<TokenBundle, "access_token" | "refresh_token" | "expires_in">) {
  const current = loadSession();
  if (!current) return null;

  const next: StoredSession = {
    ...current,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenType: "Bearer",
    expiresAt: Date.now() + Math.max(tokens.expires_in - 30, 30) * 1000,
  };
  saveSession(next);
  return next;
}

/**
 * Patches the stored user (e.g. after a successful LINE linking) and persists it,
 * so `useAuth()` reflects the change without a re-login. `saveSession` already
 * dispatches the storage event other tabs/components listen to.
 */
export function updateStoredUser(patch: Partial<AuthUserSummary>): StoredSession | null {
  const current = loadSession();
  if (!current) return null;

  const next: StoredSession = {
    ...current,
    user: { ...current.user, ...patch },
  };
  saveSession(next);
  return next;
}

export function clearSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(ACTIVE_BUSINESS_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: null }));
}

export function notifyUnauthorized() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
}

export function loadActiveBusiness(): ActiveBusiness | null {
  return parseActiveBusiness(getActiveBusinessSnapshot());
}

export function saveActiveBusiness(business: ActiveBusiness | null) {
  if (!canUseStorage()) return;

  if (business) {
    window.localStorage.setItem(ACTIVE_BUSINESS_KEY, JSON.stringify(business));
  } else {
    window.localStorage.removeItem(ACTIVE_BUSINESS_KEY);
  }
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: business }));
}
