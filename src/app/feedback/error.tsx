'use client';

import { Button } from '@/components/ui/button';

export default function InboxError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-10 text-center">
      <p className="font-medium text-red-700">Something went wrong while loading feedback.</p>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
