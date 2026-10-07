import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listFeedbackQuerySchema } from '@/contracts/api';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getSessionFromCookies } from '@/server/auth/session';
import { listFeedback } from '@/server/services/feedback-service';
import { FeedbackFilters } from '@/features/feedback/filters';
import { FeedbackList } from '@/features/feedback/feedback-list';

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const parsed = listFeedbackQuerySchema.safeParse({
    query: typeof params.query === 'string' ? params.query : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
    priority: typeof params.priority === 'string' ? params.priority : undefined,
  });
  const filters = parsed.success ? parsed.data : {};
  const { items, activeCount } = await listFeedback(session.workspaceId, filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Active feedback</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span data-testid="active-count">{activeCount}</span> active item
            {activeCount === 1 ? '' : 's'} in {session.workspaceName}
          </p>
        </div>
        <Link href="/feedback/new">
          <Button>New feedback</Button>
        </Link>
      </div>

      <FeedbackFilters initial={filters} />

      {items.length === 0 ? (
        <EmptyState
          title="No active feedback"
          description="Feedback created for your workspace will show up here."
        />
      ) : (
        <FeedbackList items={items} />
      )}
    </div>
  );
}
