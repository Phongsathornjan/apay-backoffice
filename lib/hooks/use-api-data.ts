"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  key: string | null;
  nonce: number;
  data: T | null;
  error: unknown;
}

/**
 * Lightweight client-side query helper. `key` must change whenever query
 * parameters change; `loader` may be an inline function.
 *
 * Loading/refreshing states are derived from the last completed key+nonce, so
 * no synchronous state updates are required when a request starts.
 */
export function useApiData<T>(
  key: string | null,
  loader: () => Promise<T>,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<AsyncState<T>>({
    key: null,
    nonce: -1,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !key) return;
    let active = true;

    loaderRef
      .current()
      .then((data) => {
        if (!active) return;
        setState({ key, nonce, data, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ key, nonce, data: null, error });
      });

    return () => {
      active = false;
    };
  }, [key, nonce, enabled]);

  const keyMatches = state.key === key;
  const data = keyMatches ? state.data : null;
  const error = keyMatches && state.nonce === nonce ? state.error : null;
  const isRefreshing = Boolean(
    enabled && key && keyMatches && state.nonce !== nonce && state.data !== null,
  );
  const isLoading = Boolean(
    enabled && key && (!keyMatches || (state.nonce !== nonce && state.data === null)),
  );

  const refetch = useCallback(() => setNonce((value) => value + 1), []);

  return { data, error, isLoading, isRefreshing, refetch };
}

export function queryKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}
