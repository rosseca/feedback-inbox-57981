'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import type { FeedbackListResponse, ListFeedbackQuery } from '@/contracts/api';
import { toast } from '@/components/ui/toast-store';
import { FeedbackList } from './feedback-list';
import { FeedbackFilters } from './filters';

export function InboxView({
  filters,
  workspaceName,
}: {
  filters: ListFeedbackQuery;
  workspaceName: string;
}) {
  const [list, setList] = useState<FeedbackListResponse | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.query) {
      params.set('query', filters.query);
    }
    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.priority) {
      params.set('priority', filters.priority);
    }
    const queryString = params.toString();
    try {
      const res = await fetch(`/api/feedback${queryString ? `?${queryString}` : ''}`);
      if (!res.ok) {
        throw new Error('Request failed');
      }
      setList((await res.json()) as FeedbackListResponse);
    } catch {
      setList({ items: [], activeCount: 0 });
    }
  }, [filters.query, filters.status, filters.priority]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleQuickClose(feedbackId: string) {
    const removed = list?.items.find((item) => item.id === feedbackId) ?? null;
    setList((current) =>
      current
        ? {
            items: current.items.filter((item) => item.id !== feedbackId),
            activeCount: current.activeCount - 1,
          }
        : current,
    );
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/close`, { method: 'PATCH' });
      if (!res.ok) {
        throw new Error('Request failed');
      }
      toast('success', 'Feedback closed');
    } catch {
      toast('error', 'Feedback could not be closed. Please try again.');
      if (removed) {
        setList((current) => (current ? { ...current, items: [removed, ...current.items] } : current));
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Active feedback</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span data-testid="active-count">{list ? list.activeCount : ''}</span> active item
            {list?.activeCount === 1 ? '' : 's'} in {workspaceName}
          </p>
        </div>
        <Link href="/feedback/new">
          <Button>New feedback</Button>
        </Link>
      </div>

      <FeedbackFilters initial={filters} />

      {list === null ? (
        <div className="flex items-center justify-center py-24" role="status" aria-label="Loading">
          <Spinner className="h-8 w-8 text-slate-400" />
        </div>
      ) : list.items.length === 0 ? (
        <EmptyState
          title="No active feedback"
          description="Feedback created for your workspace will show up here."
        />
      ) : (
        <FeedbackList items={list.items} onQuickClose={handleQuickClose} />
      )}
    </div>
  );
}
