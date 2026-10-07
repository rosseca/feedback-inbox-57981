import { redirect } from 'next/navigation';
import { LoginForm } from '@/features/auth/login-form';
import { getSessionFromCookies } from '@/server/auth/session';
import styles from './login.module.css';

export default async function LoginPage() {
  const session = await getSessionFromCookies();
  if (session) {
    redirect('/feedback');
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className={styles.card}>
        <h1 className="text-xl font-semibold text-slate-900">Feedback Inbox</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your workspace</p>
        <LoginForm />
      </div>
    </main>
  );
}
