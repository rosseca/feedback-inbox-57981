'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import type { ListFeedbackQuery } from '@/contracts/api';
import { FeedbackList } from './feedback-list';
import { FeedbackFilters } from './filters';
import { useCachedFeedbackList } from './use-cached-feedback-list';

export function InboxView({
  filters,
  workspaceName,
}: {
  filters: ListFeedbackQuery;
  workspaceName: string;
}) {
  const list = useCachedFeedbackList({
    query: filters.query,
    status: filters.status,
    priority: filters.priority,
  });

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
        <FeedbackList items={list.items} />
      )}
    </div>
  );
}
