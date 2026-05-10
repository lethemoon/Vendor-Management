'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseChartDataOptions<T> {
  apiFn: () => Promise<any>;
  transform?: (raw: any) => T;
  staleTime?: number;
  enabled?: boolean;
}

interface UseChartDataReturn<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const MAX_RETRIES = 2;

export function useChartData<T>({
  apiFn,
  transform,
  staleTime = 60000,
  enabled = true,
}: UseChartDataOptions<T>): UseChartDataReturn<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const dataRef = useRef<T | undefined>(undefined);
  const lastFetchRef = useRef<number>(0);
  const retryCountRef = useRef(0);

  const loadData = useCallback(async (isRetry = false) => {
    if (!enabled) return;

    if (!isRetry) {
      const now = Date.now();
      if (dataRef.current && now - lastFetchRef.current < staleTime) {
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const raw = await apiFn();
      const result = transform ? transform(raw) : raw as T;

      dataRef.current = result;
      setData(result);
      lastFetchRef.current = Date.now();
      retryCountRef.current = 0;
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(err.message || '数据获取失败');

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        setTimeout(() => loadData(true), 1000 * retryCountRef.current);
        return;
      }

      setError(errorObj);
    } finally {
      setLoading(false);
    }
  }, [apiFn, transform, staleTime, enabled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(() => {
    lastFetchRef.current = 0;
    loadData();
  }, [loadData]);

  return { data, loading, error, refetch };
}
