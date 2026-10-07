import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/server/auth/session';
import { LogoutButton } from '@/features/auth/logout-button';

export default async function FeedbackLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login');
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/feedback" className="text-base font-semibold text-slate-900">
              Feedback Inbox
            </Link>
            <span className="text-sm text-slate-500">{session.workspaceName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{session.displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
