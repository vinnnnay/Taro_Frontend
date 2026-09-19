'use client';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { Button } from './ui';

export function Header() {
  const { user, signOut } = useAuth();
  return (
    <header className="no-print border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">Interview Prep Kit</Link>
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline" style={{ color: 'var(--ink-faint)' }}>{user.email}</span>
            <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        )}
      </div>
    </header>
  );
}
