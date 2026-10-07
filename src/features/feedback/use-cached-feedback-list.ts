'use client';

import { useEffect, useState } from 'react';
import type { FeedbackListResponse } from '@/contracts/api';

const listCache = new Map<string, FeedbackListResponse>();

function cacheKey(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export function useCachedFeedbackList(filters: Record<string, string | undefined>) {
  const key = cacheKey(filters);
  const [state, setState] = useState<FeedbackListResponse | null>(listCache.get(key) ?? null);

  useEffect(() => {
    if (listCache.has(key)) {
      setState(listCache.get(key) ?? null);
      return;
    }
    let cancelled = false;
    fetch(`/api/feedback${key ? `?${key}` : ''}`)
      .then((res) => res.json() as Promise<FeedbackListResponse>)
      .then((data) => {
        listCache.set(key, data);
        if (!cancelled) {
          setState(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ items: [], activeCount: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}
