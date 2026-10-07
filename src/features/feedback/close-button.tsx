'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast-store';

export function CloseFeedbackButton({ feedbackId }: { feedbackId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleClose() {
    setPending(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/close`, { method: 'PATCH' });
      if (!res.ok) {
        toast('error', 'Feedback could not be closed. Please try again.');
        setConfirming(false);
        return;
      }
      const body = (await res.json()) as { outcome: 'closed' | 'already_closed' };
      toast('success', body.outcome === 'already_closed' ? 'Feedback was already closed' : 'Feedback closed');
      setConfirming(false);
      router.refresh();
    } catch {
      toast('error', 'Feedback could not be closed. Please try again.');
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Close feedback
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Close this feedback?"
        description="It will be removed from the active inbox, recorded in history, and the creator will be notified."
        confirmLabel="Close feedback"
        pending={pending}
        onConfirm={handleClose}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
