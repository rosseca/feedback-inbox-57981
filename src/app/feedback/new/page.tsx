import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/server/auth/session';
import { CreateFeedbackForm } from '@/features/feedback/create-form';

export default async function NewFeedbackPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login');
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">New feedback</h1>
        <p className="mt-1 text-sm text-slate-500">
          Report customer feedback for {session.workspaceName}.
        </p>
      </div>
      <CreateFeedbackForm />
      <Link href="/feedback" className="text-sm text-slate-500 hover:text-slate-900">
        Back to active feedback
      </Link>
    </div>
  );
}
