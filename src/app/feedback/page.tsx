import { redirect } from 'next/navigation';
import { listFeedbackQuerySchema } from '@/contracts/api';
import { getSessionFromCookies } from '@/server/auth/session';
import { InboxView } from '@/features/feedback/inbox-view';

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

  return <InboxView filters={filters} workspaceName={session.workspaceName} />;
}
