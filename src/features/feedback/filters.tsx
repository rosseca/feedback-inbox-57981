'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ACTIVE_STATUSES, PRIORITIES } from '@/contracts/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type RawFilters = {
  query?: string;
  status?: (typeof ACTIVE_STATUSES)[number];
  priority?: (typeof PRIORITIES)[number];
};

export function FeedbackFilters({ initial }: { initial: RawFilters }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initial.query ?? '');

  function currentFilters(): RawFilters {
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    return {
      query: searchParams.get('query') ?? undefined,
      status: (ACTIVE_STATUSES as readonly string[]).includes(status ?? '')
        ? (status as RawFilters['status'])
        : undefined,
      priority: (PRIORITIES as readonly string[]).includes(priority ?? '')
        ? (priority as RawFilters['priority'])
        : undefined,
    };
  }

  function applyFilters(filters: RawFilters) {
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
    router.replace(queryString ? `/feedback?${queryString}` : '/feedback');
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed !== (initial.query ?? '')) {
        applyFilters({ ...currentFilters(), query: trimmed || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasFilters = Boolean(initial.query || initial.status || initial.priority);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters({ ...currentFilters(), query: query.trim() || undefined });
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <Input
        id="filter-query"
        label="Search"
        type="search"
        placeholder="Search by title"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Select
        id="filter-status"
        label="Status"
        value={initial.status ?? ''}
        onChange={(event) => applyFilters({ ...currentFilters(), status: (event.target.value || undefined) as RawFilters['status'] })}
      >
        <option value="">All statuses</option>
        {ACTIVE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
      <Select
        id="filter-priority"
        label="Priority"
        value={initial.priority ?? ''}
        onChange={(event) => applyFilters({ ...currentFilters(), priority: (event.target.value || undefined) as RawFilters['priority'] })}
      >
        <option value="">All priorities</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </Select>
      {hasFilters ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setQuery('');
            router.replace('/feedback');
          }}
        >
          Clear
        </Button>
      ) : null}
    </form>
  );
}
