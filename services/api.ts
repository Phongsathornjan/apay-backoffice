import type {
  ApiEnvelope,
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  TokenBundle,
} from "@/types/api";
import {
  clearSession,
  loadSession,
  notifyUnauthorized,
  updateTokens,
  type StoredSession,
} from "@/lib/auth/storage";

/**
 * Origin of the APay backend, e.g. `http://localhost:3000`. The `NEXT_PUBLIC_`
 * prefix is required for the value to survive into the browser bundle.
 *
 * Pasting the API root or a trailing slash is tolerated here, so
 * `http://host:3000/api/v1/` and `http://host:3000` both resolve to
 * `http://host:3000/api/v1/...` instead of doubling the prefix.
 */
function resolveBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const origin = configured && configured.length > 0 ? configured : "http://localhost:3000";

  return origin.replace(/\/+$/, "").replace(/\/api\/v1$/i, "");
}

export const API_BASE_URL = resolveBaseUrl();

export const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly correlationId: string | null;
  readonly payload: ApiErrorEnvelope | null;

  constructor(
    message: string,
    options: {
      status?: number;
      correlationId?: string | null;
      payload?: ApiErrorEnvelope | null;
    } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.correlationId = options.correlationId ?? null;
    this.payload = options.payload ?? null;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  /** Query object; undefined, null and empty-string values are omitted. */
  query?: object;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  accessToken?: string;
  skipAuthRefresh?: boolean;
  correlationId?: string;
}

function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function buildUrl(path: string, query?: object): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query) as Array<[string, QueryValue]>) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractError(
  response: Response,
  payload: unknown,
  fallbackCorrelationId: string,
): ApiError {
  const envelope =
    payload && typeof payload === "object" && "message" in payload
      ? (payload as ApiErrorEnvelope)
      : null;
  const headerCorrelationId = response.headers.get("x-correlation-id");
  const correlationId =
    headerCorrelationId ?? envelope?.correlation_id ?? fallbackCorrelationId;
  const message =
    envelope?.message ||
    (response.status === 401
      ? "Unauthorized"
      : response.status === 403
        ? "Access denied"
        : response.status === 404
          ? "Resource not found"
          : `Request failed with status ${response.status}`);

  return new ApiError(message, {
    status: response.status,
    correlationId,
    payload: envelope,
  });
}

let refreshPromise: Promise<StoredSession | null> | null = null;

/**
 * Rotates both access and refresh tokens. Concurrent 401 responses share one
 * refresh request so an already-rotated refresh token is never reused.
 */
export async function refreshSession(): Promise<StoredSession | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const current = loadSession();
    if (!current) return null;

    try {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": createCorrelationId(),
        },
        body: JSON.stringify({ refresh_token: current.refreshToken }),
      });
      const payload = (await parseJson(response)) as ApiEnvelope<TokenBundle> | null;

      if (!response.ok || !payload || payload.ok !== true) {
        clearSession();
        notifyUnauthorized();
        return null;
      }

      const next = updateTokens(payload.data);
      if (!next) {
        clearSession();
        notifyUnauthorized();
        return null;
      }
      return next;
    } catch {
      // Preserve the session on transient network failures; the UI can retry.
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export interface ApiResult<T> {
  data: T;
  correlationId: string | null;
  status: number;
}

async function executeWithMeta<T>(
  path: string,
  options: ApiRequestOptions,
): Promise<ApiResult<T>> {
  const {
    method = "GET",
    query,
    body,
    headers: extraHeaders,
    auth = true,
    accessToken,
    skipAuthRefresh = false,
    correlationId,
  } = options;

  const session = auth ? loadSession() : null;
  const bearer = accessToken ?? session?.accessToken;
  const requestCorrelationId = correlationId ?? createCorrelationId();

  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-correlation-id": requestCorrelationId,
    ...extraHeaders,
  };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("ไม่สามารถเชื่อมต่อ APay API ได้ กรุณาตรวจสอบว่า Backend ทำงานอยู่", {
      correlationId: requestCorrelationId,
    });
  }

  if (response.status === 401 && auth && !skipAuthRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return executeWithMeta<T>(path, {
        ...options,
        accessToken: refreshed.accessToken,
        skipAuthRefresh: true,
      });
    }
    clearSession();
    notifyUnauthorized();
  }

  const payload = await parseJson(response);
  const responseCorrelationId =
    response.headers.get("x-correlation-id") ?? requestCorrelationId;

  if (!response.ok) {
    throw extractError(response, payload, requestCorrelationId);
  }

  if (payload && typeof payload === "object" && "ok" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.ok === false) {
      throw new ApiError(envelope.message, {
        status: envelope.status,
        correlationId: envelope.correlation_id,
        payload: envelope,
      });
    }
    const success = envelope as ApiSuccessEnvelope<T>;
    return {
      data: success.data,
      correlationId: success.correlation_id ?? responseCorrelationId,
      status: response.status,
    };
  }

  return {
    data: payload as T,
    correlationId: responseCorrelationId,
    status: response.status,
  };
}

export function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return executeWithMeta<T>(path, options).then((result) => result.data);
}

export function apiRequestWithMeta<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  return executeWithMeta<T>(path, options);
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "เกิดข้อผิดพลาดที่ไม่คาดคิด";
}

export function getApiCorrelationId(error: unknown): string | null {
  return error instanceof ApiError ? error.correlationId : null;
}
