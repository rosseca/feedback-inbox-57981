// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

import { CreateFeedbackForm } from '@/features/feedback/create-form';

describe('CreateFeedbackForm', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows validation errors and does not submit when fields are invalid', async () => {
    const user = userEvent.setup();
    render(<CreateFeedbackForm />);

    await user.click(screen.getByRole('button', { name: 'Create feedback' }));

    expect(await screen.findByText('Title must be at least 3 characters')).toBeInTheDocument();
    expect(await screen.findByText('Description must be at least 10 characters')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits valid input to the create endpoint', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ feedback: { id: 'fb_new' } }),
    } as unknown as Response);

    render(<CreateFeedbackForm />);
    await user.type(screen.getByLabelText('Title'), 'A valid feedback title');
    await user.type(screen.getByLabelText('Description'), 'A description that is long enough.');
    await user.click(screen.getByRole('button', { name: 'Create feedback' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/feedback',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
