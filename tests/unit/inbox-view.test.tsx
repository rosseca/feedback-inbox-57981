// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import type { FeedbackDto, FeedbackListResponse } from '@/contracts/api';
import { InboxView } from '@/features/feedback/inbox-view';

function item(id: string, title: string): FeedbackDto {
  return {
    id,
    title,
    description: 'A description',
    priority: 'low',
    status: 'new',
    attachmentFilename: null,
    closedAt: null,
    closedByDisplayName: null,
    createdAt: '2026-01-05T09:00:00.000Z',
    updatedAt: '2026-01-05T09:00:00.000Z',
  };
}

const listResponse: FeedbackListResponse = {
  items: [item('fb_1', 'First item'), item('fb_2', 'Second item')],
  activeCount: 2,
};

describe('InboxView', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('quick close removes the item from the list and decrements the count', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/close')) {
        return { ok: true, json: async () => ({ feedback: item('fb_1', 'First item'), outcome: 'closed' }) };
      }
      return { ok: true, json: async () => listResponse };
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<InboxView filters={{}} workspaceName="Acme Ltd" />);

    await waitFor(() => expect(screen.getByText('First item')).toBeInTheDocument());
    expect(screen.getByTestId('active-count')).toHaveTextContent('2');

    await user.click(screen.getAllByRole('button', { name: 'Close' })[0]);

    await waitFor(() => expect(screen.queryByText('First item')).not.toBeInTheDocument());
    expect(screen.getByTestId('active-count')).toHaveTextContent('1');
  });
});
