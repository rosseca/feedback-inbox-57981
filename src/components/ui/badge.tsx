import type { FeedbackPriority, FeedbackStatus } from '@/contracts/feedback';

type Tone = 'neutral' | 'green' | 'yellow' | 'red' | 'blue';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

const statusTones: Record<FeedbackStatus, Tone> = {
  new: 'blue',
  triaged: 'yellow',
  planned: 'green',
  closed: 'neutral',
};

const priorityTones: Record<FeedbackPriority, Tone> = {
  low: 'neutral',
  medium: 'yellow',
  high: 'red',
};

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  return <Badge tone={statusTones[status]}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: FeedbackPriority }) {
  return <Badge tone={priorityTones[priority]}>{priority}</Badge>;
}
