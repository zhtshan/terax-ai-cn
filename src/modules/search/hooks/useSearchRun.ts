import { useCallback, useEffect, useRef, useState } from "react";
import type { GrepResponse, SearchInput } from "../lib/types";
import { searchContent } from "../lib/api";

export type UseSearchRunOptions = {
  input: SearchInput | null;
  debounceMs?: number;
  enabled?: boolean;
};

export type UseSearchRunState = {
  results: GrepResponse | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

const DEFAULT_DEBOUNCE_MS = 140;

export function useSearchRun(options: UseSearchRunOptions): UseSearchRunState {
  const { input, debounceMs = DEFAULT_DEBOUNCE_MS, enabled = true } = options;
  const [results, setResults] = useState<GrepResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const generationRef = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryToken is a manual re-run trigger (does not need to be read inside the effect)
  useEffect(() => {
    if (!enabled || !input) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }
    const myGen = ++generationRef.current;
    setLoading(true);
    setError(null);
    const handle = window.setTimeout(() => {
      searchContent(input)
        .then((res) => {
          if (generationRef.current !== myGen) return;
          setResults(res);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (generationRef.current !== myGen) return;
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        });
    }, debounceMs);
    return () => {
      window.clearTimeout(handle);
    };
  }, [input, debounceMs, enabled, retryToken]);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  return { results, loading, error, retry };
}
