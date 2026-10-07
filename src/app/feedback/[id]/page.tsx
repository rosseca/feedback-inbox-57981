import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PriorityBadge, StatusBadge } from '@/components/ui/badge';
import { getSessionFromCookies } from '@/server/auth/session';
import { HttpError } from '@/server/http';
import { getFeedbackDetail } from '@/server/services/feedback-service';
import { CloseFeedbackButton } from '@/features/feedback/close-button';
import styles from './detail.module.css';

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  let detail: Awaited<ReturnType<typeof getFeedbackDetail>>;
  try {
    detail = await getFeedbackDetail(session.workspaceId, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const { feedback, history } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{feedback.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={feedback.status} />
            <PriorityBadge priority={feedback.priority} />
          </div>
        </div>
        {feedback.status !== 'closed' ? <CloseFeedbackButton feedbackId={feedback.id} /> : null}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm whitespace-pre-line text-slate-700">{feedback.description}</p>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-0.5">{formatDateTime(feedback.createdAt)}</dd>
          </div>
          {feedback.closedAt ? (
            <div>
              <dt className="text-slate-500">Closed</dt>
              <dd className="mt-0.5">
                {formatDateTime(feedback.closedAt)}
                {feedback.closedByDisplayName ? ` by ${feedback.closedByDisplayName}` : ''}
              </dd>
            </div>
          ) : null}
        </dl>
        {feedback.attachmentFilename ? (
          <a
            href={`/api/feedback/${feedback.id}/attachment`}
            className="mt-4 inline-block text-sm font-medium text-blue-700 underline"
          >
            Download {feedback.attachmentFilename}
          </a>
        ) : null}
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">History</h2>
        <ol data-testid="history-list" className={styles.timeline}>
          {history.map((event) => (
            <li key={event.id} className={styles.event}>
              <span className={styles.eventType}>
                {event.type === 'feedback_created' ? 'Created' : 'Closed'}
              </span>
              <span className={styles.eventMeta}>
                by {event.actorDisplayName} · {formatDateTime(event.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <Link href="/feedback" className="text-sm text-slate-500 hover:text-slate-900">
        Back to active feedback
      </Link>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
