'use client';

import { useToastStore } from './toast-store';

const variantClasses = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
} as const;

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toastItem) => (
        <div
          key={toastItem.id}
          role="status"
          className={`flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm shadow-sm ${variantClasses[toastItem.variant]}`}
        >
          <span>{toastItem.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(toastItem.id)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
