import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Loading">
      <Spinner className="h-8 w-8 text-slate-400" />
    </div>
  );
}
