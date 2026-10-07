import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">404 — Page not found</h1>
      <p className="text-sm text-slate-500">
        The page you are looking for does not exist or belongs to another workspace.
      </p>
      <Link href="/feedback" className="text-sm font-medium text-blue-700 underline">
        Back to feedback
      </Link>
    </main>
  );
}
